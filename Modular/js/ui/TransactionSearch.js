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

    render(container) {
        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 class="text-xl font-bold mb-4">Search & Edit Transactions</h2>

                <!-- Search and Filters Row -->
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
                        <option value="2433">2433 - Visa Prime</option>
                        <option value="8895">8895 - Self-Directed</option>
                        <option value="0898">0898 - Lisa's</option>
                        <option value="119">119 - Schwab</option>
                    </select>

                    <select id="entity-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Entities</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Tech Business">Tech Business</option>
                        <option value="Personal">Personal</option>
                        <option value="Transfer">Transfers</option>
                        <option value="Unknown">Uncategorized</option>
                    </select>
                </div>

                <!-- Date Range and Category Filters -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input type="date"
                           id="date-from"
                           class="px-4 py-2 border rounded-lg"
                           placeholder="From Date">

                    <input type="date"
                           id="date-to"
                           class="px-4 py-2 border rounded-lg"
                           placeholder="To Date">

                    <select id="category-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Categories</option>
                        <option value="Real Estate Income">Rental Income</option>
                        <option value="Tech Business Income">Tech Income</option>
                        <option value="Personal Income">Personal Income</option>
                        <option value="Property Expenses">Property Expenses</option>
                        <option value="Tech Business Expense">Tech Expenses</option>
                        <option value="Transfer">Transfers</option>
                        <option value="Uncategorized">Uncategorized</option>
                    </select>

                    <button id="clear-filters"
                            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                        Clear Filters
                    </button>
                </div>

                <!-- Results Summary and Bulk Actions -->
                <div class="flex justify-between items-center mb-4">
                    <div class="text-sm text-gray-600">
                        Showing <span id="result-count" class="font-bold">0</span> transactions
                        <span id="filter-summary" class="ml-2"></span>
                    </div>

                    <div class="flex gap-2">
                        <button id="select-all"
                                class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                            Select All
                        </button>
                        <button id="bulk-categorize"
                                class="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                                disabled>
                            Categorize Selected
                        </button>
                        <button id="export-filtered"
                                class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                            Export Results
                        </button>
                    </div>
                </div>

                <!-- Transactions Table -->
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="px-2 py-2 text-left">
                                    <input type="checkbox" id="select-all-checkbox">
                                </th>
                                <th class="px-4 py-2 text-left cursor-pointer hover:bg-gray-100" data-sort="date">
                                    Date <span class="sort-indicator">↓</span>
                                </th>
                                <th class="px-4 py-2 text-left cursor-pointer hover:bg-gray-100" data-sort="description">
                                    Description
                                </th>
                                <th class="px-4 py-2 text-right cursor-pointer hover:bg-gray-100" data-sort="amount">
                                    Amount
                                </th>
                                <th class="px-4 py-2 text-left">Account</th>
                                <th class="px-4 py-2 text-left">Category</th>
                                <th class="px-4 py-2 text-left">Entity</th>
                                <th class="px-4 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="transaction-results" class="divide-y divide-gray-200">
                            <!-- Results will be rendered here -->
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="flex justify-between items-center mt-4">
                    <div class="text-sm text-gray-600">
                        Page <span id="current-page">1</span> of <span id="total-pages">1</span>
                    </div>
                    <div class="flex gap-2">
                        <button id="prev-page"
                                class="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
                                disabled>
                            Previous
                        </button>
                        <button id="next-page"
                                class="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
                                disabled>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.loadTransactions();
    }

    attachEventListeners() {
        // Search input with debounce
        let searchTimeout;
        document.getElementById('transaction-search')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300);
        });

        // Filter changes
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
.
            this.applyFilters();
        });

        document.getElementById('date-from')?.addEventListener('change', (e) => {
            this.currentFilters.dateFrom = e.target.value;
            this.applyFilters();
        });

        document.getElementById('date-to')?.addEventListener('change', (e) => {
            this.currentFilters.dateTo = e.target.value;
            this.applyFilters();
        });

        // Clear filters
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Sort headers
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.sortBy(th.dataset.sort);
            });
        });

        // Select all
        document.getElementById('select-all')?.addEventListener('click', () => {
            this.selectAll();
        });

        // Bulk categorize
        document.getElementById('bulk-categorize')?.addEventListener('click', () => {
            this.bulkCategorize();
        });

        // Export filtered
        document.getElementById('export-filtered')?.addEventListener('click', () => {
            this.exportFiltered();
        });
    }

    async loadTransactions() {
        this.allTransactions = await this.dataService.loadTransactions(1000);
        this.applyFilters();
    }

    applyFilters() {
        this.filteredTransactions = this.allTransactions.filter(t => {
            // Search filter
            if (this.currentFilters.search) {
                const search = this.currentFilters.search.toLowerCase();
                const matchesSearch =
                    t.description?.toLowerCase().includes(search) ||
                    t.amount?.toString().includes(search) ||
                    t.category?.toLowerCase().includes(search);
                if (!matchesSearch) return false;
            }

            // Account filter
            if (this.currentFilters.account !== 'all' && t.accountId !== this.currentFilters.account) {
                return false;
            }

            // Entity filter
            if (this.currentFilters.entity !== 'all') {
                const entity = t.entity || 'Unknown';
                if (entity !== this.currentFilters.entity) return false;
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

    sortTransactions() {
        const { field, direction } = this.currentSort;
        const modifier = direction === 'asc' ? 1 : -1;

        this.filteredTransactions.sort((a, b) => {
            if (field === 'date') {
                return (new Date(a.date) - new Date(b.date)) * modifier;
            }
            if (field === 'amount') {
                return (a.amount - b.amount) * modifier;
            }
            if (field === 'description') {
                return a.description.localeCompare(b.description) * modifier;
            }
            return 0;
        });
    }

    renderResults() {
        const tbody = document.getElementById('transaction-results');
        if (!tbody) return;

        // Update count
        document.getElementById('result-count').textContent = this.filteredTransactions.length;

        // Render rows (first 50 for performance)
        const rows = this.filteredTransactions.slice(0, 50).map(t => this.renderRow(t)).join('');
        tbody.innerHTML = rows;

        // Attach row event listeners
        this.attachRowListeners();
    }

    renderRow(transaction) {
        const amountClass = transaction.amount >= 0 ? 'text-green-600' : 'text-red-600';
        const isSelected = this.selectedTransactions.has(transaction.id);

        return `
            <tr class="hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}" data-id="${transaction.id}">
                <td class="px-2 py-2">
                    <input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''}>
                </td>
                <td class="px-4 py-2">${new Date(transaction.date).toLocaleDateString()}</td>
                <td class="px-4 py-2">
                    <span class="editable-field" data-field="description">${transaction.description}</span>
                </td>
                <td class="px-4 py-2 text-right ${amountClass} font-mono">
                    $${Math.abs(transaction.amount).toFixed(2)}
                </td>
                <td class="px-4 py-2">${transaction.accountId}</td>
                <td class="px-4 py-2">
                    <select class="quick-edit-category text-sm border rounded px-1" data-id="${transaction.id}">
                        <option value="${transaction.category}">${transaction.category || 'Uncategorized'}</option>
                        <option value="">---</option>
                        <option value="Real Estate Income">Rental Income</option>
                        <option value="Tech Business Income">Tech Income</option>
                        <option value="Personal Income">Personal Income</option>
                        <option value="Property Expenses">Property Expenses</option>
                        <option value="Transfer">Transfer</option>
                    </select>
                </td>
                <td class="px-4 py-2">
                    <span class="text-xs px-2 py-1 rounded
                        ${transaction.entity === 'Real Estate' ? 'bg-blue-100 text-blue-800' : ''}
                        ${transaction.entity === 'Tech Business' ? 'bg-purple-100 text-purple-800' : ''}
                        ${transaction.entity === 'Personal' ? 'bg-gray-100 text-gray-800' : ''}">
                        ${transaction.entity || 'Unknown'}
                    </span>
                </td>
                <td class="px-4 py-2 text-center">
                    <button class="edit-btn text-blue-500 hover:text-blue-700" title="Edit">
                        ✏️
                    </button>
                    <button class="delete-btn text-red-500 hover:text-red-700 ml-2" title="Delete">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }

    attachRowListeners() {
        // Checkbox selection
        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const row = e.target.closest('tr');
                const id = row.dataset.id;
                if (e.target.checked) {
                    this.selectedTransactions.add(id);
                    row.classList.add('bg-blue-50');
                } else {
                    this.selectedTransactions.delete(id);
                    row.classList.remove('bg-blue-50');
                }
                this.updateBulkActions();
            });
        });

        // Quick category edit
        document.querySelectorAll('.quick-edit-category').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const newCategory = e.target.value;
                if (newCategory) {
                    await this.updateTransaction(id, { category: newCategory });
                }
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('tr').dataset.id;
                this.openEditModal(id);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('tr').dataset.id;
                if (confirm('Delete this transaction?')) {
                    await this.deleteTransaction(id);
                }
            });
        });
    }

    async updateTransaction(id, updates) {
        await this.dataService.updateTransaction(id, updates);
        await this.loadTransactions();
        window.app.uiManager.showNotification('Transaction updated', 'success');
    }

    async deleteTransaction(id) {
        await this.dataService.deleteTransaction(id);
        await this.loadTransactions();
        window.app.uiManager.showNotification('Transaction deleted', 'success');
    }

    openEditModal(id) {
        const transaction = this.allTransactions.find(t => t.id === id);
        if (transaction && window.app.services.enhancedTransactionUI) {
            window.app.services.enhancedTransactionUI.openEditPanel(transaction);
        }
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

        // Reset form fields
        document.getElementById('transaction-search').value = '';
        document.getElementById('account-filter').value = 'all';
        document.getElementById('entity-filter').value = 'all';
        document.getElementById('category-filter').value = 'all';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';

        this.applyFilters();
    }

    sortBy(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'desc';
        }
        this.applyFilters();
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        const allSelected = this.selectedTransactions.size === this.filteredTransactions.length;

        checkboxes.forEach(cb => {
            cb.checked = !allSelected;
            const row = cb.closest('tr');
            const id = row.dataset.id;
            if (!allSelected) {
                this.selectedTransactions.add(id);
                row.classList.add('bg-blue-50');
            } else {
                this.selectedTransactions.delete(id);
                row.classList.remove('bg-blue-50');
            }
        });

        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkBtn = document.getElementById('bulk-categorize');
        if (bulkBtn) {
            bulkBtn.disabled = this.selectedTransactions.size === 0;
        }
    }

    async bulkCategorize() {
        if (this.selectedTransactions.size === 0) return;

        const category = prompt('Enter category for selected transactions:');
        if (!category) return;

        for (const id of this.selectedTransactions) {
            await this.dataService.updateTransaction(id, { category });
        }

        this.selectedTransactions.clear();
        await this.loadTransactions();
        window.app.uiManager.showNotification(`Updated ${this.selectedTransactions.size} transactions`, 'success');
    }

    exportFiltered() {
        const csv = this.convertToCSV(this.filteredTransactions);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filtered_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(transactions) {
        const headers = ['Date', 'Description', 'Amount', 'Account', 'Category', 'Entity'];
        const rows = transactions.map(t => [
            t.date,
            t.description,
            t.amount,
            t.accountId,
            t.category || '',
            t.entity || ''
        ]);

        return [headers, ...rows].map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }
}
