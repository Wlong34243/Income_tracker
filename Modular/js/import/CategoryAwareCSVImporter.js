export class CategoryAwareCSVImporter {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
    }

    extractAccountFromFilename(filename) {
        // Extract account from filename like "Chase8529_Activity_20250806.CSV"
        const match = filename.match(/Chase(\d{4})/i);
        if (match) {
            return match[1]; // Returns "8529"
        }
        // Also try format "Chase0111_Activity" or "...0111 transaction"
        const altMatch = filename.match(/(\d{4})/);
        return altMatch ? altMatch[1] : null;
    }

    async parseCSV(file, accountId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target.result;
                
                // First, try to detect account from filename
                if (!accountId) {
                    accountId = this.extractAccountFromFilename(file.name);
                }

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    trimHeaders: true,
                    dynamicTyping: false,
                    complete: async (results) => {
                        if (results.errors.length > 0) {
                            console.warn('CSV parsing warnings:', results.errors);
                        }

                        const headers = results.meta.fields;
                        const format = this.detectFormat(headers);
                        
                        // CRITICAL FIX: Validate and correct account assignment
                        let transactions = this.processTransactions(
                            results.data,
                            format,
                            accountId
                        );

                        // Auto-detect correct account based on transaction patterns
                        const correctedTransactions = this.correctAccountAssignment(transactions);
                        
                        const duplicates = await this.findDuplicates(correctedTransactions);
                        if (duplicates.length > 0) {
                            console.log(`Found ${duplicates.length} duplicate transactions, skipping...`);
                            transactions = correctedTransactions.filter(t => 
                                !duplicates.some(d => 
                                    d.description === t.description && 
                                    d.date === t.date && 
                                    d.amount === t.amount
                                )
                            );
                        } else {
                            transactions = correctedTransactions;
                        }

                        resolve(transactions);
                    },
                    error: (error) => {
                        reject(new Error(`CSV parsing failed: ${error.message}`));
                    }
                });
            };
            reader.readAsText(file);
        });
    }

    // Add this new method to correct account assignments
    correctAccountAssignment(transactions) {
        return transactions.map(t => {
            const descLower = t.description.toLowerCase();
            
            // Rent payments MUST go to 0111
            if (descLower.includes('zelle') && t.amount > 500) {
                t.accountId = '0111';
            }
            
            // Tech business income from PackerThomas MUST go to 7991
            if (descLower.includes('packerthomas') || descLower.includes('packer thomas')) {
                t.accountId = '7991';
            }
            
            // Michael Katzen payment (Lisa's income) MUST go to 0111
            if (descLower.includes('michael katzen') && Math.abs(t.amount - 1500) < 10) {
                t.accountId = '0111';
            }
            
            return t;
        });
    }

    async findDuplicates(transactions) {
        const existing = await this.dataService.loadTransactions(500);
        const duplicates = [];

        for (const newTx of transactions) {
            const isDuplicate = existing.some(existingTx =>
                existingTx.date === newTx.date &&
                Math.abs(existingTx.amount - newTx.amount) < 0.01 &&
                existingTx.description === newTx.description &&
                existingTx.accountId === newTx.accountId
            );

            if (isDuplicate) {
                duplicates.push(newTx);
            }
        }

        return duplicates;
    }

    detectFormat(headers) {
        // Check for Chase checking format
        if (headers.includes('Posting Date') && headers.includes('Details')) {
            return 'CHASE_CHECKING';
        }
        // Check for Chase credit card format
        if (headers.includes('Transaction Date') && headers.includes('Category')) {
            return 'CHASE_CREDIT';
        }
        // Default
        return 'UNKNOWN';
    }

    processTransactions(data, format, accountId) {
        const transactions = [];

        for (const row of data) {
            // Skip empty rows
            if (!row || Object.keys(row).length === 0) continue;

            let transaction = null;

            if (format === 'CHASE_CHECKING') {
                transaction = {
                    date: this.parseValidDate(row['Posting Date']),
                    description: row['Description'] || '',
                    amount: this.parseAmount(row['Amount']),
                    type: row['Type'] || '',
                    balance: this.parseAmount(row['Balance']),
                    accountId: accountId
                };
            } else if (format === 'CHASE_CREDIT') {
                // Handle both 7 and 8 column versions
                const amount = this.parseAmount(row['Amount']);
                transaction = {
                    date: this.parseValidDate(row['Transaction Date'] || row['Post Date']),
                    description: row['Description'] || '',
                    amount: -Math.abs(amount), // Credit charges are negative
                    category: row['Category'] || '',
                    type: row['Type'] || '',
                    accountId: accountId
                };
            }

            // Only add valid transactions
            if (transaction && transaction.date && transaction.amount !== 0) {
                transactions.push(transaction);
            }
        }

        return transactions;
    }

    parseValidDate(dateStr) {
        if (!dateStr) return null;
        
        // Clean the date string
        dateStr = dateStr.trim();
        
        // Handle MM/DD/YYYY format (most common in Chase CSVs)
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const month = parts[0].padStart(2, '0');
                const day = parts[1].padStart(2, '0');
                let year = parts[2];
                
                // Handle 2-digit years
                if (year.length === 2) {
                    year = '20' + year;
                }
                
                // Return ISO format: YYYY-MM-DD
                const isoDate = `${year}-${month}-${day}`;
                
                // Validate the date
                const testDate = new Date(isoDate);
                if (!isNaN(testDate.getTime())) {
                    return isoDate;
                }
            }
        }
        
        // Handle YYYY-MM-DD format (already correct)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const testDate = new Date(dateStr);
            if (!isNaN(testDate.getTime())) {
                return dateStr;
            }
        }
        
        console.error('Could not parse date:', dateStr);
        return null;
    }

    parseAmount(amountStr) {
        if (!amountStr) return 0;
        // Remove $ and commas, convert to float
        return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
    }
}
