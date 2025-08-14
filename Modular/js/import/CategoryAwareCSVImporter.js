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

    parseCSV(file, accountId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;

                // Parse with Papa Parse - be flexible with columns
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    trimHeaders: true,
                    dynamicTyping: false, // Keep as strings for now
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            console.warn('CSV parsing warnings:', results.errors);
                            // Don't reject on warnings, continue
                        }

                        // Auto-detect format based on headers
                        const headers = results.meta.fields;
                        const format = this.detectFormat(headers);

                        // Process based on format
                        const transactions = this.processTransactions(
                            results.data,
                            format,
                            accountId
                        );

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
                    date: this.parseDate(row['Posting Date']),
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
                    date: this.parseDate(row['Transaction Date'] || row['Post Date']),
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

    parseDate(dateStr) {
        if (!dateStr) return null;

        // Handle MM/DD/YYYY format
        if (dateStr.includes('/')) {
            const [month, day, year] = dateStr.split('/');
            const fullYear = year.length === 2 ? '20' + year : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Already in correct format
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }

        return null;
    }

    parseAmount(amountStr) {
        if (!amountStr) return 0;
        // Remove $ and commas, convert to float
        return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
    }
}
