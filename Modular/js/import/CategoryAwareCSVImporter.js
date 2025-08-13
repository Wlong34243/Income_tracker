import { sanitizeHTML } from '../utils/Sanitizer.js';

export class CategoryAwareCSVImporter {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.uiManager = null;
        this.reset();
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    reset() {
        this.categorizedTransactions = [];
        this.currentStep = 'upload';
        this.duplicates = [];
        this.processingStats = { total: 0, categorized: 0, ruleBased: 0, aiBased: 0, manual: 0 };
    }

    goToStep(step) {
        this.currentStep = step;
        if (this.uiManager) {
            this.uiManager.renderImportStep(step);
        } else {
            console.error("UIManager not set on CSVImporter.");
        }
    }


    parseValidDate(dateStr) {
        if (!dateStr) return null;
        // Strict MM/DD/YYYY or M/D/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [month, day, year] = parts.map(p => parseInt(p, 10));
            if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                 const fullYear = year < 100 ? 2000 + year : year;
                 const date = new Date(Date.UTC(fullYear, month - 1, day));
                 if (date.getUTCFullYear() === fullYear && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
                    return date.toISOString().split('T')[0];
                 }
            }
        }
        return null; // Return null for invalid dates
    }

    normalizeTransactionData(data, accountId) {
        if (!data.length) return [];
        const headers = Object.keys(data[0]);
        const format = this.detectCSVFormat(headers);

        if (format === 'UNKNOWN') {
            throw new Error("Unknown CSV format. Automatic mapping is not yet implemented.");
        }

        const FIELD_MAPPINGS = {
            CHASE_CHECKING: { date: 'Posting Date', description: 'Description', amount: 'Amount' },
            CHASE_CREDIT: { date: 'Transaction Date', description: 'Description', amount: 'Amount' },
        };
        const mapping = FIELD_MAPPINGS[format];

        return data.map(row => {
            const date = this.parseValidDate(row[mapping.date]);
            if (!date) {
                console.warn("Skipping row due to invalid date:", row);
                return null;
            }

            let amount = parseFloat(row[mapping.amount]) || 0;
            if (format === 'CHASE_CREDIT') amount = -amount;

            return {
                date: date,
                description: sanitizeHTML(row[mapping.description]),
                amount: amount,
                accountId: accountId,
                originalData: row,
            };
        }).filter(t => t && t.amount !== 0);
    }

    detectCSVFormat(headers) {
        if (headers.includes('Details') && headers.includes('Posting Date')) return 'CHASE_CHECKING';
        if (headers.includes('Transaction Date') && headers.includes('Category')) return 'CHASE_CREDIT';
        return 'UNKNOWN';
    }

    async processCSV(file, accountId) {
        this.reset();
        const csvText = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error("Failed to read file."));
            reader.readAsText(file);
        });

        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true, trimHeaders: true });
        if (parsedData.errors.length) {
            throw new Error('CSV parsing error: ' + parsedData.errors[0].message);
        }

        const transactions = this.normalizeTransactionData(parsedData.data, accountId);
        this.duplicates = await this.findDuplicates(transactions);
        const newTransactions = transactions.filter(txn => !this.duplicates.some(dup => this.transactionsMatch(txn, dup)));

        this.categorizedTransactions = this.categorizeTransactions(newTransactions);
        this.updateProcessingStats();
        this.goToStep('review');
    }

    categorizeTransactions(transactions) {
        return transactions.map((transaction, index) => {
            // Per user request, try account-specific rules first
            let categoryResult = this.categoryManager.categorizeByAccount(transaction);

            // If no account-specific match, use the general categorization flow
            if (!categoryResult) {
                categoryResult = this.categoryManager.categorizeTransaction(transaction);
            }

            const categorized = { ...transaction, ...categoryResult, importId: `import_${Date.now()}_${index}` };
            this.updateStatsForMethod(categoryResult.method);
            return categorized;
        });
    }

    async importConfirmedTransactions() {
        if (!this.categorizedTransactions.length) {
            throw new Error("No transactions to import.");
        }
        await this.dataService.saveTransactionBatch(this.categorizedTransactions);
        return { success: this.categorizedTransactions.length, failed: 0 };
    }

    renderTransactionsForReview() {
        if (this.categorizedTransactions.length === 0) {
            return `<div class="text-center p-4">No new transactions to import.</div>`;
        }
        return this.categorizedTransactions.map((txn, index) => this.renderSingleTransaction(txn, index)).join('');
    }

    renderSingleTransaction(txn, index) {
        const confidence = txn.confidence || 0;
        const confidenceColor = confidence >= 0.8 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
        const category = sanitizeHTML(txn.category || 'N/A');
        const subcategory = sanitizeHTML(txn.subcategory || 'N/A');
        const description = sanitizeHTML(txn.description);

        return `
            <div class="border-b p-2">
                <p class="font-medium">${description}</p>
                <p class="text-sm text-gray-600">${txn.date} | $${txn.amount.toFixed(2)}</p>
                <p class="text-sm text-${confidenceColor}-600">Category: ${category} / ${subcategory} (${(confidence * 100).toFixed(0)}%)</p>
            </div>
        `;
    }

    getImportSummaryHTML() {
        return `
            <div class="space-y-4">
                <p><strong>New Transactions to Import:</strong> ${this.categorizedTransactions.length}</p>
                <p><strong>Skipped Duplicates:</strong> ${this.duplicates.length}</p>
                <p>This is a summary. A more detailed breakdown would be rendered here.</p>
            </div>
        `;
    }

    // --- Helper methods for internal logic ---
    transactionsMatch(t1, t2) {
        if (!t1 || !t2) return false;
        return new Date(t1.date).toDateString() === new Date(t2.date).toDateString() &&
               Math.abs(t1.amount - t2.amount) < 0.01 &&
               t1.description.toLowerCase().trim() === t2.description.toLowerCase().trim();
    }

    async findDuplicates(transactions) {
        try {
            const existing = await this.dataService.loadTransactions(5000); // Check against recent transactions
            return transactions.filter(t => existing.some(e => this.transactionsMatch(t, e)));
        } catch (error) {
            console.error("Could not check for duplicates:", error);
            this.uiManager?.showNotification("Warning: Could not check for duplicate transactions.", "warning");
            return [];
        }
    }

    updateProcessingStats() {
        this.processingStats.total = this.categorizedTransactions.length;
        // This is a simplified version. A real implementation would count methods.
        this.processingStats.categorized = this.categorizedTransactions.filter(t => t.category).length;
    }

    updateStatsForMethod(method) {
        if (method) this.processingStats.ruleBased++; // Simplified
    }
}
