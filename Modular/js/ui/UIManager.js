import { sanitizeHTML } from '../utils/Sanitizer.js';
import { MonthlyDashboard } from './MonthlyDashboard.js';
import { RecurringTemplates } from '../data/RecurringTemplates.js';
import { RentTracker } from '../analytics/RentTracker.js';

export class UIManager {
    constructor(services) {
        this.services = services;
        this.app = null;

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
            settingsModal: null,
        };

        this.monthlyDashboard = new MonthlyDashboard(services.dataService, services.categoryManager);
        this.recurringTemplates = new RecurringTemplates(services.dataService);
        this.rentTracker = new RentTracker(services.dataService, services.categoryManager);
    }

    init(appController) {
        this.app = appController;
        // Let sub-components render their containers
        this.services.enhancedTransactionUI.renderAddModal(this.elements.modalContainer);
        this.services.enhancedTransactionUI.renderEditPanel(this.elements.editorContainer);
        this.renderCsvImportModal();
        this.renderSettingsModal(); // Add settings modal to the DOM

        // Pass this UI manager to services that need to call back to it
        this.services.csvImporter?.setUIManager(this);
        this.services.settingsManager?.init(this);

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Main Header Buttons
        this.elements.headerButtons.querySelector('#importTransactionsBtn').addEventListener('click', () => this.openCsvImportModal());
        this.elements.headerButtons.querySelector('#addTransactionBtn').addEventListener('click', () => this.services.enhancedTransactionUI.openAddModal(this.app.accounts));

        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportTransactionsBtn';
        exportBtn.className = 'bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm';
        exportBtn.textContent = 'Export';
        this.elements.headerButtons.insertBefore(exportBtn, this.elements.headerButtons.querySelector('#addTransactionBtn').nextSibling);

        this.elements.headerButtons.querySelector('#exportTransactionsBtn').addEventListener('click', () => {
            this.app.exportTransactions();
        });

        this.elements.headerButtons.querySelector('#logoutBtn').addEventListener('click', () => this.services.authService.signOut());

        const aiCategorizeBtn = document.createElement('button');
        aiCategorizeBtn.id = 'aiCategorizeBtn';
        aiCategorizeBtn.className = 'bg-purple-600 text-white px-4 py-2 rounded-lg';
        aiCategorizeBtn.textContent = 'AI Categorize Uncategorized';
        this.elements.headerButtons.insertBefore(aiCategorizeBtn, this.elements.headerButtons.querySelector('#logoutBtn'));

        // Create and add the Settings button programmatically
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settingsBtn';
        settingsBtn.className = 'text-gray-600 hover:text-gray-800';
        settingsBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
        settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.elements.headerButtons.insertBefore(settingsBtn, this.elements.headerButtons.querySelector('#logoutBtn'));

        // Transaction list event delegation
        this.elements.transactionsContainer.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const transaction = this.app.transactions.find(t => t.id === editBtn.dataset.id);
                if (transaction) this.services.enhancedTransactionUI.openEditPanel(transaction);
            }

            const quickAddBtn = e.target.closest('.quick-add-recurring');
            if(quickAddBtn) {
                const templateId = quickAddBtn.dataset.id;
                this.recurringTemplates.quickAddTransaction(templateId).then(() => {
                    this.app.loadDataAndRender();
                    this.showNotification('Recurring transaction added.', 'success');
                });
            }
        });

        // Add handler for quick category changes
        this.elements.transactionsContainer.addEventListener('change', async (e) => {
            if (e.target.classList.contains('quick-category')) {
                const transactionId = e.target.dataset.id;
                const newCategory = e.target.value;

                if (newCategory && transactionId) {
                    try {
                        // Find the transaction
                        const transaction = this.app.transactions.find(t => t.id === transactionId);
                        if (!transaction) return;

                        // Update with new category
                        await this.app.dataService.updateTransaction(transactionId, {
                            category: newCategory,
                            entity: newCategory.includes('Real Estate') ? 'Real Estate' :
                                    newCategory.includes('Tech') ? 'Tech Business' : 'Personal'
                        });

                        // Reload
                        await this.app.loadDataAndRender();
                        this.showNotification('Category updated', 'success');
                    } catch (error) {
                        console.error('Failed to update category:', error);
                        this.showNotification('Failed to update category', 'error');
                    }
                }

                // Reset dropdown
                e.target.value = '';
            }
        });

        const quickActionsToggle = document.getElementById('quick-actions-toggle');
        const quickActionsMenu = document.getElementById('quick-actions-menu');
        if (quickActionsToggle && quickActionsMenu) {
            quickActionsToggle.addEventListener('click', () => {
                quickActionsMenu.classList.toggle('hidden');
                quickActionsMenu.classList.toggle('flex');
            });
        }

        const quickActionsToggle = document.getElementById('quick-actions-toggle');
        const quickActionsMenu = document.getElementById('quick-actions-menu');
        if (quickActionsToggle && quickActionsMenu) {
            quickActionsToggle.addEventListener('click', () => {
                quickActionsMenu.classList.toggle('hidden');
                quickActionsMenu.classList.toggle('flex');
            });
        }
    }

    // --- Settings Modal ---
    renderSettingsModal() {
        const modalHTML = `
            <div id="settingsModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="modal-backdrop fixed inset-0 bg-gray-900 bg-opacity-50"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
                        <div class="flex items-center justify-between p-4 border-b">
                            <h2 class="text-xl font-semibold">Settings</h2>
                            <button id="closeSettingsBtn" class="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div class="p-6">
                            <h3 class="text-lg font-semibold mb-4">API Configuration</h3>
                            <div class="space-y-2">
                                <label class="block text-sm font-medium">Gemini API Key</label>
                                <input type="password" id="geminiApiKeyInput" placeholder="Enter your Gemini API key" class="w-full p-2 border rounded">
                                <div class="flex space-x-2">
                                    <button id="saveApiKeyBtn" class="px-4 py-2 bg-blue-600 text-white rounded">Save Key</button>
                                    <button id="testApiKeyBtn" class="px-4 py-2 bg-green-600 text-white rounded">Test Key</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        this.elements.modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.elements.settingsModal = document.getElementById('settingsModal');
        this.addSettingsModalListeners();
    }

    addSettingsModalListeners() {
        const modal = this.elements.settingsModal;
        modal.querySelector('#closeSettingsBtn').addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('#saveApiKeyBtn').addEventListener('click', () => {
            const key = modal.querySelector('#geminiApiKeyInput').value;
            if (this.services.settingsManager.saveGeminiKey(key)) {
                modal.classList.add('hidden');
            }
        });
        modal.querySelector('#testApiKeyBtn').addEventListener('click', () => this.services.settingsManager.testGeminiKey());
    }

    openSettingsModal() {
        const key = this.services.settingsManager.geminiService.getApiKey();
        const input = this.elements.settingsModal.querySelector('#geminiApiKeyInput');
        input.value = key || '';
        this.elements.settingsModal.classList.remove('hidden');
    }

    // --- CSV Import Modal ---
    renderCsvImportModal() {
        const modalHTML = `
            <div id="csvImportModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
                        <div class="flex items-center justify-between p-4 border-b">
                            <h3 class="text-lg font-semibold">Import Transactions</h3>
                            <button id="closeCsvModalBtn" class="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div id="csv-import-content" class="p-6"></div>
                    </div>
                </div>
            </div>
        `;
        this.elements.modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.elements.csvImportModal = document.getElementById('csvImportModal');
        this.elements.csvImportModal.querySelector('#closeCsvModalBtn').addEventListener('click', () => {
            this.elements.csvImportModal.classList.add('hidden');
        });
    }

    openCsvImportModal() {
        this.renderImportStep();
        this.elements.csvImportModal.classList.remove('hidden');
    }

    renderImportStep() {
        const content = this.elements.csvImportModal.querySelector('#csv-import-content');
        content.innerHTML = `
            <h4 class="text-lg font-semibold mb-4">Import Transactions</h4>
            <div class="space-y-4">
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input type="file"
                           id="csvFileInput"
                           accept=".csv"
                           multiple
                           class="hidden">
                    <label for="csvFileInput" class="cursor-pointer">
                        <div class="text-gray-600">
                            <p class="text-lg mb-2">Drop CSV files here or click to browse</p>
                            <p class="text-sm">Supports multiple Chase CSV files</p>
                            <p class="text-xs mt-2">Account will be detected from filename</p>
                        </div>
                    </label>
                </div>
                <div id="file-list" class="space-y-2"></div>
            </div>`;

        const fileInput = content.querySelector('#csvFileInput');
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await this.processFile(file);
            }
        });

        const dropZone = content.querySelector('.border-dashed');

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('bg-blue-50', 'border-blue-400');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('bg-blue-50', 'border-blue-400');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-blue-50', 'border-blue-400');

            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv') || f.name.endsWith('.CSV'));

            for (const file of files) {
                await this.processFile(file);
            }
        });
    }

    async processFile(file) {
        const filename = file.name;
        const accountId = this.services.csvImporter.extractAccountFromFilename(filename);

        if (!accountId) {
            this.showNotification(`Cannot detect account from filename: ${filename}`, 'error');
            return;
        }

        // Show which account was detected
        this.showNotification(`Processing ${filename} for account ${accountId}`, 'info');

        try {
            const transactions = await this.services.csvImporter.parseCSV(file, accountId);
            this.showNotification(`Found ${transactions.length} transactions in ${filename}`, 'success');

            // Auto-categorize
            const categorized = await this.services.categoryManager.categorizeAll(transactions);

            // Save to database
            await this.services.dataService.saveTransactionBatch(categorized);

            // Refresh UI
            await this.app.loadDataAndRender();

        } catch (error) {
            this.showNotification(`Error processing ${filename}: ${error.message}`, 'error');
        }
    }

    showLoader(isLoading) {
        const loader = this.elements.csvImportModal.querySelector('#csv-loader');
        if (loader) loader.classList.toggle('hidden', !isLoading);
    }

    // --- Core UI Methods ---
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

    async renderDashboard(report) {
        // Use the new monthly dashboard instead
        await this.monthlyDashboard.render(this.elements.dashboardContainer);
    }

    quickAddRent() {
        console.log('Quick Add Rent clicked');
        // This would open a simplified modal for adding a rent payment
        this.showNotification('Quick Add Rent feature not fully implemented.', 'info');
    }

    quickAddExpense() {
        console.log('Quick Add Expense clicked');
        // This would open a simplified modal for adding an expense
        this.showNotification('Quick Add Expense feature not fully implemented.', 'info');
    }

    async checkRentStatus() {
        console.log('Check Rent Status clicked');
        const status = await this.rentTracker.checkCurrentMonthStatus();
        // This would display the status in a dedicated modal or view
        console.log('Rent Status:', status);
        this.showNotification(`Rent Collection: ${status.collectionRate}%`, 'info');
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

        // FIX: The check for "Uncategorized" should be on the subcategory, not the main category.
        const categoryDisplay = transaction.subcategory && transaction.subcategory !== 'Uncategorized'
            ? `${sanitizeHTML(transaction.category)} / ${sanitizeHTML(transaction.subcategory)}`
            : 'Uncategorized';

        return `
            <div class="p-2 border-b hover:bg-gray-50 flex justify-between items-center">
                <div>
                    <p class="font-medium">${sanitizeHTML(transaction.description)}</p>
                    <p class="text-sm text-gray-500">${new Date(transaction.date + 'T00:00:00').toLocaleDateString()} | ${categoryDisplay}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <select class="quick-category ml-2 text-sm" data-id="${transaction.id}">
                       <option value="">Change Category...</option>
                       <option value="Real Estate Income">Rent Income</option>
                       <option value="Personal Income">Lisa's Income</option>
                       <option value="Transfer">Transfer</option>
                       <option value="Mortgage">Mortgage</option>
                       <option value="Utilities">Utilities</option>
                    </select>
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
