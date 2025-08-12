import { sanitizeHTML } from '../utils/Sanitizer.js';

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
            csvImportModal: null,
        };
    }

    init(appController) {
        this.app = appController;
        this.services.enhancedTransactionUI.renderAddModal(this.elements.modalContainer);
        this.services.enhancedTransactionUI.renderEditPanel(this.elements.editorContainer);
        this.renderCsvImportModal();

        if (this.services.csvImporter && typeof this.services.csvImporter.setUIManager === 'function') {
            this.services.csvImporter.setUIManager(this);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.headerButtons.querySelector('#importTransactionsBtn').addEventListener('click', () => {
            this.openCsvImportModal();
        });

        this.elements.headerButtons.querySelector('#addTransactionBtn').addEventListener('click', () => {
            this.services.enhancedTransactionUI.openAddModal(this.app.accounts);
        });

        this.elements.headerButtons.querySelector('#logoutBtn').addEventListener('click', () => {
            this.services.authService.signOut();
        });

        this.services.settingsManager.addSettingsButton(this.elements.headerButtons);

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

    renderCsvImportModal() {
        const modalHTML = `
            <div id="csvImportModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                        <div class="flex items-center justify-between p-4 border-b flex-shrink-0">
                            <h3 class="text-lg font-semibold">Import Transactions</h3>
                            <button id="closeCsvModalBtn" class="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div id="csv-import-content" class="p-6 overflow-y-auto"></div>
                        <div class="flex justify-end space-x-2 p-4 border-t flex-shrink-0">
                            <button id="csvBackBtn" class="px-4 py-2 bg-gray-200 rounded">Back</button>
                            <button id="csvNextBtn" class="px-4 py-2 bg-blue-600 text-white rounded">Next</button>
                            <button id="csvConfirmBtn" class="hidden px-4 py-2 bg-green-600 text-white rounded">Confirm Import</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.elements.modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.elements.csvImportModal = document.getElementById('csvImportModal');
        this.addCsvModalListeners();
    }

    addCsvModalListeners() {
        const modal = this.elements.csvImportModal;
        modal.querySelector('#closeCsvModalBtn').addEventListener('click', () => modal.classList.add('hidden'));

        modal.querySelector('#csvNextBtn').addEventListener('click', async () => {
            const importer = this.services.csvImporter;
            if (importer.currentStep === 'upload') {
                const fileInput = modal.querySelector('#csvFileInput');
                const accountSelect = modal.querySelector('#csvAccountSelect');
                if (fileInput.files.length > 0) {
                    try {
                        this.showLoader(true);
                        await importer.processCSV(fileInput.files[0], accountSelect.value);
                    } catch (e) {
                        this.showNotification(e.message, 'error');
                    } finally {
                        this.showLoader(false);
                    }
                } else {
                    this.showNotification('Please select a CSV file.', 'error');
                }
            } else if (importer.currentStep === 'review') {
                importer.goToStep('confirm');
            }
        });

        modal.querySelector('#csvConfirmBtn').addEventListener('click', async () => {
            const importer = this.services.csvImporter;
            try {
                this.showLoader(true);
                const result = await importer.importConfirmedTransactions();
                this.showNotification(`${result.success} transactions imported successfully!`, 'success');
                modal.classList.add('hidden');
                await this.app.loadDataAndRender();
            } catch (e) {
                this.showNotification(e.message, 'error');
            } finally {
                this.showLoader(false);
            }
        });

        modal.querySelector('#csvBackBtn').addEventListener('click', () => {
            const importer = this.services.csvImporter;
            if (importer.currentStep === 'review') importer.goToStep('upload');
            if (importer.currentStep === 'confirm') importer.goToStep('review');
        });
    }

    openCsvImportModal() {
        this.services.csvImporter.reset();
        this.renderImportStep('upload');
        this.elements.csvImportModal.classList.remove('hidden');
    }

    renderImportStep(step) {
        const content = this.elements.csvImportModal.querySelector('#csv-import-content');
        const nextBtn = this.elements.csvImportModal.querySelector('#csvNextBtn');
        const confirmBtn = this.elements.csvImportModal.querySelector('#csvConfirmBtn');
        const backBtn = this.elements.csvImportModal.querySelector('#csvBackBtn');

        switch(step) {
            case 'upload':
                content.innerHTML = `
                    <h4 class="text-lg font-semibold mb-4">Step 1: Upload File</h4>
                    <div class="space-y-4">
                        <div><label class="block text-sm font-medium mb-1">Select Account to Import Into:</label><select id="csvAccountSelect" class="w-full p-2 border rounded"></select></div>
                        <div><label class="block text-sm font-medium mb-1">Select CSV File:</label><input type="file" id="csvFileInput" accept=".csv" class="w-full p-2 border rounded"></div>
                        <div id="csv-loader" class="hidden">Loading...</div>
                    </div>`;
                const select = content.querySelector('#csvAccountSelect');
                this.app.accounts.forEach(acc => {
                    select.add(new Option(acc.name, acc.id));
                });
                nextBtn.classList.remove('hidden');
                confirmBtn.classList.add('hidden');
                backBtn.classList.add('hidden');
                break;
            case 'review':
                content.innerHTML = `
                    <h4 class="text-lg font-semibold mb-4">Step 2: Review Transactions</h4>
                    <div id="transactionPreview" class="max-h-[50vh] overflow-y-auto"></div>`;
                content.querySelector('#transactionPreview').innerHTML = this.services.csvImporter.renderTransactionsForReview();
                nextBtn.classList.remove('hidden');
                confirmBtn.classList.add('hidden');
                backBtn.classList.remove('hidden');
                break;
            case 'confirm':
                content.innerHTML = `
                    <h4 class="text-lg font-semibold mb-4">Step 3: Confirm Import</h4>
                    <div id="importSummary"></div>`;
                content.querySelector('#importSummary').innerHTML = this.services.csvImporter.getImportSummaryHTML();
                nextBtn.classList.add('hidden');
                confirmBtn.classList.remove('hidden');
                backBtn.classList.remove('hidden');
                break;
        }
    }

    showLoader(isLoading) {
        const loader = this.elements.csvImportModal.querySelector('#csv-loader');
        if (loader) loader.classList.toggle('hidden', !isLoading);
    }

    // ... other UIManager methods
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
                    <div><div class="text-2xl font-bold">${transactions.length}</div><div class="text-sm text-gray-600">Total Transactions</div></div>
                    <div><div class="text-2xl font-bold">${accounts.length}</div><div class="text-sm text-gray-600">Accounts</div></div>
                </div>
            </div>`;
    }

    renderTransactionList(transactions) {
        if (!transactions || transactions.length === 0) {
            this.elements.transactionsContainer.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">No transactions yet.</div>`;
            return;
        }
        const rows = transactions.map(t => this.createTransactionRow(t)).join('');
        this.elements.transactionsContainer.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow">
                <h2 class="text-xl font-bold mb-2">Recent Transactions</h2>
                <div class="space-y-1">${rows}</div>
            </div>`;
    }

    createTransactionRow(transaction) {
        const amountColor = transaction.amount < 0 ? 'text-red-600' : 'text-green-600';
        const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.amount);
        const categoryDisplay = transaction.category && transaction.category !== 'Uncategorized'
            ? `${sanitizeHTML(transaction.category)} / ${sanitizeHTML(transaction.subcategory)}`
            : 'Uncategorized';

        return `
            <div class="p-2 border-b hover:bg-gray-50 flex justify-between items-center">
                <div>
                    <p class="font-medium">${sanitizeHTML(transaction.description)}</p>
                    <p class="text-sm text-gray-500">${new Date(transaction.date + 'T00:00:00').toLocaleDateString()} | ${categoryDisplay}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="font-mono ${amountColor}">${formattedAmount}</span>
                    <button data-id="${transaction.id}" class="edit-btn text-gray-400 hover:text-blue-500" title="Edit Transaction">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg>
                    </button>
                </div>
            </div>`;
    }

    showNotification(message, type = 'info') {
        this.services.notificationManager.show(message, type);
    }
}
