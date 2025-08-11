export class UIManager {
    constructor(services) {
        this.services = services; // { enhancedTransactionUI, csvImporter, settingsManager, notificationManager, authService }
        this.app = null; // Will be set in init()

        this.elements = {
            mainApp: document.getElementById('mainApp'),
            authContainer: document.getElementById('authContainer'),
            headerButtons: document.getElementById('header-buttons'),
            userInfo: document.getElementById('userInfo'),
            dashboardContainer: document.getElementById('dashboard-container'),
            transactionsContainer: document.getElementById('transactions-container'),
            modalContainer: document.getElementById('modal-container'),
            editorContainer: document.getElementById('editor-container'),
        };
    }

    init(appController) {
        this.app = appController;
        this.setupEventListeners();

        // Let sub-components render their containers
        this.services.enhancedTransactionUI.renderAddModal(this.elements.modalContainer);
        this.services.enhancedTransactionUI.renderEditPanel(this.elements.editorContainer);
    }

    setupEventListeners() {
        this.elements.headerButtons.querySelector('#importTransactionsBtn').addEventListener('click', () => {
            // This is a placeholder. A real CSV import modal would be opened here.
            // The logic is in CategoryAwareCSVImporter, but the UI is not built yet.
            this.showNotification('CSV Import UI not implemented yet.', 'info');
        });

        this.elements.headerButtons.querySelector('#addTransactionBtn').addEventListener('click', () => {
            this.services.enhancedTransactionUI.openAddModal(this.app.accounts);
        });

        this.elements.headerButtons.querySelector('#logoutBtn').addEventListener('click', () => {
            this.services.authService.signOut();
        });

        this.services.settingsManager.addSettingsButton(this.elements.headerButtons);

        // Event delegation for transaction list
        this.elements.transactionsContainer.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const transactionId = editBtn.dataset.id;
                const transaction = this.app.transactions.find(t => t.id === transactionId);
                if (transaction) {
                    this.services.enhancedTransactionUI.openEditPanel(transaction);
                }
            }
        });
    }

    showMainApp(user) {
        this.elements.mainApp.classList.remove('hidden');
        this.elements.authContainer.classList.add('hidden');
        this.elements.userInfo.textContent = user.email || 'No email';
    }

    showAuth() {
        this.elements.mainApp.classList.add('hidden');
        this.elements.authContainer.classList.remove('hidden');
        this.services.authService.renderAuthUI(this.elements.authContainer);
    }

    renderDashboard(transactions, accounts) {
        this.elements.dashboardContainer.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-2">Overview</h2>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-2xl font-bold">${transactions.length}</div>
                        <div class="text-sm text-gray-600">Total Transactions</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold">${accounts.length}</div>
                        <div class="text-sm text-gray-600">Accounts</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTransactionList(transactions) {
        if (!transactions || transactions.length === 0) {
            this.elements.transactionsContainer.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">No transactions yet.</div>`;
            return;
        }

        const transactionRows = transactions.map(t => this.createTransactionRow(t)).join('');
        this.elements.transactionsContainer.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-2">Recent Transactions</h2>
                <div class="space-y-1">${transactionRows}</div>
            </div>
        `;
    }

    createTransactionRow(transaction) {
        const amountColor = transaction.amount < 0 ? 'text-red-600' : 'text-green-600';
        const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.amount);
        const categoryDisplay = transaction.category && transaction.category !== 'Uncategorized'
            ? `${transaction.category} / ${transaction.subcategory}`
            : 'Uncategorized';

        return `
            <div class="p-2 border-b hover:bg-gray-50 flex justify-between items-center">
                <div>
                    <p class="font-medium">${transaction.description}</p>
                    <p class="text-sm text-gray-500">${new Date(transaction.date + 'T00:00:00').toLocaleDateString()} | ${categoryDisplay}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="font-mono ${amountColor}">${formattedAmount}</span>
                    <button data-id="${transaction.id}" class="edit-btn text-gray-400 hover:text-blue-500" title="Edit Transaction">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        this.services.notificationManager.show(message, type);
    }
}
