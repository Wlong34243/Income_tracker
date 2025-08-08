// ===================================
// EXTRACTED FROM YOUR ACTUAL CODE
// Modular breakdown of your enhanced finance tracker
// ===================================

// ===================================
// 1. ADVANCED DUPLICATE DETECTION MODULE
// js/import/DuplicateDetector.js
// ===================================
class DuplicateDetector {
    constructor(dataService) {
        this.dataService = dataService;
    }

    async findDuplicateTransactions(transactionsToCheck) {
        const duplicates = [];
        const unique = [];
        
        // Get existing transactions for comparison
        const existingTransactions = await this.dataService.loadTransactions();
        
        for (const trans of transactionsToCheck) {
            // Create a date range for comparison (±1 day)
            const dateMin = new Date(trans.date);
            const dateMax = new Date(trans.date);
            dateMin.setDate(dateMin.getDate() - 1);
            dateMax.setDate(dateMax.getDate() + 1);
            
            // Check existing transactions
            const isDuplicate = existingTransactions.some(existing => {
                const existingDate = new Date(existing.date.seconds ? existing.date.seconds * 1000 : existing.date);
                return (
                    existing.description.toLowerCase() === trans.description.toLowerCase() &&
                    Math.abs(existing.amount - trans.amount) < 0.01 &&
                    existingDate >= dateMin &&
                    existingDate <= dateMax
                );
            });
            
            if (isDuplicate) {
                duplicates.push(trans);
            } else {
                unique.push(trans);
            }
        }
        
        return { duplicates, unique };
    }
}

// ===================================
// 2. BULK IMPORT PROCESSOR MODULE
// js/import/BulkImporter.js
// ===================================
class BulkImporter {
    constructor(dataService) {
        this.dataService = dataService;
    }

    async bulkImportTransactions(transactions) {
        const total = transactions.length;
        let processed = 0;
        const results = { success: 0, failed: 0, skipped: 0 };
        
        // Process in batches to avoid overwhelming Firestore
        const batchSize = 50;
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (trans) => {
                try {
                    // Skip if no account selected
                    if (!trans.accountId) {
                        results.skipped++;
                        return;
                    }
                    
                    // Get account entity
                    const account = accounts.find(a => a.id === trans.accountId);
                    
                    await addDoc(collection(db, 'transactions'), {
                        description: trans.description,
                        amount: trans.amount,
                        type: trans.type,
                        date: trans.date,
                        accountId: trans.accountId,
                        category: trans.category,
                        entity: account?.entity || trans.entity,
                        userId: currentUser.uid,
                        status: 'imported',
                        createdAt: serverTimestamp(),
                        importedFrom: trans.sourceFile,
                        importDate: serverTimestamp()
                    });
                    
                    results.success++;
                } catch (error) {
                    console.error('Failed to import transaction:', error);
                    results.failed++;
                }
                
                processed++;
                this.updateImportProgress((processed / total) * 100, `Importing... ${processed}/${total}`);
            }));
        }
        
        return results;
    }

    updateImportProgress(percent, message) {
        // Emit progress event or call callback
        if (this.onProgress) {
            this.onProgress(percent, message);
        }
    }
}

// ===================================
// 3. ADVANCED CHASE CSV PARSER MODULE
// js/import/ChaseCSVParser.js
// ===================================
class ChaseCSVParser {
    
    parseChaseCSVAdvanced(row, accountInfo) {
        // Handle different Chase CSV formats
        const formats = [
            {
                // Format 1: Standard Chase checking/savings
                date: ['Posting Date', 'Transaction Date'],
                description: ['Description'],
                amount: ['Amount'],
                type: ['Type']
            },
            {
                // Format 2: Chase credit card
                date: ['Transaction Date', 'Post Date'],
                description: ['Description', 'Merchant'],
                amount: ['Amount'],
                type: ['Category']
            },
            {
                // Format 3: Older Chase format
                date: ['Date'],
                description: ['Description', 'Check or Slip #'],
                amount: ['Amount'],
                type: ['Details']
            }
        ];
        
        let transaction = null;
        
        for (const format of formats) {
            const dateValue = this.getFirstValue(row, format.date);
            const descValue = this.getFirstValue(row, format.description);
            const amountValue = this.getFirstValue(row, format.amount);
            const typeValue = this.getFirstValue(row, format.type);
            
            if (dateValue && descValue && amountValue !== undefined) {
                const date = this.parseDate(dateValue);
                if (date) {
                    const amount = parseFloat(String(amountValue).replace(/[$,]/g, ''));
                    
                    transaction = {
                        date: date,
                        description: this.cleanDescription(descValue),
                        amount: amount,
                        type: this.detectTransactionType(descValue, amount, typeValue),
                        accountId: accountInfo?.id || '',
                        accountName: accountInfo?.name || 'Unknown Account',
                        entity: accountInfo?.entity || 'Personal'
                    };
                    break;
                }
            }
        }
        
        return transaction;
    }

