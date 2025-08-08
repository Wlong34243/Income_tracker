// js/import/EnhancedCSVImporter.js

import { AppConfig } from '../config/AppConfig.js';
import { DataService } from '../data/DataService.js';
import { DuplicateDetector } from './DuplicateDetector.js';
import { transactionRules } from '../rules/TransactionRules.js';
import { geminiService } from '../ai/GeminiService.js';

export class EnhancedCSVImporter {
    /**
     * @param {DataService} dataService An instance of the DataService to interact with application data.
     */
    constructor(dataService) {
        if (!dataService) {
            throw new Error("DataService instance is required.");
        }
        this.dataService = dataService; // Store reference to the data service
        this.importResults = null;
        this.categorizedTransactions = [];
        this.duplicates = [];
        this.failedRows = [];
        this.currentStep = 'upload';
        this.selectedFile = null;
        this.selectedFileName = '';
        this.initializeUI();
    }

    initializeUI() {
        // Create import modal with enhanced UI
        const modalHtml = `
            <div id="importModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="modal-backdrop fixed inset-0 bg-gray-900 bg-opacity-50"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div class="bg-blue-600 text-white p-4">
                            <div class="flex items-center justify-between">
                                <h2 class="text-xl font-semibold">Import Transactions</h2>
                                <button onclick="csvImporter.closeModal()" class="text-white hover:text-gray-200">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="flex border-b">
                            <div class="px-6 py-3 import-step active-step" data-step="upload">
                                <span class="font-medium">1. Upload</span>
                            </div>
                            <div class="px-6 py-3 import-step" data-step="review">
                                <span class="font-medium">2. Review & Categorize</span>
                            </div>
                            <div class="px-6 py-3 import-step" data-step="confirm">
                                <span class="font-medium">3. Confirm</span>
                            </div>
                        </div>
                        
                        <div class="p-6 overflow-y-auto flex-grow">
                            <div id="uploadStep" class="import-content">
                                <div class="max-w-2xl mx-auto">
                                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer" id="dropZone">
                                        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                        <p class="mb-2 text-sm text-gray-600">
                                            <label for="csvFileInput" class="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                                                Click to upload
                                            </label>
                                            or drag and drop
                                        </p>
                                        <p class="text-xs text-gray-500">CSV files (e.g., from Chase, Amex, etc.)</p>
                                        <input type="file" id="csvFileInput" accept=".csv" class="hidden" onchange="window.csvImporter.handleFileSelect(event); event.target.blur();">
                                    </div>
                                    
                                    <div class="mt-6 bg-gray-50 p-4 rounded-lg">
                                        <h4 class="font-medium mb-2">Important:</h4>
                                        <ul class="text-sm text-gray-600 space-y-1">
                                            <li>• Ensure the filename contains the last 4 digits of the account number.</li>
                                            <li>• Transactions will be auto-categorized using your rules and AI.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="reviewStep" class="import-content hidden">
                                <div id="importAlerts"></div>
                                <div class="mb-4 flex justify-between items-center">
                                    <div>
                                        <h3 class="text-lg font-semibold">Review Transactions</h3>
                                        <p class="text-sm text-gray-600 mt-1">
                                            <span id="totalCount">0</span> transactions found • 
                                            <span id="duplicateCount">0</span> duplicates • 
                                            <span id="newCount">0</span> new
                                        </p>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button onclick="csvImporter.categorizeAll()" 
                                                class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm">
                                            AI Categorize Uncertain
                                        </button>
                                        <select id="filterCategory" onchange="csvImporter.filterTransactions()" 
                                                class="border rounded px-3 py-2 text-sm">
                                            <option value="">All Categories</option>
                                            <option value="uncategorized">Uncategorized</option>
                                            <option value="low-confidence">Low Confidence</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div id="categoryStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    </div>
                                
                                <div id="transactionsList" class="space-y-2 max-h-96 overflow-y-auto">
                                    </div>
                            </div>
                            
                            <div id="confirmStep" class="import-content hidden">
                                <div class="max-w-2xl mx-auto">
                                    <h3 class="text-lg font-semibold mb-4">Import Summary</h3>
                                    <div id="importSummary" class="bg-gray-50 p-6 rounded-lg"></div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-gray-50 border-t flex justify-end space-x-3">
                             <button id="backButton" onclick="csvImporter.goBack()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 hidden">Back</button>
                             <button id="nextButton" onclick="csvImporter.goNext()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Next</button>
                             <button id="confirmButton" onclick="csvImporter.confirmImport()" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 hidden">Confirm Import</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupDragAndDrop();
    }

    openModal() {
        document.getElementById('importModal').classList.remove('hidden');
        this.goToStep('upload');
    }

    closeModal() {
        document.getElementById('importModal').classList.add('hidden');
        this.resetImport();
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        if (!dropZone) return;
        dropZone.onclick = () => document.getElementById('csvFileInput').click();

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('border-blue-400', 'bg-blue-50'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('border-blue-400', 'bg-blue-50'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                document.getElementById('csvFileInput').files = files;
                this.handleFileSelect({ target: { files: files } });
            }
        }, false);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
    
        // Prevent re-triggering
        event.preventDefault();
        event.stopPropagation();
    
        this.selectedFile = file;
        this.selectedFileName = file.name;
    
        // Update UI to show selected file
        const label = document.querySelector('label[for="csvFileInput"]');
        if (label) {
            label.textContent = `Selected: ${file.name}`;
            label.classList.add('text-green-600');
        }
    
        // Auto-process the file
        this.processFile();
    
        // Clear the input value to allow re-selecting the same file
        event.target.value = '';
    }

    async processFile() {
        const file = this.selectedFile;
        if (!file) return;

        try {
            this.showLoading('Parsing CSV file...');
            const text = await this.readFile(file);
            const accountId = this.detectAccountFromFilename(file.name);
            
            if (!accountId) {
                throw new Error('Could not determine account from filename. Please ensure the filename contains the last 4 digits of the account number.');
            }
            
            const transactions = this.parseCSV(text, accountId);
            
            if (transactions.length === 0) {
                throw new Error('No valid transactions found in file');
            }

            await this.processTransactions(transactions, accountId);
            
            this.goToStep('review');
        } catch (error) {
            this.showError('Import Error: ' + error.message);
            this.hideLoading();
        }
    }

    async processTransactions(transactions, accountId) {
        this.showLoading('Processing transactions...');
        
        // Fetch existing transactions to check for duplicates
        const existingTransactions = await this.dataService.getAllTransactions();
        const duplicateDetector = new DuplicateDetector(existingTransactions);
        
        this.categorizedTransactions = [];
        this.duplicates = [];
        this.failedRows = [];
        
        for (const transaction of transactions) {
            try {
                if (!transaction || typeof transaction !== 'object') {
                    throw new Error('Invalid transaction data from parser.');
                }

                if (duplicateDetector.isDuplicate(transaction)) {
                    this.duplicates.push(transaction);
                    continue;
                }
                
                // Safety check to ensure categorization is always an object
                const categorization = await geminiService.categorizeTransaction(transaction, { skipAI: true }) || {
                    category: 'Uncategorized',
                    confidence: 0.3,
                    method: 'fallback',
                    reasoning: 'Default categorization'
                };
                
                this.categorizedTransactions.push({
                    ...transaction,
                    ...categorization,
                    account: accountId,
                    entity: this.determineEntity(accountId),
                    importId: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });
            } catch (error) {
                console.error('Failed to process a transaction:', { transaction, error });
                this.failedRows.push({ transaction, error: error.message });
            }
        }
        
        this.updateReviewStats();
        this.renderTransactions();
        this.displayImportAlerts();
        this.hideLoading();
    }
    
    displayImportAlerts() {
        const container = document.getElementById('importAlerts');
        if (!container) return;
        
        if (this.failedRows.length > 0) {
            container.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong class="font-bold">Warning:</strong>
                    <span class="block sm:inline">${this.failedRows.length} rows could not be processed and were skipped. Check console for details.</span>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    }

    updateReviewStats() {
        const stats = {
            total: this.categorizedTransactions.length + this.duplicates.length + this.failedRows.length,
            duplicates: this.duplicates.length,
            new: this.categorizedTransactions.length,
            failed: this.failedRows.length,
            ruleMatched: 0,
            aiSuggested: 0,
            lowConfidence: 0,
            uncategorized: 0
        };
        
        this.categorizedTransactions.forEach(txn => {
            if (!txn.category || txn.category === 'Uncategorized') stats.uncategorized++;
            else if (txn.method === 'rule' && txn.confidence >= 0.8) stats.ruleMatched++;
            else if (txn.method === 'ai') stats.aiSuggested++;
            else if (txn.confidence < 0.7) stats.lowConfidence++;
            else stats.ruleMatched++;
        });
        
        document.getElementById('totalCount').textContent = stats.total;
        document.getElementById('duplicateCount').textContent = stats.duplicates;
        document.getElementById('newCount').textContent = stats.new;
        
        document.getElementById('categoryStats').innerHTML = `
            <div class="bg-green-50 p-3 rounded"><p class="text-sm text-green-600">Rule Matched</p><p class="text-xl font-bold text-green-800">${stats.ruleMatched}</p></div>
            <div class="bg-purple-50 p-3 rounded"><p class="text-sm text-purple-600">AI Suggested</p><p class="text-xl font-bold text-purple-800">${stats.aiSuggested}</p></div>
            <div class="bg-yellow-50 p-3 rounded"><p class="text-sm text-yellow-600">Low Confidence</p><p class="text-xl font-bold text-yellow-800">${stats.lowConfidence}</p></div>
            <div class="bg-red-50 p-3 rounded"><p class="text-sm text-red-600">Uncategorized</p><p class="text-xl font-bold text-red-800">${stats.uncategorized}</p></div>
        `;
    }

    renderTransactions(filter = '') {
        const container = document.getElementById('transactionsList');
        let transactionsToShow = this.categorizedTransactions;
        
        if (filter === 'uncategorized') transactionsToShow = transactionsToShow.filter(t => !t.category || t.category === 'Uncategorized');
        else if (filter === 'low-confidence') transactionsToShow = transactionsToShow.filter(t => t.confidence < 0.7);
        
        container.innerHTML = transactionsToShow.map((txn) => {
            const originalIndex = this.categorizedTransactions.indexOf(txn);
            const confidence = txn.confidence || 0;
            const confidenceColor = confidence >= 0.8 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
            const methodIcon = txn.method === 'rule' ? '⚡' : txn.method === 'ai' ? '🤖' : '❓';
            
            return `
                <div class="border rounded-lg p-3 bg-white hover:shadow-sm transition" data-index="${originalIndex}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2"><span class="text-lg" title="${txn.method || 'Unknown'}">${methodIcon}</span><p class="font-medium text-sm">${txn.description}</p></div>
                            <p class="text-sm text-gray-600 mt-1">${txn.date} • ${txn.amount < 0 ? '-' : ''}$${Math.abs(txn.amount).toFixed(2)}</p>
                            <div class="mt-2 flex items-center space-x-2 flex-wrap">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${confidenceColor}-100 text-${confidenceColor}-800">${txn.category || 'Uncategorized'}</span>
                                ${txn.property ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${txn.property}</span>` : ''}
                                <span class="text-xs text-gray-500">${(confidence * 100).toFixed(0)}% confidence</span>
                            </div>
                            ${txn.reasoning ? `<p class="text-xs text-gray-500 mt-1 italic">"${txn.reasoning}"</p>` : ''}
                        </div>
                        <button onclick="csvImporter.editTransaction(${originalIndex})" class="ml-2 text-blue-600 hover:text-blue-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                    </div>
                </div>`;
        }).join('');
    }

    filterTransactions() {
        const filter = document.getElementById('filterCategory').value;
        this.renderTransactions(filter);
    }

    async categorizeAll() {
        const uncategorized = this.categorizedTransactions.filter(t => !t.category || t.category === 'Uncategorized' || t.confidence < 0.7);
        if (uncategorized.length === 0) return this.showNotification('All transactions are already categorized!', 'info');
        
        this.showLoading(`Categorizing ${uncategorized.length} transactions with AI...`);
        try {
            const results = await geminiService.batchCategorize(uncategorized, { skipAI: false });
            results.forEach(result => {
                const txnIndex = this.categorizedTransactions.findIndex(t => t.importId === result.transaction.importId);
                if (txnIndex !== -1 && result.suggestion.confidence > (this.categorizedTransactions[txnIndex].confidence || 0)) {
                    this.categorizedTransactions[txnIndex] = { ...this.categorizedTransactions[txnIndex], ...result.suggestion };
                }
            });
            this.updateReviewStats();
            this.renderTransactions();
            this.hideLoading();
            this.showNotification(`Categorized ${results.length} transactions`, 'success');
        } catch (error) {
            this.hideLoading();
            this.showError('AI categorization failed: ' + error.message);
        }
    }

    editTransaction(index) { /* ... */ }
    closeEditModal() { /* ... */ }
    saveTransactionEdit() { /* ... */ }

    goToStep(step) {
        this.currentStep = step;
        document.querySelectorAll('.import-step').forEach(el => el.classList.toggle('active-step', el.dataset.step === step));
        document.querySelectorAll('.import-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`${step}Step`).classList.remove('hidden');
        
        const backButton = document.getElementById('backButton');
        const nextButton = document.getElementById('nextButton');
        const confirmButton = document.getElementById('confirmButton');

        backButton.classList.toggle('hidden', step === 'upload');
        nextButton.classList.toggle('hidden', step === 'confirm' || this.categorizedTransactions.length === 0);
        confirmButton.classList.toggle('hidden', step !== 'confirm');

        if (step === 'confirm') this.prepareImportSummary();
    }
    
    goNext() {
        if (this.currentStep === 'upload' && this.categorizedTransactions.length > 0) this.goToStep('review');
        else if (this.currentStep === 'review') this.goToStep('confirm');
    }

    goBack() {
        if (this.currentStep === 'confirm') this.goToStep('review');
        else if (this.currentStep === 'review') this.goToStep('upload');
    }

    prepareImportSummary() {
        const summaryContainer = document.getElementById('importSummary');
        if (!summaryContainer) return;

        const newTxnCount = this.categorizedTransactions.length;
        const duplicateCount = this.duplicates.length;
        const failedCount = this.failedRows.length;

        // Group by category
        const categoryCounts = this.categorizedTransactions.reduce((acc, txn) => {
            const category = txn.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const categoryList = Object.entries(categoryCounts)
            .map(([cat, count]) => `<li class="flex justify-between"><span class="text-gray-600">${cat}</span> <span>${count}</span></li>`)
            .join('');

        summaryContainer.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-medium text-gray-800">Summary</h4>
                    <ul class="mt-2 text-sm space-y-1">
                        <li class="flex justify-between"><span class="text-green-600">New Transactions</span> <span class="font-bold text-green-600">${newTxnCount}</span></li>
                        <li class="flex justify-between"><span class="text-yellow-600">Duplicates Skipped</span> <span class="font-bold text-yellow-600">${duplicateCount}</span></li>
                        <li class="flex justify-between"><span class="text-red-600">Failed Rows</span> <span class="font-bold text-red-600">${failedCount}</span></li>
                    </ul>
                </div>
                 ${newTxnCount > 0 ? `
                <div>
                    <h4 class="font-medium text-gray-800">New by Category</h4>
                    <ul class="mt-2 text-sm space-y-1">${categoryList}</ul>
                </div>
                ` : ''}
                <div class="pt-4 border-t">
                    <p class="text-sm text-gray-600">Click "Confirm Import" to add ${newTxnCount} new transactions to your records.</p>
                </div>
            </div>
        `;
    }

    async confirmImport() {
        if (!this.dataService) {
            this.showError('Data service not initialized');
            return;
        }

        if (this.categorizedTransactions.length === 0) {
            this.showNotification('No new transactions to import.', 'info');
            return;
        }

        this.showLoading(`Importing ${this.categorizedTransactions.length} transactions...`);

        try {
            // The data service should handle adding multiple transactions
            await this.dataService.addTransactions(this.categorizedTransactions);

            this.showNotification('Import successful!', 'success');
            this.closeModal(); // This also resets the import state
        } catch (error) {
            console.error('Failed to import transactions:', error);
            this.showError(`Import failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    detectAccountFromFilename(filename) {
        const matches = filename.match(/(\d{4})/);
        if (matches && matches[1]) {
            const accountId = matches[1];
            console.log(`Detected account number ${accountId} from filename.`);
            return accountId;
        }
        console.warn('Could not detect any 4-digit account number from filename:', filename);
        return null;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else { 
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // This handles both checking account and credit card formats
    parseCSV(text, accountId) {
        const lines = text.trim().split('\n');
        const transactions = [];
        
        if (lines.length <= 1) return transactions;

        // Get header to detect format
        const header = lines[0].toLowerCase();
        
        // Detect format type
        const isChaseCredit = header.includes('card') && header.includes('transaction date');
        const isChaseChecking = header.includes('details') && header.includes('posting date');
        
        console.log(`Parsing CSV: ${isChaseCredit ? 'Credit Card' : isChaseChecking ? 'Checking' : 'Unknown'} format for account ${accountId}`);
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const parts = this.parseCSVLine(lines[i]);
            
            if (isChaseCredit && parts.length >= 7) {
                // Credit card format: Card, Transaction Date, Post Date, Description, Category, Type, Amount, Memo
                const amount = parseFloat(parts[6]) || 0;
                if (amount !== 0) {
                    transactions.push({
                        date: this.parseDate(parts[1]),
                        description: parts[3] || 'No Description',
                        amount: -Math.abs(amount), // Credit charges are negative
                        account: accountId,
                        originalData: parts,
                        chaseCategory: parts[4] || '',
                        transactionType: parts[5] || 'Purchase'
                    });
                }
            } else if (isChaseChecking && parts.length >= 5) {
                // Checking format: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
                const amount = parseFloat(parts[3]?.replace(/[$,]/g, '')) || 0;
                if (amount !== 0) {
                    transactions.push({
                        date: this.parseDate(parts[1]),
                        description: parts[2] || 'No Description',
                        amount: amount, // Keep sign as-is for checking
                        account: accountId,
                        originalData: parts,
                        transactionType: parts[4] || 'Debit',
                        balance: parseFloat(parts[5]?.replace(/[$,]/g, '')) || null
                    });
                }
            } else if (parts.length >= 4) {
                // Generic fallback format
                const amount = this.parseAmount(parts);
                if (amount !== 0) {
                    transactions.push({
                        date: this.parseDate(parts[0]),
                        description: parts[1] || parts[2] || 'No Description',
                        amount: amount,
                        account: accountId,
                        originalData: parts
                    });
                }
            }
        }
        
        console.log(`Parsed ${transactions.length} valid transactions from CSV`);
        return transactions;
    }

    parseAmount(parts) {
        // Try different positions for amount
        for (let i = parts.length - 1; i >= 2; i--) {
            const cleaned = parts[i]?.replace(/[$,]/g, '');
            const amount = parseFloat(cleaned);
            if (!isNaN(amount) && amount !== 0) {
                return amount;
            }
        }
        return 0;
    }

    parseDate(dateString) {
        if (!dateString) return new Date().toISOString().split('T')[0];
        
        // Handle MM/DD/YYYY format
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const [month, day, year] = parts;
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
        }
        
        // Try standard parse
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 
            new Date().toISOString().split('T')[0] : 
            date.toISOString().split('T')[0];
    }

    determineEntity(accountId) {
        if (AppConfig.ACCOUNT_MAPPING && AppConfig.ACCOUNT_MAPPING[accountId]) {
            return AppConfig.ACCOUNT_MAPPING[accountId].entity;
        }
        return 'Personal';
    }

    showLoading(message) { console.log("LOADING:", message); }
    hideLoading() { console.log("LOADING HIDDEN"); }
    showNotification(message, type) { console.log(`NOTIFICATION (${type}): ${message}`); }
    showError(message) { this.showNotification(message, 'error'); }
    resetImport() {
        this.categorizedTransactions = [];
        this.duplicates = [];
        this.failedRows = [];
        this.selectedFile = null;
        this.selectedFileName = '';
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) fileInput.value = '';
        const label = document.querySelector('label[for="csvFileInput"]');
        if (label) {
            label.textContent = 'Click to upload';
            label.classList.remove('text-green-600');
        }
        this.goToStep('upload');
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (event) => reject(new Error(`File could not be read: ${event.target.error}`));
            reader.readAsText(file);
        });
    }
}