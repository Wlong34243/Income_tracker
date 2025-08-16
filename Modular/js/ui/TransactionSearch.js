// Modular/js/ui/TransactionSearch.js
export class TransactionSearch {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.allTransactions = [];
        this.filteredTransactions = [];
        this.currentFilters = {
            search: '',
            account: 'all',
            entity: 'all',
            dateFrom: '',
            dateTo: ''
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
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">Search & Edit Transactions</h2>
                    <button id="back-to-dashboard" class="text-blue-600 hover:text-blue-800">
                        ← Back to Dashboard
                    </button>
                </div>

                <!-- Search Bar -->
                <div class="mb-4">
                    <input type="text"
                           id="search-input"
                           placeholder="Search transactions..."
                           class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>

                <!-- Filters -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <select id="account-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Accounts</option>
                        <option value="0111">0111 - Sweep</option>
                        <option value="8529">8529 - RE Ops</option>
                        <option value="7991">7991 - Tech Business</option>
                        <option value="2299">2299 - Tech Expenses</option>
                        <option value="7588">7588 - Shared</option>
                        <option value="2433">2433 - Visa Prime</option>
                    </select>

                    <select id="entity-filter" class="px-4 py-2 border rounded-lg">
                        <option value="all">All Entities</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Tech Business">Tech Business</option>
                        <option value="Personal">Personal</option>
                    </select>

                    <input type="date" id="date-from" class="px-4 py-2 border rounded-lg">
                    <input type="date" id="date-to" class="px-4 py-2 border rounded-lg">
                </div>

                <!-- Results Count -->
                <div class="text-sm text-gray-600 mb-2">
                    Found <span id="result-count" class="font-bold">0</span> transactions
                </div>

                <!-- Results Table -->
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left">Date</th>
                                <th class="px-4 py-2 text-left">Description</th>
                                <th class="px-4 py-2 text-right">Amount</th>
                                <th class="px-4 py-2 text-left">Account</th>
                                <th class="px-4 py-2 text-left">Category</th>
                                <th class="px-4 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="search-results" class="divide-y divide-gray-200">
                            <!-- Results will be rendered here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.renderResults();
    }

    attachEventListeners() {
        // Back button
        document.getElementById('back-to-dashboard')?.addEventListener('click', () => {
            window.app.uiManager.showDashboard();
        });

        // Search input
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Account filter
        document.getElementById('account-filter')?.addEventListener('change', (e) => {
            this.currentFilters.account = e.target.value;
            this.applyFilters();
        });

        // Entity filter
        document.getElementById('entity-filter')?.addEventListener('change', (e) => {
            this.currentFilters.entity = e.target.value;
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
    }

    applyFilters() {
        this.filteredTransactions = this.allTransactions.filter(t => {
            // Search filter
            if (this.currentFilters.search) {
                const matchesSearch =
                    t.description?.toLowerCase().includes(this.currentFilters.search) ||
                    t.category?.toLowerCase().includes(this.currentFilters.search);
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

            // Date filters
            if (this.currentFilters.dateFrom && t.date < this.currentFilters.dateFrom) {
                return false;
            }
            if (this.currentFilters.dateTo && t.date > this.currentFilters.dateTo) {
                return false;
            }

            return true;
        });

        this.renderResults();
    }

    renderResults() {
        const tbody = document.getElementById('search-results');
        const count = document.getElementById('result-count');

        if (!tbody) return;

        count.textContent = this.filteredTransactions.length;

        // Render first 100 results for performance
        const results = this.filteredTransactions.slice(0, 100);

        tbody.innerHTML = results.map(t => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2">${new Date(t.date).toLocaleDateString()}</td>
                <td class="px-4 py-2">${t.description}</td>
                <td class="px-4 py-2 text-right ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                    $${Math.abs(t.amount).toFixed(2)}
                </td>
                <td class="px-4 py-2">${t.accountId}</td>
                <td class="px-4 py-2">
                    <select class="quick-category text-sm border rounded px-1" data-id="${t.id}">
                        <option>${t.category || 'Uncategorized'}</option>
                        <option value="Real Estate Income">Rental Income</option>
                        <option value="Tech Business Income">Tech Income</option>
                        <option value="Property Expenses">Property Expense</option>
                        <option value="Transfer">Transfer</option>
                    </select>
                </td>
                <td class="px-4 py-2 text-center">
                    <button class="edit-btn text-blue-500 hover:text-blue-700" data-id="${t.id}">
                        Edit
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach event listeners to dynamic elements
        this.attachRowListeners();
    }

    attachRowListeners() {
        // Quick category change
        document.querySelectorAll('.quick-category').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const newCategory = e.target.value;
                if (newCategory && newCategory !== e.target.options[0].text) {
                    await this.dataService.updateTransaction(id, {
                        category: newCategory,
                        entity: this.determineEntity(newCategory)
                    });
                    await this.loadTransactions();
                    window.app.uiManager.showNotification('Category updated', 'success');
                }
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const transaction = this.allTransactions.find(t => t.id === id);
                if (transaction && window.app.services.enhancedTransactionUI) {
                    window.app.services.enhancedTransactionUI.openEditPanel(transaction);
                }
            });
        });
    }

    determineEntity(category) {
        if (category.includes('Real Estate') || category.includes('Property')) return 'Real Estate';
        if (category.includes('Tech')) return 'Tech Business';
        if (category.includes('Transfer')) return 'Transfer';
        return 'Personal';
    }
}
