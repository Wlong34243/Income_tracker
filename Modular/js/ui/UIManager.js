// js/ui/UIManager.js
import { sanitizeHTML } from '../utils/Sanitizer.js';

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

        // Components will be loaded in the init method
        this.monthlyDashboard = null;
        this.recurringTemplates = null;
        this.rentTracker = null;
    }

    async loadDashboardComponents() {
        try {
            const { MonthlyDashboard } = await import('./MonthlyDashboard.js');
            const { RecurringTemplates } = await import('../data/RecurringTemplates.js');
            const { RentTracker } = await import('../analytics/RentTracker.js');
            
            this.monthlyDashboard = new MonthlyDashboard(this.services.dataService, this.services.categoryManager);
            this.recurringTemplates = new RecurringTemplates(this.services.dataService);
            this.rentTracker = new RentTracker(this.services.dataService, this.services.categoryManager);
        } catch (error) {
            console.error('Critical Error: Dashboard components failed to load.', error);
            // We can decide to show an error to the user here
        }
    }

    async init(appController) {
        this.app = appController;
        
        // Await the loading of critical UI components
        await this.loadDashboardComponents();

        if (this.services.enhancedTransactionUI) {
            this.services.enhancedTransactionUI.renderAddModal(this.elements.modalContainer);
            this.services.enhancedTransactionUI.renderEditPanel(this.elements.editorContainer);
        }
        
        this.renderCsvImportModal();
        this.renderSettingsModal();

        if (this.services.csvImporter && typeof this.services.csvImporter.setUIManager === 'function') {
            this.services.csvImporter.setUIManager(this);
        }
        
        if (this.services.settingsManager && typeof this.services.settingsManager.init === 'function') {
            this.services.settingsManager.init(this);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Main Header Buttons - with null checks
        const importBtn = this.elements.headerButtons?.querySelector('#importTransactionsBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.openCsvImportModal());
        }

        const addBtn = this.elements.headerButtons?.querySelector('#addTransactionBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (this.services.enhancedTransactionUI) {
                    this.services.enhancedTransactionUI.openAddModal(this.app.accounts);
                } else {
                    this.showNotification('Add transaction feature loading...', 'info');
                }
            });
        }

        // Create and add export button
        if (this.elements.headerButtons && !document.getElementById('exportTransactionsBtn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'exportTransactionsBtn';
            exportBtn.className = 'bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm';
            exportBtn.textContent = 'Export';
            
            const nextElement = this.elements.headerButtons.querySelector('#addTransactionBtn')?.nextSibling;
            if (nextElement) {
                this.elements.headerButtons.insertBefore(exportBtn, nextElement);
            } else {
                this.elements.headerButtons.appendChild(exportBtn);
            }

            exportBtn.addEventListener('click', () => {
                if (this.app && typeof this.app.exportTransactions === 'function') {
                    this.app.exportTransactions();
                }
            });
        }

        const logoutBtn = this.elements.headerButtons?.querySelector('#logoutBtn');
        if (logoutBtn && this.services.authService) {
            logoutBtn.addEventListener('click', () => this.services.authService.signOut());
        }

        // --- ADDED BACK ---
        // Add AI Categorize button and its event listener
        if (this.elements.headerButtons && !document.getElementById('aiCategorizeBtn')) {
            const aiCategorizeBtn = document.createElement('button');
            aiCategorizeBtn.id = 'aiCategorizeBtn';
            aiCategorizeBtn.className = 'bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition';
            aiCategorizeBtn.textContent = 'AI Categorize';
            
            aiCategorizeBtn.addEventListener('click', async () => {
                if (this.app && typeof this.app.runAiCategorization === 'function') {
                    aiCategorizeBtn.disabled = true;
                    aiCategorizeBtn.textContent = 'Categorizing...';
                    try {
                        const count = await this.app.runAiCategorization();
                        if (count > 0) {
                            this.showNotification(`Successfully categorized ${count} transactions.`, 'success');
                            await this.app.loadDataAndRender();
                        }
                    } catch (error) {
                        this.showNotification('An error occurred during AI categorization.', 'error');
                        console.error("AI categorization failed:", error);
                    } finally {
                        aiCategorizeBtn.disabled = false;
                        aiCategorizeBtn.textContent = 'AI Categorize';
                    }
                }
            });

            const logoutBtnRef = this.elements.headerButtons.querySelector('#logoutBtn');
            if (logoutBtnRef) {
                this.elements.headerButtons.insertBefore(aiCategorizeBtn, logoutBtnRef);
            } else {
                this.elements.headerButtons.appendChild(aiCategorizeBtn);
            }
        }
        // --- END ADDED BACK ---

        // Add Settings button
        if (this.elements.headerButtons && !document.getElementById('settingsBtn')) {
            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'settingsBtn';
            settingsBtn.className = 'text-gray-600 hover:text-gray-800';
            settingsBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
            
            const logoutBtnRef = this.elements.headerButtons.querySelector('#logoutBtn');
            if (logoutBtnRef) {
                this.elements.headerButtons.insertBefore(settingsBtn, logoutBtnRef);
            } else {
                this.elements.headerButtons.appendChild(settingsBtn);
            }
        }

        // Transaction list event delegation
        if (this.elements.transactionsContainer) {
            this.elements.transactionsContainer.addEventListener('click', e => {
                const editBtn = e.target.closest('.edit-btn');
                if (editBtn && this.app && this.app.transactions) {
                    const transaction = this.app.transactions.find(t => t.id === editBtn.dataset.id);
                    if (transaction && this.services.enhancedTransactionUI) {
                        this.services.enhancedTransactionUI.openEditPanel(transaction);
                    }
                }
            });

            // Add handler for quick category changes
            this.elements.transactionsContainer.addEventListener('change', async (e) => {
                if (e.target.classList.contains('quick-category')) {
                    const transactionId = e.target.dataset.id;
                    const newCategory = e.target.value;

                    if (newCategory && transactionId && this.app && this.app.transactions && this.app.dataService) {
                        try {
                            const transaction = this.app.transactions.find(t => t.id === transactionId);
                            if (!transaction) return;

                            await this.app.dataService.updateTransaction(transactionId, {
                                category: newCategory,
                                entity: newCategory.includes('Real Estate') ? 'Real Estate' :
                                        newCategory.includes('Tech') ? 'Tech Business' : 'Personal'
                            });

                            await this.app.loadDataAndRender();
                            this.showNotification('Category updated', 'success');
                        } catch (error) {
                            console.error('Failed to update category:', error);
                            this.showNotification('Failed to update category', 'error');
                        }
                    }
                    e.target.value = '';
                }
            });
        }

        // Quick Actions Toggle
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
                            <button id="closeSettingsBtn" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
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
        if (!modal) return;
        
        modal.querySelector('#closeSettingsBtn')?.addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('#saveApiKeyBtn')?.addEventListener('click', () => {
            const key = modal.querySelector('#geminiApiKeyInput').value;
            if (this.services.settingsManager && this.services.settingsManager.saveGeminiKey(key)) {
                modal.classList.add('hidden');
            }
        });
        modal.querySelector('#testApiKeyBtn')?.addEventListener('click', () => {
            if (this.services.settingsManager) {
                this.services.settingsManager.testGeminiKey();
            }
        });
    }

    openSettingsModal() {
        if (!this.elements.settingsModal) return;
        const key = this.services.settingsManager?.geminiService?.getApiKey?.() || '';
        const input = this.elements.settingsModal.querySelector('#geminiApiKeyInput');
        if (input) input.value = key;
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
                            <button id="closeCsvModalBtn" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <div id="csv-import-content" class="p-6"></div>
                    </div>
                </div>
            </div>
        `;
        this.elements.modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.elements.csvImportModal = document.getElementById('csvImportModal');
        this.elements.csvImportModal.querySelector('#closeCsvModalBtn')?.addEventListener('click', () => {
            this.elements.csvImportModal.classList.add('hidden');
        });
    }

    openCsvImportModal() {
        this.renderImportStep();
        this.elements.csvImportModal?.classList.remove('hidden');
    }

    renderImportStep() {
        const content = this.elements.csvImportModal?.querySelector('#csv-import-content');
        if (!content) return;
        
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
        fileInput?.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await this.processFile(file);
            }
        });

        const dropZone = content.querySelector('.border-dashed');
        if (!dropZone) return;

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
        if (!this.services.csvImporter) {
            this.showNotification('CSV import feature not available', 'error');
            return;
        }

        const filename = file.name;
        const accountId = this.services.csvImporter.extractAccountFromFilename(filename);

        if (!accountId) {
            this.showNotification(`Cannot detect account from filename: ${filename}`, 'error');
            return;
        }

        this.showNotification(`Processing ${filename} for account ${accountId}`, 'info');

        try {
            const transactions = await this.services.csvImporter.parseCSV(file, accountId);
            this.showNotification(`Found ${transactions.length} transactions in ${filename}`, 'success');

            if (this.services.categoryManager) {
                const categorized = await this.services.categoryManager.categorizeAll(transactions);
                await this.services.dataService.saveTransactionBatch(categorized);
            } else {
                await this.services.dataService.saveTransactionBatch(transactions);
            }

            await this.app.loadDataAndRender();
        } catch (error) {
            this.showNotification(`Error processing ${filename}: ${error.message}`, 'error');
        }
    }

    // --- Core UI Methods ---
    showMainApp(user) {
        this.elements.mainApp?.classList.remove('hidden');
        this.elements.authContainer?.classList.add('hidden');
        if (this.elements.userInfo) {
            this.elements.userInfo.textContent = user.email || 'No email';
        }
    }

    showAuth() {
        this.elements.mainApp?.classList.add('hidden');
        this.elements.authContainer?.classList.remove('hidden');
        this.services.authService?.renderAuthUI(this.elements.authContainer);
    }

    async renderDashboard(report) {
        if (this.monthlyDashboard) {
            await this.monthlyDashboard.render(this.elements.dashboardContainer);
        } else {
            // Fallback to simple dashboard
            this.renderSimpleDashboard(report);
        }
    }

    renderSimpleDashboard(report) {
        if (!this.elements.dashboardContainer) return;
        
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        };

        this.elements.dashboardContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h4 class="text-sm text-gray-600 mb-2">Total Income</h4>
                    <p class="text-2xl font-bold text-green-600">${formatCurrency(report?.totalIncome || 0)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h4 class="text-sm text-gray-600 mb-2">Total Expenses</h4>
                    <p class="text-2xl font-bold text-red-600">${formatCurrency(report?.totalExpenses || 0)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h4 class="text-sm text-gray-600 mb-2">Net</h4>
                    <p class="text-2xl font-bold ${(report?.totalIncome || 0) - Math.abs(report?.totalExpenses || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${formatCurrency((report?.totalIncome || 0) - Math.abs(report?.totalExpenses || 0))}
                    </p>
                </div>
            </div>
        `;
    }

    renderTransactionList(transactions) {
        if (!this.elements.transactionsContainer) return;
        
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

        const categoryDisplay = transaction.subcategory && transaction.subcategory !== 'Uncategorized'
            ? `${sanitizeHTML(transaction.category)} / ${sanitizeHTML(transaction.subcategory)}`
            : transaction.category || 'Uncategorized';

        return `
            <div class="p-2 border-b hover:bg-gray-50 flex justify-between items-center">
                <div>
                    <p class="font-medium">${sanitizeHTML(transaction.description)}</p>
                    <p class="text-sm text-gray-500">${new Date(transaction.date + 'T00:00:00').toLocaleDateString()} | ${categoryDisplay}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <select class="quick-category ml-2 text-sm border rounded px-2 py-1" data-id="${transaction.id}">
                       <option value="">Change Category...</option>
                       <option value="Real Estate Income">Rent Income</option>
                       <option value="Personal Income">Lisa's Income</option>
                       <option value="Transfer">Transfer</option>
                       <option value="Mortgage">Mortgage</option>
                       <option value="Utilities">Utilities</option>
                    </select>
                    <span class="font-mono ${amountColor}">${formattedAmount}</span>
                    <button data-id="${transaction.id}" class="edit-btn text-gray-400 hover:text-blue-500" title="Edit Transaction">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                </div>
            </div>`;
    }

    showNotification(message, type = 'info') {
        if (this.services.notificationManager) {
            this.services.notificationManager.show(message, type);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Quick action methods
    quickAddRent() {
        console.log('Quick Add Rent clicked');
        this.showNotification('Quick Add Rent feature coming soon', 'info');
    }

    quickAddExpense() {
        console.log('Quick Add Expense clicked');
        this.showNotification('Quick Add Expense feature coming soon', 'info');
    }

    async checkRentStatus() {
        console.log('Check Rent Status clicked');
        if (this.rentTracker) {
            const status = await this.rentTracker.checkCurrentMonthStatus();
            console.log('Rent Status:', status);
            this.showNotification(`Rent Collection: ${status.collectionRate}%`, 'info');
        } else {
            this.showNotification('Rent tracker not available', 'warning');
        }
    }
}
