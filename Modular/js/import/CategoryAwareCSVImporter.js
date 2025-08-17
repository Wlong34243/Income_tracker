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

                        let transactions = this.processRawTransactions(
                            results.data,
                            format,
                            accountId,
                            file.name
                        );

                        // Process transactions through categorization and correction
                        transactions = await this.processTransactions(transactions, file.name);

                        // Check for duplicates
                        const duplicates = await this.findDuplicates(transactions);
                        if (duplicates.length > 0) {
                            console.log(`Found ${duplicates.length} duplicate transactions, skipping...`);
                            transactions = transactions.filter(t => 
                                !duplicates.some(d => 
                                    d.description === t.description && 
                                    d.date === t.date && 
                                    d.amount === t.amount
                                )
                            );
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

    processRawTransactions(data, format, accountId, filename) {
        const transactions = [];
        
        for (const row of data) {
            if (!row || Object.keys(row).length === 0) continue;
            
            let transaction = null;
            
            if (format === 'CHASE_CHECKING') {
                transaction = {
                    date: this.normalizeDate(row['Posting Date']),
                    description: row['Details'] || row['Description'] || '',
                    amount: parseFloat(row['Amount']) || 0,
                    accountId: accountId,
                    type: parseFloat(row['Amount']) > 0 ? 'Income' : 'Expense',
                    balance: parseFloat(row['Balance']) || null
                };
            } else if (format === 'CHASE_CREDIT') {
                transaction = {
                    date: this.normalizeDate(row['Transaction Date'] || row['Post Date']),
                    description: row['Description'] || '',
                    amount: -Math.abs(parseFloat(row['Amount']) || 0), // Credit card amounts are negative
                    accountId: accountId,
                    type: 'Expense',
                    originalCategory: row['Category'] || null
                };
            } else {
                // Generic format - try common field names
                transaction = {
                    date: this.normalizeDate(row['Date'] || row['Transaction Date'] || row['Posting Date']),
                    description: row['Description'] || row['Details'] || row['Memo'] || '',
                    amount: parseFloat(row['Amount']) || 0,
                    accountId: accountId,
                    type: parseFloat(row['Amount']) > 0 ? 'Income' : 'Expense'
                };
            }
            
            if (transaction && transaction.date && transaction.description && !isNaN(transaction.amount)) {
                transactions.push(transaction);
            }
        }
        
        console.log(`Parsed ${transactions.length} transactions from ${filename}`);
        return transactions;
    }

    correctAccountAssignment(transaction) {
        // Add null safety check
        if (!transaction || !transaction.description) {
            console.warn('Transaction missing description:', transaction);
            return transaction;
        }

        const descLower = transaction.description.toLowerCase();

        // Force Tech Business transactions to correct account
        if (descLower.includes('packerthomas') ||
            descLower.includes('packer thomas') ||
            descLower.includes('audit') ||
            (transaction.amount > 10000 && descLower.includes('deposit'))) {
            transaction.accountId = '7991';
            transaction.entity = 'Tech Business';
            transaction.category = 'Tech Business Income';
            transaction.subcategory = 'Consulting';
            console.log('✅ Corrected Tech Business transaction:', transaction.description, transaction.amount);
        }

        return transaction;
    }

    async processTransactions(transactions, filename) {
        const validTransactions = [];
        const errors = [];
        
        for (const transaction of transactions) {
            try {
                // Validate required fields
                if (!transaction.date || transaction.amount === undefined || !transaction.description) {
                    errors.push({
                        transaction,
                        error: 'Missing required fields',
                        filename
                    });
                    continue;
                }

                // Ensure amount is numeric
                if (isNaN(transaction.amount)) {
                    errors.push({
                        transaction,
                        error: 'Invalid amount',
                        filename
                    });
                    continue;
                }
                
                // Apply account correction (fixes Tech Business assignments)
                transaction = this.correctAccountAssignment(transaction);
                
                // Apply categorization
                if (this.categoryManager) {
                    const categorization = this.categoryManager.categorizeTransaction(transaction);
                    Object.assign(transaction, categorization);
                }

                validTransactions.push(transaction);

            } catch (error) {
                errors.push({
                    transaction,
                    error: error.message,
                    filename
                });
            }
        }
        
        // Log errors if any
        if (errors.length > 0) {
            console.warn(`Import had ${errors.length} errors from ${filename}:`, errors);
        }
        
        console.log(`✅ Processed ${validTransactions.length} valid transactions from ${filename}`);
        return validTransactions;
    }

    normalizeDate(dateStr) {
        if (!dateStr) return null;

        // Trim whitespace
        dateStr = dateStr.trim();

        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Convert MM/DD/YYYY to YYYY-MM-DD
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Convert MM/DD/YY to YYYY-MM-DD
        if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
            const [month, day, shortYear] = dateStr.split('/');
            const year = '20' + shortYear;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Try to parse other formats
        const parsed = new Date(dateStr);
        if (!isNaN(parsed)) {
            return parsed.toISOString().split('T')[0];
        }

        console.error(`Unable to parse date: ${dateStr}`);
        return null;
    }
}