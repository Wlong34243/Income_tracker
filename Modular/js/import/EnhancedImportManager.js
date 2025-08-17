// js/import/EnhancedImportManager.js
import { DuplicateDetector } from './DuplicateDetector.js';
import { BulkImporter } from './BulkImporter.js';
import { ChaseCSVParser } from './ChaseCSVParser.js';
import { SmartCategorizer } from '../categorization/SmartCategorizer.js';
import { ImportSummaryModal } from '../ui/ImportSummaryModal.js';

export class EnhancedImportManager {
    constructor(dataService) {
        this.dataService = dataService;
        this.duplicateDetector = new DuplicateDetector(dataService);
        this.bulkImporter = new BulkImporter(dataService);
        this.csvParser = new ChaseCSVParser();
        this.categorizer = new SmartCategorizer();
        this.summaryModal = new ImportSummaryModal();
    }

    async confirmImportEnhanced() {
        if (importPreviewData.length === 0) {
            this.showNotification('No transactions to import', 'error');
            return;
        }

        // Separate transactions and balance updates
        const transactions = importPreviewData.filter(trans =>
            trans.accountId && trans.type !== 'balance_update'
        );

        const balanceUpdates = importPreviewData.filter(trans =>
            trans.type === 'balance_update' && trans.accountId
        );

        if (transactions.length === 0 && balanceUpdates.length === 0) {
            this.showNotification('Please select accounts for all transactions', 'error');
            return;
        }

        try {
            // Check for duplicates
            this.updateImportProgress(10, 'Checking for duplicates...');
            const { duplicates, unique } = await this.duplicateDetector.findDuplicateTransactions(transactions);

            if (duplicates.length > 0) {
                this.logImportMessage(`Found ${duplicates.length} duplicate transactions (will be skipped)`, 'warning');
            }

            // Import unique transactions
            this.updateImportProgress(20, 'Importing transactions...');
            const results = await this.bulkImporter.bulkImportTransactions(unique);

            // Process balance updates
            this.updateImportProgress(90, 'Updating account balances...');
            await this.processBalanceUpdates(balanceUpdates);

            this.updateImportProgress(100, 'Import complete!');

            // Show summary
            this.summaryModal.showImportSummary(results, duplicates);

            // Clean up
            setTimeout(() => {
                this.cancelImport();
            }, 1000);

        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Error during import: ' + error.message, 'error');
        }
    }

    async processBalanceUpdates(balanceUpdates) {
        for (const update of balanceUpdates) {
            await updateDoc(doc(db, 'accounts', update.accountId), {
                balance: update.amount,
                lastUpdated: serverTimestamp(),
                lastBalanceUpdate: update.date
            });

            // Log balance update
            await addDoc(collection(db, 'transactions'), {
                description: `${update.description} - ${update.sourceFile}`,
                amount: 0,
                type: 'note',
                date: update.date,
                accountId: update.accountId,
                category: 'Balance Update',
                entity: update.entity,
                userId: currentUser.uid,
                notes: `Balance updated to ${this.formatCurrency(update.amount)}`,
                createdAt: serverTimestamp()
            });
        }
    }

    updateImportProgress(percent, message) {
        // Update UI progress indicators
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = message;
    }

    logImportMessage(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logElement = document.getElementById('progressLog');

        if (logElement) {
            logElement.innerHTML += `<div class="${type}">[${timestamp}] ${message}</div>`;
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    showNotification(message, type) {
        // Show notification to user
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}
