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
                            accountId,
                            file.name
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

    // Fix the correctAccountAssignment method (around line 135)
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

    // Complete the processTransactions method to include error logging
    async processTransactions(transactions, filename) {
        const validTransactions = [];
        const errors = [];
        
        for (const transaction of transactions) {
            try {
                // Validate required fields
                if (!transaction.date || !transaction.amount || !transaction.description) {
                    errors.push({
                        transaction,
                        error: 'Missing required fields',
                        filename
                    });
                    continue;
                }

                // Normalize date format
                transaction.date = this.normalizeDate(transaction.date);
                
                // Ensure amount is numeric
                transaction.amount = parseFloat(transaction.amount);
                if (isNaN(transaction.amount)) {
                    errors.push({
                        transaction,
                        error: 'Invalid amount',
                        filename
                    });
                    continue;
                }
                
                // Apply account correction
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
        
        // Log errors to Firestore
        if (errors.length > 0 && this.dataService) {
            for (const error of errors) {
                await this.dataService.saveImportError(error);
            }
            console.warn(`Import had ${errors.length} errors from ${filename}`);
        }
        
        console.log(`✅ Processed ${validTransactions.length} valid transactions from ${filename}`);
        return validTransactions;
    }

    // Add date normalization helper
    normalizeDate(dateStr) {
        if (!dateStr) return null;

        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Convert MM/DD/YYYY to YYYY-MM-DD
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Try to parse other formats
        const parsed = new Date(dateStr);
        if (!isNaN(parsed)) {
            return parsed.toISOString().split('T')[0];
        }

        throw new Error(`Unable to parse date: ${dateStr}`);
    }
}
