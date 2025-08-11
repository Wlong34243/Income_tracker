// Enhanced CSV Import Integration with Category Manager
// File: js/import/CategoryAwareCSVImporter.js

export class CategoryAwareCSVImporter {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.categorizedTransactions = [];
        this.currentStep = 'upload';
        this.duplicates = [];
        this.processingStats = {
            total: 0,
            categorized: 0,
            ruleBased: 0,
            aiBased: 0,
            manual: 0
        };
    }

    // ===== START: NEW METHODS TO FIX BROKEN IMPORTER =====

    detectCSVFormat(filename, headers) {
        // Chase Checking format
        if (headers.includes('Details') && headers.includes('Posting Date')) {
            return 'CHASE_CHECKING';
        }
        // Chase Credit Card format
        if (headers.includes('Transaction Date') && headers.includes('Category')) {
            return 'CHASE_CREDIT';
        }
        // Investment format
        if (headers.includes('Trade Date') && headers.includes('Ticker')) {
            return 'INVESTMENT';
        }
        return 'UNKNOWN';
    }

    parseDate(dateStr) {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        // Handles MM/DD/YYYY and M/D/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [month, day, year] = parts;
            // Handles both YY and YYYY years
            const fullYear = year.length === 2 ? `20${year}` : year;
            const date = new Date(fullYear, month - 1, day);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
        // Fallback for other formats like YYYY-MM-DD
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
    }

    normalizeTransactionData(data, accountId) {
        if (!data.length) return [];

        const headers = Object.keys(data[0]);
        const format = this.detectCSVFormat(accountId, headers); // filename can give hints too

        const FIELD_MAPPINGS = {
            CHASE_CHECKING: { date: 'Posting Date', description: 'Description', amount: 'Amount', type: 'Type' },
            CHASE_CREDIT: { date: 'Transaction Date', description: 'Description', amount: 'Amount', type: 'Type' },
            INVESTMENT: { date: 'Trade Date', description: 'Description', amount: 'Amount USD', ticker: 'Ticker' }
        };

        const mapping = FIELD_MAPPINGS[format];
        if (!mapping) {
            console.warn("Unknown CSV format, attempting generic mapping.");
            // A generic mapping could be attempted here if needed
            return [];
        }

        return data.map(row => {
            let amount = parseFloat(row[mapping.amount]) || 0;

            // Handle amount sign conventions
            if (format === 'CHASE_CREDIT') {
                // Payments are negative, charges are positive in source, but we want charges to be negative expenses.
                amount = -amount;
            }

            const transaction = {
                date: this.parseDate(row[mapping.date]),
                description: row[mapping.description],
                amount: amount,
                accountId: accountId,
                originalData: row,
                type: row[mapping.type] || (amount > 0 ? 'Income' : 'Expense')
            };

            // Detect transfers
            const typeField = (row[mapping.type] || '').toLowerCase();
            if (typeField.includes('online transfer') || typeField.includes('acct_xfer')) {
                transaction.type = 'Transfer';
            }

            return transaction;
        }).filter(t => t.amount !== 0); // Filter out zero-amount transactions
    }

    transactionsMatch(t1, t2) {
        if (!t1 || !t2) return false;
        const sameDate = new Date(t1.date).toDateString() === new Date(t2.date).toDateString();
        const sameAmount = Math.abs(t1.amount - t2.amount) < 0.01;
        const sameDescription = t1.description.toLowerCase().trim() === t2.description.toLowerCase().trim();
        return sameDate && sameAmount && sameDescription;
    }

    async findDuplicates(transactions) {
        const existingTransactions = await this.dataService.getAllTransactions();
        if (existingTransactions.length === 0) return [];

        const duplicates = [];
        for (const transaction of transactions) {
            if (existingTransactions.some(existing => this.transactionsMatch(transaction, existing))) {
                duplicates.push(transaction);
            }
        }
        return duplicates;
    }

    // ===== END: NEW METHODS =====

    // Enhanced processCSV method with categorization
    async processCSV(file, accountId) {
        try {
            this.showLoading('Processing CSV file...');

            const csvText = await this.readFile(file);
            const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                trimHeaders: true
            });

            if (parsedData.errors.length > 0) {
                throw new Error('CSV parsing errors: ' + parsedData.errors.map(e => e.message).join(', '));
            }

            // Detect CSV format and normalize data
            const transactions = this.normalizeTransactionData(parsedData.data, accountId);

            // Check for duplicates
            this.duplicates = await this.findDuplicates(transactions);

            // Filter out duplicates for processing
            const newTransactions = transactions.filter(txn =>
                !this.duplicates.some(dup => this.transactionsMatch(txn, dup))
            );

            // Process each transaction with enhanced categorization
            this.categorizedTransactions = await this.categorizeTransactions(newTransactions);

            this.updateProcessingStats();
            this.hideLoading();

            // Move to review step
            this.goToStep('review');

            return {
                processed: this.categorizedTransactions.length,
                duplicates: this.duplicates.length,
                stats: this.processingStats
            };

        } catch (error) {
            this.hideLoading();
            throw error;
        }
    }

    async categorizeTransactions(transactions) {
        const categorized = [];
        this.processingStats.total = transactions.length;

        for (const [index, transaction] of transactions.entries()) {
            this.updateLoadingProgress(`Categorizing transaction ${index + 1} of ${transactions.length}...`);

            // Use CategoryManager for enhanced categorization
            const categoryResult = this.categoryManager.categorizeTransaction(transaction);

            const categorizedTransaction = {
                ...transaction,
                importId: `import_${Date.now()}_${index}`,
                ...categoryResult,
                originalData: { ...transaction },
                processingTime: new Date().toISOString()
            };

            // Update stats based on categorization method
            this.updateStatsForMethod(categoryResult.method);

            categorized.push(categorizedTransaction);
        }

        return categorized;
    }

    updateStatsForMethod(method) {
        switch (method) {
            case 'amount_match':
            case 'keyword_match':
            case 'account_match':
                this.processingStats.ruleBased++;
                break;
            case 'ai':
                this.processingStats.aiBased++;
                break;
            case 'transfer_detection':
                this.processingStats.ruleBased++;
                break;
            default:
                this.processingStats.manual++;
        }
        this.processingStats.categorized++;
    }

    updateProcessingStats() {
        const statsContainer = document.getElementById('processingStats');
        if (!statsContainer) return;

        const accuracy = this.processingStats.total > 0 ?
            (this.processingStats.categorized / this.processingStats.total * 100).toFixed(1) : 0;

        statsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">${this.processingStats.total}</div>
                    <div class="text-sm text-gray-600">Total Transactions</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">${this.processingStats.ruleBased}</div>
                    <div class="text-sm text-gray-600">Rule-Based</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600">${this.processingStats.aiBased}</div>
                    <div class="text-sm text-gray-600">AI-Powered</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-orange-600">${accuracy}%</div>
                    <div class="text-sm text-gray-600">Accuracy</div>
                </div>
            </div>
        `;
    }

    // Enhanced rendering with category information
    renderTransactions(filter = '') {
        const container = document.getElementById('transactionPreview');
        if (!container || !this.categorizedTransactions.length) return;

        const filteredTransactions = filter ?
            this.categorizedTransactions.filter(t =>
                t.category?.toLowerCase().includes(filter.toLowerCase()) ||
                t.subcategory?.toLowerCase().includes(filter.toLowerCase())
            ) : this.categorizedTransactions;

        container.innerHTML = filteredTransactions.map((txn, originalIndex) => {
            const confidence = txn.confidence || 0;
            const confidenceColor = confidence >= 0.8 ? 'green' : confidence >= 0.6 ? 'yellow' : 'red';
            const methodIcon = this.getMethodIcon(txn.method);
            const isTransfer = txn.category === 'Transfers';

            return `
                <div class="border rounded-lg p-4 bg-white hover:shadow-sm transition transaction-card"
                     data-index="${originalIndex}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <!-- Transaction Header -->
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="text-lg" title="${txn.method || 'Unknown'}">${methodIcon}</span>
                                <h4 class="font-medium text-sm">${txn.description}</h4>
                                ${isTransfer ? '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Transfer</span>' : ''}
                            </div>

                            <!-- Amount and Date -->
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-lg font-semibold ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${txn.amount >= 0 ? '+' : ''}$${Math.abs(txn.amount).toFixed(2)}
                                </span>
                                <span class="text-sm text-gray-500">${txn.date}</span>
                            </div>

                            <!-- Category Information -->
                            <div class="flex items-center space-x-2 flex-wrap mb-2">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                           bg-${confidenceColor}-100 text-${confidenceColor}-800">
                                    ${txn.category || 'Uncategorized'}
                                    ${txn.subcategory ? ` • ${txn.subcategory}` : ''}
                                </span>

                                ${txn.entity ? `
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs
                                               ${this.getEntityColor(txn.entity)}">
                                        ${txn.entity}
                                    </span>
                                ` : ''}

                                ${txn.property ? `
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                        📍 ${txn.property}
                                    </span>
                                ` : ''}

                                ${txn.taxCategory && txn.taxCategory !== 'Personal' ? `
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs
                                               ${this.getTaxCategoryColor(txn.taxCategory)}">
                                        ${txn.taxCategory}
                                    </span>
                                ` : ''}
                            </div>

                            <!-- Confidence and Method -->
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-gray-500">
                                    ${(confidence * 100).toFixed(0)}% confidence • ${this.getMethodLabel(txn.method)}
                                </span>

                                ${txn.reasoning ? `
                                    <span class="text-xs text-gray-400 italic" title="${txn.reasoning}">
                                        💡 ${txn.reasoning.substring(0, 30)}${txn.reasoning.length > 30 ? '...' : ''}
                                    </span>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Edit Button -->
                        <div class="ml-4 flex flex-col space-y-1">
                            <button onclick="csvImporter.editImportTransaction(${originalIndex})"
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                            </button>

                            ${confidence < 0.7 ? `
                                <button onclick="csvImporter.reCategorizeTransaction(${originalIndex})"
                                        class="text-purple-600 hover:text-purple-800 p-1" title="Re-categorize">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getMethodIcon(method) {
        const icons = {
            'amount_match': '🎯',
            'keyword_match': '🔍',
            'account_match': '🏦',
            'transfer_detection': '↔️',
            'ai': '🤖',
            'default': '📝'
        };
        return icons[method] || '❓';
    }

    getMethodLabel(method) {
        const labels = {
            'amount_match': 'Amount Match',
            'keyword_match': 'Keyword Match',
            'account_match': 'Account Rule',
            'transfer_detection': 'Transfer Rule',
            'ai': 'AI Categorized',
            'default': 'Default'
        };
        return labels[method] || 'Unknown';
    }

    getEntityColor(entity) {
        const colors = {
            'Real Estate': 'bg-green-100 text-green-800',
            'Tech Business': 'bg-blue-100 text-blue-800',
            'Personal': 'bg-purple-100 text-purple-800',
            'All': 'bg-gray-100 text-gray-800'
        };
        return colors[entity] || 'bg-gray-100 text-gray-800';
    }

    getTaxCategoryColor(taxCategory) {
        const colors = {
            'Schedule_E': 'bg-green-100 text-green-800',
            'Schedule_C': 'bg-blue-100 text-blue-800',
            'Schedule_D': 'bg-purple-100 text-purple-800',
            'Exclude': 'bg-red-100 text-red-800'
        };
        return colors[taxCategory] || 'bg-gray-100 text-gray-800';
    }

    // Enhanced edit transaction for import review
    editImportTransaction(index) {
        const transaction = this.categorizedTransactions[index];
        if (!transaction) return;

        this.showImportTransactionEditor(transaction, index);
    }

    showImportTransactionEditor(transaction, index) {
        const modal = document.getElementById('importTransactionEditor');
        if (!modal) {
            this.createImportTransactionEditor();
        }

        // Populate form
        document.getElementById('importTxnIndex').value = index;
        document.getElementById('importTxnDescription').value = transaction.description;
        document.getElementById('importTxnAmount').value = transaction.amount;
        document.getElementById('importTxnDate').value = transaction.date;

        // Populate category dropdown
        this.populateImportCategoryDropdown(transaction);

        // Show confidence info
        this.showImportConfidenceInfo(transaction);

        modal.classList.remove('hidden');
    }

    createImportTransactionEditor() {
        const modalHTML = `
            <div id="importTransactionEditor" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
                    <h3 class="text-lg font-semibold mb-4">Edit Transaction</h3>

                    <form id="importTransactionForm" class="space-y-4">
                        <input type="hidden" id="importTxnIndex">

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Description</label>
                                <input type="text" id="importTxnDescription"
                                       class="w-full p-2 border rounded" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Amount</label>
                                <input type="number" id="importTxnAmount" step="0.01"
                                       class="w-full p-2 border rounded" readonly>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Date</label>
                            <input type="date" id="importTxnDate"
                                   class="w-full p-2 border rounded" readonly>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Category</label>
                            <select id="importTxnCategory" class="w-full p-2 border rounded" required>
                                <!-- Populated dynamically -->
                            </select>
                        </div>

                        <div id="importPropertyDiv" class="hidden">
                            <label class="block text-sm font-medium mb-1">Property</label>
                            <select id="importTxnProperty" class="w-full p-2 border rounded">
                                <!-- Populated dynamically -->
                            </select>
                        </div>

                        <div id="importConfidenceInfo" class="p-3 bg-gray-50 rounded">
                            <!-- Confidence information -->
                        </div>

                        <div class="flex space-x-2 pt-4">
                            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                Save Changes
                            </button>
                            <button type="button" onclick="csvImporter.closeImportTransactionEditor()"
                                    class="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('importTransactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveImportTransactionEdit();
        });

        document.getElementById('importTxnCategory').addEventListener('change', (e) => {
            this.handleImportCategoryChange(e);
        });
    }

    populateImportCategoryDropdown(transaction) {
        const select = document.getElementById('importTxnCategory');
        const groupedCategories = this.categoryManager.getCategoriesForDropdown();

        select.innerHTML = '<option value="">Select Category...</option>';

        Object.entries(groupedCategories).forEach(([categoryName, subcategories]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoryName;

            subcategories.forEach(subcat => {
                const option = document.createElement('option');
                option.value = subcat.id;
                option.textContent = subcat.subcategory;
                option.dataset.category = subcat.category;
                option.dataset.entity = subcat.entity;
                option.dataset.taxCategory = subcat.taxCategory;

                if (transaction.category === subcat.category && transaction.subcategory === subcat.subcategory) {
                    option.selected = true;
                }

                optgroup.appendChild(option);
            });

            if (optgroup.children.length > 0) {
                select.appendChild(optgroup);
            }
        });
    }

    handleImportCategoryChange(e) {
        const selectedOption = e.target.selectedOptions[0];
        if (!selectedOption) return;

        const isRealEstate = selectedOption.dataset.entity === 'Real Estate';
        const propertyDiv = document.getElementById('importPropertyDiv');

        if (propertyDiv) {
            propertyDiv.classList.toggle('hidden', !isRealEstate);
            if (isRealEstate) {
                this.populateImportPropertyDropdown();
            }
        }
    }

    populateImportPropertyDropdown() {
        const select = document.getElementById('importTxnProperty');
        if (!select) return;

        const properties = JSON.parse(localStorage.getItem('property_list') || '[]');

        select.innerHTML = '<option value="">Select Property...</option>';
        properties.forEach(property => {
            const option = document.createElement('option');
            option.value = property.id;
            option.textContent = property.nickname || property.address;
            select.appendChild(option);
        });
    }

    showImportConfidenceInfo(transaction) {
        const container = document.getElementById('importConfidenceInfo');
        if (!container) return;

        const confidence = transaction.confidence || 0;
        const confidencePercent = (confidence * 100).toFixed(0);
        const method = this.getMethodLabel(transaction.method);

        container.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-medium text-sm mb-1">Categorization Details</h4>
                    <p class="text-xs text-gray-600">
                        <strong>Method:</strong> ${method} •
                        <strong>Confidence:</strong> ${confidencePercent}%
                        ${transaction.reasoning ? ` • <strong>Reasoning:</strong> ${transaction.reasoning}` : ''}
                    </p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-lg">${this.getMethodIcon(transaction.method)}</span>
                    <span class="px-2 py-1 rounded text-xs ${this.getConfidenceColor(confidence)}">
                        ${confidencePercent}%
                    </span>
                </div>
            </div>
        `;
    }

    getConfidenceColor(confidence) {
        if (confidence >= 0.8) return 'bg-green-100 text-green-800';
        if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    }

    saveImportTransactionEdit() {
        const index = parseInt(document.getElementById('importTxnIndex').value);
        const selectedOption = document.getElementById('importTxnCategory').selectedOptions[0];

        if (!selectedOption) {
            alert('Please select a category');
            return;
        }

        // Update the transaction with new category data
        const updates = {
            category: selectedOption.dataset.category,
            subcategory: selectedOption.textContent,
            entity: selectedOption.dataset.entity,
            taxCategory: selectedOption.dataset.taxCategory,
            property: document.getElementById('importTxnProperty')?.value || '',
            confidence: 1.0, // Manual edit = 100% confidence
            method: 'manual_edit'
        };

        this.categorizedTransactions[index] = {
            ...this.categorizedTransactions[index],
            ...updates
        };

        // Update stats
        this.updateProcessingStats();

        // Re-render transactions
        this.renderTransactions();

        this.closeImportTransactionEditor();

        if (this.app?.showNotification) {
            this.app.showNotification('Transaction updated successfully!', 'success');
        }
    }

    closeImportTransactionEditor() {
        document.getElementById('importTransactionEditor').classList.add('hidden');
    }

    // Re-categorize transaction with AI
    async reCategorizeTransaction(index) {
        const transaction = this.categorizedTransactions[index];
        if (!transaction) return;

        try {
            this.showLoading('Re-categorizing with AI...');

            // Call AI service for better categorization
            const aiResult = await this.callAIService(transaction);

            if (aiResult && aiResult.confidence > transaction.confidence) {
                this.categorizedTransactions[index] = {
                    ...this.categorizedTransactions[index],
                    ...aiResult,
                    method: 'ai_recategorization'
                };

                this.renderTransactions();
                this.updateProcessingStats();

                if (this.app?.showNotification) {
                    this.app.showNotification('Transaction re-categorized successfully!', 'success');
                }
            } else {
                if (this.app?.showNotification) {
                    this.app.showNotification('No better categorization found.', 'info');
                }
            }

            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            console.error('Re-categorization failed:', error);
            if (this.app?.showNotification) {
                this.app.showNotification('Re-categorization failed.', 'error');
            }
        }
    }

    async callAIService(transaction) {
        // This would integrate with your existing AI service
        // For now, return a mock result
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    category: 'Utilities',
                    subcategory: 'Internet/Cable',
                    entity: 'Real Estate',
                    confidence: 0.85,
                    reasoning: 'AI-enhanced categorization based on description pattern'
                });
            }, 1000);
        });
    }

    // Bulk operations
    async categorizeAllUncertain() {
        const uncertainTransactions = this.categorizedTransactions.filter(t =>
            !t.category || t.category === 'Uncategorized' || t.confidence < 0.7
        );

        if (uncertainTransactions.length === 0) {
            if (this.app?.showNotification) {
                this.app.showNotification('All transactions are already well categorized!', 'info');
            }
            return;
        }

        try {
            this.showLoading(`Re-categorizing ${uncertainTransactions.length} uncertain transactions...`);

            for (const [i, transaction] of uncertainTransactions.entries()) {
                this.updateLoadingProgress(`Processing ${i + 1} of ${uncertainTransactions.length}...`);

                const betterResult = this.categoryManager.categorizeTransaction(transaction);

                if (betterResult.confidence > transaction.confidence) {
                    const txnIndex = this.categorizedTransactions.findIndex(t => t.importId === transaction.importId);
                    if (txnIndex !== -1) {
                        this.categorizedTransactions[txnIndex] = {
                            ...this.categorizedTransactions[txnIndex],
                            ...betterResult,
                            method: 'bulk_recategorization'
                        };
                    }
                }
            }

            this.renderTransactions();
            this.updateProcessingStats();
            this.hideLoading();

            if (this.app?.showNotification) {
                this.app.showNotification(`Re-categorized ${uncertainTransactions.length} transactions.`, 'success');
            }

        } catch (error) {
            this.hideLoading();
            console.error('Bulk categorization failed:', error);
            if (this.app?.showNotification) {
                this.app.showNotification('Bulk categorization failed.', 'error');
            }
        }
    }

    // Filter and search functionality
    addFilterControls() {
        const filtersHTML = `
            <div class="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                    <label class="block text-sm font-medium mb-1">Filter by Category</label>
                    <select id="categoryFilter" onchange="csvImporter.filterTransactions()"
                            class="p-2 border rounded">
                        <option value="">All Categories</option>
                        <option value="Income">Income</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Personal">Personal</option>
                        <option value="Transfers">Transfers</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Filter by Entity</label>
                    <select id="entityFilter" onchange="csvImporter.filterTransactions()"
                            class="p-2 border rounded">
                        <option value="">All Entities</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Tech Business">Tech Business</option>
                        <option value="Personal">Personal</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Filter by Confidence</label>
                    <select id="confidenceFilter" onchange="csvImporter.filterTransactions()"
                            class="p-2 border rounded">
                        <option value="">All Confidence Levels</option>
                        <option value="high">High (80%+)</option>
                        <option value="medium">Medium (60-79%)</option>
                        <option value="low">Low (<60%)</option>
                    </select>
                </div>

                <div class="flex-1">
                    <label class="block text-sm font-medium mb-1">Search Description</label>
                    <input type="text" id="descriptionSearch"
                           onchange="csvImporter.filterTransactions()"
                           placeholder="Search transaction descriptions..."
                           class="w-full p-2 border rounded">
                </div>

                <div class="flex items-end space-x-2">
                    <button onclick="csvImporter.categorizeAllUncertain()"
                            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                        Re-categorize Uncertain
                    </button>
                    <button onclick="csvImporter.clearFilters()"
                            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                        Clear Filters
                    </button>
                </div>
            </div>
        `;

        const container = document.getElementById('reviewStep');
        if (container) {
            const existingFilters = container.querySelector('.filter-controls');
            if (existingFilters) {
                existingFilters.remove();
            }

            const filtersDiv = document.createElement('div');
            filtersDiv.className = 'filter-controls';
            filtersDiv.innerHTML = filtersHTML;
            container.insertBefore(filtersDiv, container.querySelector('#transactionPreview'));
        }
    }

    filterTransactions() {
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const entityFilter = document.getElementById('entityFilter')?.value || '';
        const confidenceFilter = document.getElementById('confidenceFilter')?.value || '';
        const searchFilter = document.getElementById('descriptionSearch')?.value || '';

        let filtered = [...this.categorizedTransactions];

        if (categoryFilter) {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }

        if (entityFilter) {
            filtered = filtered.filter(t => t.entity === entityFilter);
        }

        if (confidenceFilter) {
            switch (confidenceFilter) {
                case 'high':
                    filtered = filtered.filter(t => (t.confidence || 0) >= 0.8);
                    break;
                case 'medium':
                    filtered = filtered.filter(t => (t.confidence || 0) >= 0.6 && (t.confidence || 0) < 0.8);
                    break;
                case 'low':
                    filtered = filtered.filter(t => (t.confidence || 0) < 0.6);
                    break;
            }
        }

        if (searchFilter) {
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(searchFilter.toLowerCase())
            );
        }

        // Update display with filtered results
        this.renderFilteredTransactions(filtered);

        // Update filter summary
        this.updateFilterSummary(filtered.length, this.categorizedTransactions.length);
    }

    renderFilteredTransactions(filteredTransactions) {
        const container = document.getElementById('transactionPreview');
        if (!container) return;

        if (filteredTransactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No transactions match the current filters.</p>
                    <button onclick="csvImporter.clearFilters()"
                            class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        // Use the same rendering logic but with filtered data
        const originalTransactions = this.categorizedTransactions;
        this.categorizedTransactions = filteredTransactions;
        this.renderTransactions();
        this.categorizedTransactions = originalTransactions;
    }

    updateFilterSummary(filteredCount, totalCount) {
        const summaryContainer = document.getElementById('filterSummary');
        if (!summaryContainer) {
            // Create summary container if it doesn't exist
            const summary = document.createElement('div');
            summary.id = 'filterSummary';
            summary.className = 'mb-4 text-sm text-gray-600';

            const container = document.getElementById('transactionPreview');
            if (container && container.parentNode) {
                container.parentNode.insertBefore(summary, container);
            }
        }

        document.getElementById('filterSummary').innerHTML =
            filteredCount === totalCount ?
                `Showing all ${totalCount} transactions` :
                `Showing ${filteredCount} of ${totalCount} transactions`;
    }

    clearFilters() {
        ['categoryFilter', 'entityFilter', 'confidenceFilter', 'descriptionSearch'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        this.renderTransactions();
        this.updateFilterSummary(this.categorizedTransactions.length, this.categorizedTransactions.length);
    }

    // Enhanced import confirmation
    prepareImportSummary() {
        const summaryContainer = document.getElementById('importSummary');
        if (!summaryContainer) return;

        const categoryBreakdown = this.getCategoryBreakdown();
        const entityBreakdown = this.getEntityBreakdown();
        const methodBreakdown = this.getMethodBreakdown();

        summaryContainer.innerHTML = `
            <div class="space-y-6">
                <!-- Overview -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${this.categorizedTransactions.length}</div>
                        <div class="text-sm text-blue-800">New Transactions</div>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-yellow-600">${this.duplicates.length}</div>
                        <div class="text-sm text-yellow-800">Duplicates Skipped</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">${this.processingStats.ruleBased}</div>
                        <div class="text-sm text-green-800">Rule-Based</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600">${this.processingStats.aiBased}</div>
                        <div class="text-sm text-purple-800">AI-Categorized</div>
                    </div>
                </div>

                <!-- Category Breakdown -->
                <div>
                    <h4 class="font-semibold mb-3">Categories</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${Object.entries(categoryBreakdown).map(([category, count]) => `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span class="text-sm">${category}</span>
                                <span class="font-medium">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Entity Breakdown -->
                <div>
                    <h4 class="font-semibold mb-3">Business Entities</h4>
                    <div class="grid grid-cols-3 gap-4">
                        ${Object.entries(entityBreakdown).map(([entity, count]) => `
                            <div class="text-center p-3 bg-gray-50 rounded">
                                <div class="text-lg font-bold">${count}</div>
                                <div class="text-sm text-gray-600">${entity}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Low Confidence Warning -->
                ${this.getLowConfidenceWarning()}
            </div>
        `;
    }

    getCategoryBreakdown() {
        const breakdown = {};
        this.categorizedTransactions.forEach(txn => {
            const category = txn.category || 'Uncategorized';
            breakdown[category] = (breakdown[category] || 0) + 1;
        });
        return breakdown;
    }

    getEntityBreakdown() {
        const breakdown = {};
        this.categorizedTransactions.forEach(txn => {
            const entity = txn.entity || 'Unknown';
            breakdown[entity] = (breakdown[entity] || 0) + 1;
        });
        return breakdown;
    }

    getMethodBreakdown() {
        const breakdown = {};
        this.categorizedTransactions.forEach(txn => {
            const method = this.getMethodLabel(txn.method);
            breakdown[method] = (breakdown[method] || 0) + 1;
        });
        return breakdown;
    }

    getLowConfidenceWarning() {
        const lowConfidence = this.categorizedTransactions.filter(t => (t.confidence || 0) < 0.6);

        if (lowConfidence.length === 0) {
            return `
                <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-green-800 font-medium">All transactions categorized with high confidence!</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-yellow-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                        <p class="text-yellow-800 font-medium">
                            ${lowConfidence.length} transactions have low confidence categorization
                        </p>
                        <p class="text-yellow-700 text-sm mt-1">
                            Consider reviewing these transactions before importing.
                        </p>
                        <button onclick="csvImporter.showLowConfidenceTransactions()"
                                class="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900">
                            Review low confidence transactions
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showLowConfidenceTransactions() {
        const lowConfidence = this.categorizedTransactions.filter(t => (t.confidence || 0) < 0.6);

        // Set filters to show only low confidence
        document.getElementById('confidenceFilter').value = 'low';

        // Go back to review step
        this.goToStep('review');

        // Apply filter
        this.filterTransactions();
    }

    // Utility methods
    showLoading(message) {
        const loader = document.getElementById('loadingIndicator');
        if (loader) {
            loader.textContent = message;
            loader.classList.remove('hidden');
        }
    }

    updateLoadingProgress(message) {
        const loader = document.getElementById('loadingIndicator');
        if (loader) {
            loader.textContent = message;
        }
    }

    hideLoading() {
        const loader = document.getElementById('loadingIndicator');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    // Integration with existing step navigation
    goToStep(step) {
        this.currentStep = step;

        // Update step indicators
        document.querySelectorAll('.import-step').forEach(el =>
            el.classList.toggle('active-step', el.dataset.step === step)
        );

        // Show/hide step content
        document.querySelectorAll('.import-content').forEach(el =>
            el.classList.add('hidden')
        );
        document.getElementById(`${step}Step`)?.classList.remove('hidden');

        // Update buttons
        const backButton = document.getElementById('backButton');
        const nextButton = document.getElementById('nextButton');
        const confirmButton = document.getElementById('confirmButton');

        if (backButton) backButton.classList.toggle('hidden', step === 'upload');
        if (nextButton) nextButton.classList.toggle('hidden', step === 'confirm' || this.categorizedTransactions.length === 0);
        if (confirmButton) confirmButton.classList.toggle('hidden', step !== 'confirm');

        // Add filter controls on review step
        if (step === 'review') {
            setTimeout(() => this.addFilterControls(), 100);
        }

        if (step === 'confirm') {
            this.prepareImportSummary();
        }
    }
}

// Make globally available for integration
window.CategoryAwareCSVImporter = CategoryAwareCSVImporter;
