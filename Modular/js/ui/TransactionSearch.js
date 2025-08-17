// js/ui/TransactionSearch.js
export class TransactionSearch {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.allTransactions = [];
        this.filteredTransactions = [];
        this.selectedTransactions = new Set();
        this.currentSort = { field: 'date', direction: 'desc' };
        this.currentFilters = {
            search: '',
            account: 'all',
            entity: 'all',
            dateFrom: '',
            dateTo: '',
            category: 'all'
        };
    }

    async init() {
        await this.loadTransactions();
    }

    async loadTransactions() {
        this.allTransactions = await this.dataService.loadTransactions(1000);
        this.applyFilters();
    }

    render(container) {
        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-xl font-bold mb-4">Search & Edit Transactions</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div class="col-span-2">
                        <input type="text"
                               id="transaction-search"
                               placeholder="Search description, amount, or category..."
                               class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <select id="account-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Accounts</option>
                        <option value="0111">0111 - Sweep</option>
                        <option value="8529">8529 - RE Ops</option>
                        <option value="7991">7991 - Tech Business</option>
                        <option value="2299">2299 - Tech Expenses</option>
                        <option value="7588">7588 - Shared</option>
                        <option value="2433">2433 - Personal CC</option>
                        <option value="8895">8895 - Investment</option>
                        <option value="0898">0898 - Lisa's</option>
                    </select>
                    
                    <select id="entity-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Entities</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Tech Business">Tech Business</option>
                        <option value="Personal">Personal</option>
                        <option value="Transfer">Transfers</option>
                    </select>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input type="date" id="date-from" class="px-4 py-2 border rounded-lg">
                    <input type="date" id="date-to" class="px-4 py-2 border rounded-lg">
                    
                    <select id="category-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Categories</option>
                        <option value="Real Estate Income">Real Estate Income</option>
                        <option value="Tech Business Income">Tech Business Income</option>
                        <option value="Personal Income">Personal Income</option>
                        <option value="Property Expenses">Property Expenses</option>
                        <option value="Tech Business Expense">Tech Business Expense</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Uncategorized">Uncategorized</option>
                    </select>
                    
                    <button id="clear-filters" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                        Clear Filters
                    </button>
                </div>
                
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-2">
                        <button id="select-all" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                            Select All
                        </button>
                        <button id="deselect-all" class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                            Deselect All
                        </button>
                        <span class="text-sm text-gray-600 ml-2">
                            <span id="selected-count">0</span> selected
                        </span>
                    </div>
                    
                    <div class="flex gap-2">
                        <select id="bulk-category" class="px-3 py-1 border rounded text-sm">
                            <option value="">Bulk Categorize...</option>
                            <option value="Real Estate Income">Real Estate Income</option>
                            <option value="Tech Business Income">Tech Business Income</option>
                            <option value="Property Expenses">Property Expenses</option>
                            <option value="Transfer">Transfer</option>
                        </select>
                        
                        <button id="bulk-delete" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                            Delete Selected
                        </button>
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2">
                                    <input type="checkbox" id="select-all-checkbox" class="rounded">
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    data-sort="date">
                                    Date ↓
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    data-sort="description">
                                    Description
                                </th>
                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    data-sort="amount">
                                    Amount
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Account
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Category
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Entity
                                </th>
                                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody id="search-results" class="bg-white divide-y divide-gray-200">
                            </tbody>
                    </table>
                </div>
                
                <div class="mt-4 text-sm text-gray-600">
                    Showing <span id="result-count">0</span> of <span id="total-count">0</span> transactions
                </div>
            </div>
        `;
        
        this.attachEventListeners();
        this.renderResults();
    }

    attachEventListeners() {
        // Search input
        document.getElementById('transaction-search')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.applyFilters();
        });
        
        // Filter dropdowns
        document.getElementById('account-filter')?.addEventListener('change', (e) => {
            this.currentFilters.account = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('entity-filter')?.addEventListener('change', (e) => {
            this.currentFilters.entity = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.applyFilters();
        });
        
        // Date filters
        document.getElementById('date-from')?.addEventListener('change', (e) => {
            this.currentFilters.dateFrom = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('date-to')?.addEventListener('change', (e) => {
            this.currentFilters.dateTo = e.target.value;
            this.applyFilters();
        });
        
        // Clear filters button
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Select/Deselect all
        document.getElementById('select-all')?.addEventListener('click', () => {
            this.selectAll();
        });
        
        document.getElementById('deselect-all')?.addEventListener('click', () => {
            this.deselectAll();
        });
        
        document.getElementById('select-all-checkbox')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectAll();
            } else {
                this.deselectAll();
            }
        });
        
        // Bulk actions
        document.getElementById('bulk-category')?.addEventListener('change', async (e) => {
            if (e.target.value && this.selectedTransactions.size > 0) {
                await this.bulkCategorize(e.target.value);
                e.target.value = '';
            }
        });
        
        document.getElementById('bulk-delete')?.addEventListener('click', async () => {
            if (this.selectedTransactions.size > 0) {
                await this.bulkDelete();
            }
        });
        
        // Sort headers
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', () => {
                this.sortBy(header.dataset.sort);
            });
        });
    }

    applyFilters() {
        this.filteredTransactions = this.allTransactions.filter(t => {
            // Search filter
            if (this.currentFilters.search) {
                const search = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    t.description?.toLowerCase().includes(search) ||
                    t.category?.toLowerCase().includes(search) ||
                    t.amount?.toString().includes(search);
                if (!matchesSearch) return false;
            }
            
            // Account filter
            if (this.currentFilters.account !== 'all' && t.accountId !== this.currentFilters.account) {
                return false;
            }
            
            // Entity filter
            if (this.currentFilters.entity !== 'all' && t.entity !== this.currentFilters.entity) {
                return false;
            }
            
            // Category filter
            if (this.currentFilters.category !== 'all' && t.category !== this.currentFilters.category) {
                return false;
            }
            
            // Date range filter
            if (this.currentFilters.dateFrom && t.date < this.currentFilters.dateFrom) {
                return false;
            }
            if (this.currentFilters.dateTo && t.date > this.currentFilters.dateTo) {
                return false;
            }
            
            return true;
        });
        
        this.sortTransactions();
        this.renderResults();
    }

    sortBy(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'desc';
        }
        
        this.sortTransactions();
        this.renderResults();
        this.updateSortIndicators();
    }

    sortTransactions() {
        const { field, direction } = this.currentSort;
        const multiplier = direction === 'asc' ? 1 : -1;
        
        this.filteredTransactions.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (field === 'amount') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            
            if (aVal < bVal) return -1 * multiplier;
            if (aVal > bVal) return 1 * multiplier;
            return 0;
        });
    }

    updateSortIndicators() {
        document.querySelectorAll('[data-sort]').forEach(header => {
            const field = header.dataset.sort;
            const text = header.textContent.replace(/[↑↓]/g, '').trim();
            
            if (field === this.currentSort.field) {
                const arrow = this.currentSort.direction === 'asc' ? '↑' : '↓';
                header.textContent = `${text} ${arrow}`;
            } else {
                header.textContent = text;
            }
        });
    }

    clearFilters() {
        this.currentFilters = {
            search: '',
            account: 'all',
            entity: 'all',
            dateFrom: '',
            dateTo: '',
            category: 'all'
        };
        
        document.getElementById('transaction-search').value = '';
        document.getElementById('account-filter').value = 'all';
        document.getElementById('entity-filter').value = 'all';
        document.getElementById('category-filter').value = 'all';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        
        this.applyFilters();
    }

    selectAll() {
        this.filteredTransactions.forEach(t => {
            this.selectedTransactions.add(t.id);
        });
        this.updateSelectionUI();
    }

    deselectAll() {
        this.selectedTransactions.clear();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        // Update count
        document.getElementById('selected-count').textContent = this.selectedTransactions.size;
        
        // Update checkboxes
        document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
            checkbox.checked = this.selectedTransactions.has(checkbox.dataset.id);
        });
        
        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = this.selectedTransactions.size === this.filteredTransactions.length && 
                                          this.filteredTransactions.length > 0;
        }
    }

    async bulkCategorize(category) {
        const selectedIds = Array.from(this.selectedTransactions);
        const entity = this.determineEntity(category);

        for (const id of selectedIds) {
            await this.dataService.updateTransaction(id, {
                category: category,
                entity: entity
            });
        }
        
        await this.loadTransactions();
        this.selectedTransactions.clear();
        this.showNotification(`Updated ${selectedIds.length} transactions`, 'success');
    }
    
    determineEntity(category) {
        if (category.includes('Real Estate') || category.includes('Property')) return 'Real Estate';
        if (category.includes('Tech')) return 'Tech Business';
        if (category.includes('Transfer')) return 'Transfer';
        return 'Personal';
    }

    async bulkDelete() {
        if (!confirm(`Delete ${this.selectedTransactions.size} selected transactions?`)) {
            return;
        }
        
        const selectedIds = Array.from(this.selectedTransactions);
        
        for (const id of selectedIds) {
            await this.dataService.deleteTransaction(id);
        }
        
        await this.loadTransactions();
        this.selectedTransactions.clear();
        this.showNotification(`Deleted ${selectedIds.length} transactions`, 'success');
    }

    renderResults() {
        const tbody = document.getElementById('search-results');
        if (!tbody) return;
        
        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        No transactions found
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = this.filteredTransactions.map(t => this.renderRow(t)).join('');
        }
        
        // Update counts
        document.getElementById('result-count').textContent = this.filteredTransactions.length;
        document.getElementById('total-count').textContent = this.allTransactions.length;
        
        // Attach row event listeners
        this.attachRowEventListeners();
    }

    renderRow(transaction) {
        const isSelected = this.selectedTransactions.has(transaction.id);
        const amountClass = transaction.amount < 0 ? 'text-red-600' : 'text-green-600';
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(transaction.amount);
        
        return `
            <tr class="${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}">
                <td class="px-3 py-2">
                    <input type="checkbox" 
                           class="transaction-checkbox rounded" 
                           data-id="${transaction.id}"
                           ${isSelected ? 'checked' : ''}>
                </td>
                <td class="px-4 py-2 text-sm">${transaction.date}</td>
                <td class="px-4 py-2 text-sm">${transaction.description}</td>
                <td class="px-4 py-2 text-sm text-right ${amountClass} font-mono">
                    ${formattedAmount}
                </td>
                <td class="px-4 py-2 text-sm">${transaction.accountId}</td>
                <td class="px-4 py-2 text-sm">${transaction.category || 'Uncategorized'}</td>
                <td class="px-4 py-2 text-sm">${transaction.entity || '-'}</td>
                <td class="px-4 py-2 text-center">
                    <button class="edit-transaction text-blue-600 hover:text-blue-800"
                            data-id="${transaction.id}">
                        Edit
                    </button>
                </td>
            </tr>
        `;
    }

    attachRowEventListeners() {
        // Checkbox selection
        document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedTransactions.add(e.target.dataset.id);
                } else {
                    this.selectedTransactions.delete(e.target.dataset.id);
                }
                this.updateSelectionUI();
            });
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-transaction').forEach(button => {
            button.addEventListener('click', (e) => {
                const transaction = this.allTransactions.find(t => t.id === e.target.dataset.id);
                if (transaction) {
                    this.openEditModal(transaction);
                }
            });
        });
    }

    openEditModal(transaction) {
        // Integrate with the main UIManager's enhanced transaction UI
        if (window.app?.uiManager?.services?.enhancedTransactionUI) {
            window.app.uiManager.services.enhancedTransactionUI.openEditPanel(transaction);
        } else {
            console.error('EnhancedTransactionUI not available to open edit panel.');
            this.showNotification('Edit feature not available.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        if (window.app?.uiManager) {
            window.app.uiManager.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}