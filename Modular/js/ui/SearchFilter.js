/**
 * @class SearchFilter
 * @description Handles search and filtering functionality for transactions.
 */
export class SearchFilter {
    /**
     * @constructor
     * @param {DataService} dataService - The service to fetch data.
     */
    constructor(dataService) {
        this.dataService = dataService;
        this.currentFilters = {
            searchTerm: '',
            category: 'all',
            entity: 'all',
            account: 'all',
            dateFrom: null,
            dateTo: null,
            amountMin: null,
            amountMax: null,
            showTransfers: true
        };
    }

    /**
     * Renders the search bar and filter controls.
     * @param {HTMLElement} container - The container element to render the search bar in.
     * @param {Array<Object>} transactions - The list of all transactions to build filter options.
     * @param {Array<Object>} accounts - The list of all accounts.
     */
    async renderSearchBar(container, transactions, accounts) {
        const categories = [...new Set(transactions.map(t => t.category))].sort();
        const entities = [...new Set(transactions.map(t => t.entity))].sort();

        const searchBarHTML = `
            <div id="search-filter-container" class="bg-white p-4 rounded-lg shadow mb-4">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Search Term -->
                    <div>
                        <label for="search-term" class="block text-sm font-medium text-gray-700">Search</label>
                        <input type="text" id="search-term" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., rent or >1000">
                    </div>

                    <!-- Category -->
                    <div>
                        <label for="filter-category" class="block text-sm font-medium text-gray-700">Category</label>
                        <select id="filter-category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="all">All Categories</option>
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Entity -->
                    <div>
                        <label for="filter-entity" class="block text-sm font-medium text-gray-700">Entity</label>
                        <select id="filter-entity" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="all">All Entities</option>
                            ${entities.map(e => `<option value="${e}">${e}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Account -->
                    <div>
                        <label for="filter-account" class="block text-sm font-medium text-gray-700">Account</label>
                        <select id="filter-account" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="all">All Accounts</option>
                            ${accounts.map(a => `<option value="${a.accountId}">${a.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Date Range -->
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700">Date Range</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="date" id="date-from" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <input type="date" id="date-to" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                        </div>
                    </div>

                    <!-- Amount Range -->
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700">Amount Range</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="number" id="amount-min" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Min">
                            <input type="number" id="amount-max" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Max">
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-4">
                    <div class="flex items-center">
                        <input id="show-transfers" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked>
                        <label for="show-transfers" class="ml-2 block text-sm text-gray-900">Show Transfers</label>
                    </div>
                    <div>
                        <button id="export-filtered-btn" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">Export Results</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = searchBarHTML;
        this.addEventListeners(container);
    }

    /**
     * Adds event listeners to the search and filter controls.
     * @param {HTMLElement} container - The container element of the search bar.
     */
    addEventListeners(container) {
        const updateFilters = () => {
            this.currentFilters.searchTerm = container.querySelector('#search-term').value;
            this.currentFilters.category = container.querySelector('#filter-category').value;
            this.currentFilters.entity = container.querySelector('#filter-entity').value;
            this.currentFilters.account = container.querySelector('#filter-account').value;
            this.currentFilters.dateFrom = container.querySelector('#date-from').value;
            this.currentFilters.dateTo = container.querySelector('#date-to').value;
            this.currentFilters.amountMin = container.querySelector('#amount-min').value;
            this.currentFilters.amountMax = container.querySelector('#amount-max').value;
            this.currentFilters.showTransfers = container.querySelector('#show-transfers').checked;

            // This assumes the app object is available to re-render the list
            window.app.loadDataAndRender();
        };

        container.querySelector('#search-term').addEventListener('input', updateFilters);
        container.querySelector('#filter-category').addEventListener('change', updateFilters);
        container.querySelector('#filter-entity').addEventListener('change', updateFilters);
        container.querySelector('#filter-account').addEventListener('change', updateFilters);
        container.querySelector('#date-from').addEventListener('change', updateFilters);
        container.querySelector('#date-to').addEventListener('change', updateFilters);
        container.querySelector('#amount-min').addEventListener('input', updateFilters);
        container.querySelector('#amount-max').addEventListener('input', updateFilters);
        container.querySelector('#show-transfers').addEventListener('change', updateFilters);
        container.querySelector('#export-filtered-btn').addEventListener('click', () => this.exportFilteredResults());
    }

    /**
     * Filters transactions based on the current filter criteria.
     * @param {Array<Object>} transactions - The list of transactions to filter.
     * @returns {Array<Object>} The filtered list of transactions.
     */
    filterTransactions(transactions) {
        return transactions.filter(t => {
            const { searchTerm, category, entity, account, dateFrom, dateTo, amountMin, amountMax, showTransfers } = this.currentFilters;

            // Text search
            if (searchTerm) {
                const lowerSearchTerm = searchTerm.toLowerCase();
                const matchAmount = lowerSearchTerm.match(/([<|>]|<=|>=)\s*(\d+\.?\d*)/);

                if (matchAmount) {
                    const operator = matchAmount[1];
                    const value = parseFloat(matchAmount[2]);
                    if (operator === '>' && !(t.amount > value)) return false;
                    if (operator === '<' && !(t.amount < value)) return false;
                    if (operator === '>=' && !(t.amount >= value)) return false;
                    if (operator === '<=' && !(t.amount <= value)) return false;
                } else if (!t.description.toLowerCase().includes(lowerSearchTerm)) {
                    return false;
                }
            }

            // Category filter
            if (category !== 'all' && t.category !== category) return false;

            // Entity filter
            if (entity !== 'all' && t.entity !== entity) return false;

            // Account filter
            if (account !== 'all' && t.accountId !== account) return false;

            // Date range filter
            if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
            if (dateTo && new Date(t.date) > new Date(dateTo)) return false;

            // Amount range filter
            if (amountMin !== null && amountMin !== '' && t.amount < parseFloat(amountMin)) return false;
            if (amountMax !== null && amountMax !== '' && t.amount > parseFloat(amountMax)) return false;

            // Show/hide transfers
            if (!showTransfers && t.category === 'Transfer') return false;

            return true;
        });
    }

    /**
     * Exports the filtered results to a CSV file.
     */
    exportFilteredResults() {
        const filteredTransactions = this.filterTransactions(window.app.transactions);
        if (window.DataExporter && filteredTransactions.length > 0) {
            window.DataExporter.exportToCSV(filteredTransactions, 'filtered_transactions.csv');
            window.app.uiManager.showNotification(`${filteredTransactions.length} filtered transactions exported.`, 'success');
        } else {
            window.app.uiManager.showNotification('No filtered transactions to export.', 'warning');
        }
    }
}