    getFirstValue(row, columns) {
        for (const col of columns) {
            if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
                return row[col];
            }
        }
        return null;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Try different date formats
        const formats = [
            // MM/DD/YYYY
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
            // MM-DD-YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
            // YYYY-MM-DD
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
            // MM/DD/YY
            /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
        ];
        
        for (const format of formats) {
            const match = String(dateStr).match(format);
            if (match) {
                let year, month, day;
                
                if (match[0].startsWith('20') || match[0].startsWith('19')) {
                    // YYYY-MM-DD format
                    [_, year, month, day] = match;
                } else if (match[3].length === 2) {
                    // MM/DD/YY format
                    [_, month, day, year] = match;
                    year = '20' + year;
                } else {
                    // MM/DD/YYYY format
                    [_, month, day, year] = match;
                }
                
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        // Try native Date parsing as fallback
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    cleanDescription(description) {
        if (!description) return '';
        
        // Remove common noise from descriptions
        return String(description)
            .replace(/\s+/g, ' ')
            .replace(/^\d+\s+/, '') // Remove leading transaction numbers
            .replace(/\s+\d{4,}$/, '') // Remove trailing reference numbers
            .replace(/^(DEBIT|CREDIT|CHECK|ACH|WIRE)\s+/i, '') // Remove transaction type prefixes
            .trim();
    }

    detectTransactionType(description, amount, typeField) {
        const desc = description.toLowerCase();
        const type = (typeField || '').toLowerCase();
        
        // Check for transfers
        if (desc.includes('transfer') || desc.includes('xfer')) {
            return 'transfer';
        }
        
        // Check type field
        if (type.includes('credit') || type.includes('deposit') || type.includes('payment received')) {
            return 'income';
        }
        
        // Check description patterns
        if (desc.includes('deposit') || desc.includes('credit') || desc.includes('payment from')) {
            return 'income';
        }
        
        // Default based on amount
        return amount > 0 ? 'income' : 'expense';
    }
}

// ===================================
// 4. SMART CATEGORIZATION MODULE
// js/categorization/SmartCategorizer.js
// ===================================
class SmartCategorizer {
    constructor() {
        this.learnedCategories = this.loadLearnedPatterns();
        this.merchantPatterns = this.initializeMerchantPatterns();
    }

    loadLearnedPatterns() {
        const stored = localStorage.getItem('learnedCategories');
        return stored ? JSON.parse(stored) : {};
    }

    initializeMerchantPatterns() {
        return {
            'Real Estate Income': [
                { pattern: /rent\s*(from|payment|received)/i, confidence: 0.9 },
                { pattern: /tenant/i, confidence: 0.8 },
                { pattern: /property\s*income/i, confidence: 0.9 },
                { pattern: /lease\s*payment/i, confidence: 0.9 }
            ],
            'Business Income': [
                { pattern: /consulting\s*(fee|payment)/i, confidence: 0.9 },
                { pattern: /audit\s*services/i, confidence: 0.9 },
                { pattern: /invoice\s*\d+/i, confidence: 0.8 },
                { pattern: /client\s*payment/i, confidence: 0.9 }
            ],
            'Investment Transfer': [
                { pattern: /transfer.*schwab/i, confidence: 0.95 },
                { pattern: /transfer.*investment/i, confidence: 0.9 },
                { pattern: /to\s*self.*directed/i, confidence: 0.9 }
            ],
            'Property Expenses': [
                { pattern: /property\s*tax/i, confidence: 0.95 },
                { pattern: /hoa/i, confidence: 0.9 },
                { pattern: /home\s*repair/i, confidence: 0.8 },
                { pattern: /lawn\s*service/i, confidence: 0.8 }
            ],
            'Insurance': [
                { pattern: /insurance/i, confidence: 0.9 },
                { pattern: /health\s*plan/i, confidence: 0.9 },
                { pattern: /car\s*insurance/i, confidence: 0.95 }
            ],
            'Healthcare': [
                { pattern: /hsa\s*contribution/i, confidence: 0.95 },
                { pattern: /medical/i, confidence: 0.8 },
                { pattern: /pharmacy/i, confidence: 0.9 },
                { pattern: /doctor/i, confidence: 0.8 }
            ],
            'Utilities': [
                { pattern: /vyve/i, confidence: 0.95 },
                { pattern: /frontier/i, confidence: 0.95 },
                { pattern: /netflix/i, confidence: 0.95 },
                { pattern: /electric\s*company/i, confidence: 0.9 },
                { pattern: /water\s*bill/i, confidence: 0.9 }
            ]
        };
    }

    enhanceCategoryDetection(transaction) {
        const description = transaction.description.toLowerCase();
        
        let bestMatch = { category: transaction.category || 'Other', confidence: 0 };
        
        for (const [category, patterns] of Object.entries(this.merchantPatterns)) {
            for (const { pattern, confidence } of patterns) {
                if (pattern.test(description) && confidence > bestMatch.confidence) {
                    bestMatch = { category, confidence };
                }
            }
        }
        
        return bestMatch.category;
    }

    categorizeWithLearning(description) {
        const key = description.toLowerCase().split(' ').slice(0, 3).join(' ');
        
        // Check learned patterns first
        if (this.learnedCategories[key]) {
            const categories = this.learnedCategories[key];
            let bestCategory = 'Other';
            let maxCount = 0;
            
            for (const [category, count] of Object.entries(categories)) {
                if (count > maxCount) {
                    maxCount = count;
                    bestCategory = category;
                }
            }
            
            if (maxCount > 1) { // Only use if seen multiple times
                return bestCategory;
            }
        }
        
        // Fall back to pattern-based categorization
        return this.enhanceCategoryDetection({ description });
    }

    improveAutoCategories(existingTransactions) {
        // Learn from existing categorized transactions
        const merchantCategories = {};
        
        existingTransactions.slice(0, 1000).forEach(trans => {
            if (trans.category && trans.category !== 'Other') {
                const key = trans.description.toLowerCase().split(' ').slice(0, 3).join(' ');
                if (!merchantCategories[key]) {
                    merchantCategories[key] = {};
                }
                merchantCategories[key][trans.category] = (merchantCategories[key][trans.category] || 0) + 1;
            }
        });
        
        // Store learned patterns for future use
        this.learnedCategories = { ...this.learnedCategories, ...merchantCategories };
        localStorage.setItem('learnedCategories', JSON.stringify(this.learnedCategories));
    }
}

// ===================================
// 5. IMPORT SUMMARY AND UI MODULE
// js/ui/ImportSummaryModal.js
// ===================================
class ImportSummaryModal {
    
    showImportSummary(results, duplicates) {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = `
            <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold">Import Complete</h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-3 bg-green-50 rounded">
                                <span class="text-green-800">Successfully Imported</span>
                                <span class="font-bold text-green-600">${results.success}</span>
                            </div>
                            ${results.skipped > 0 ? `
                                <div class="flex items-center justify-between p-3 bg-yellow-50 rounded">
                                    <span class="text-yellow-800">Skipped (No Account)</span>
                                    <span class="font-bold text-yellow-600">${results.skipped}</span>
                                </div>
                            ` : ''}
                            ${duplicates.length > 0 ? `
                                <div class="flex items-center justify-between p-3 bg-blue-50 rounded">
                                    <span class="text-blue-800">Duplicates Detected</span>
                                    <span class="font-bold text-blue-600">${duplicates.length}</span>
                                </div>
                            ` : ''}
                            ${results.failed > 0 ? `
                                <div class="flex items-center justify-between p-3 bg-red-50 rounded">
                                    <span class="text-red-800">Failed</span>
                                    <span class="font-bold text-red-600">${results.failed}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${duplicates.length > 0 ? `
                            <div class="mt-4 p-3 bg-gray-50 rounded">
                                <p class="text-sm text-gray-600 mb-2">Duplicate transactions were skipped:</p>
                                <div class="max-h-32 overflow-y-auto text-xs">
                                    ${duplicates.slice(0, 5).map(dup => `
                                        <div class="py-1">${dup.date.toLocaleDateString()} - ${dup.description} - ${this.formatCurrency(dup.amount)}</div>
                                    `).join('')}
                                    ${duplicates.length > 5 ? `<div class="py-1 text-gray-500">... and ${duplicates.length - 5} more</div>` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                        <button onclick="this.closeModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    closeModal() {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = '';
    }
}

// ===================================
// 6. MAIN ENHANCED IMPORT ORCHESTRATOR
// js/import/EnhancedImportManager.js
// ===================================
class EnhancedImportManager {
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