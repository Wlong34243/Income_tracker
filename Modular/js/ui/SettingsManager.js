// js/ui/SettingsManager.js
// Settings page for API key management and app configuration

import { GeminiService } from '../ai/GeminiService.js';
import { AppConfig } from '../config/AppConfig.js';

export class SettingsManager {
    constructor(geminiService) {
        if (!geminiService) {
            throw new Error("GeminiService instance is required.");
        }
        this.geminiService = geminiService;
        this.initializeUI();
    }

    initializeUI() {    // First, check if modal already exists and remove it
    const existingModal = document.getElementById('settingsModal');
    if (existingModal) {
        existingModal.remove();
    }
        // Create settings modal with UNIQUE IDs
    const modalHtml = `
        <div id="settingsModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
            <div class="modal-backdrop fixed inset-0 bg-gray-900 bg-opacity-50"></div>
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <!-- Header -->
                    <div class="bg-gray-800 text-white p-4">
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-semibold">Settings</h2>
                            <button onclick="window.financeApp.settingsManager.close()" class="text-white hover:text-gray-300">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>                                        <!-- Content -->
                    <div class="flex h-[calc(90vh-8rem)]">
                        <!-- Sidebar -->
                        <div class="w-64 bg-gray-50 p-4 border-r">
                            <button onclick="window.financeApp.settingsManager.showSection('api-keys')"
                                     class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 settings-section-btn active">
                                API Keys
                            </button>
                            <button onclick="window.financeApp.settingsManager.showSection('import-export')"
                                     class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 settings-section-btn">
                                Import/Export
                            </button>
                        </div>                                                <!-- Main Content -->
                        <div class="flex-1 overflow-y-auto">
                            <!-- API Keys Section -->
                            <div id="apiKeysSection" class="p-6 settings-content">
                                <h3 class="text-lg font-semibold mb-4">API Configuration</h3>                                                                <div class="bg-white border rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 class="font-medium">Gemini AI</h4>
                                            <p class="text-sm text-gray-600">AI-powered transaction categorization</p>
                                        </div>
                                        <div id="geminiStatus"></div>
                                    </div>                                                                        <div class="space-y-3">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                                            <div class="flex space-x-2">
                                                <!-- SINGLE geminiApiKey input with UNIQUE ID -->
                                                <input type="password"
                                                        id="geminiApiKeyInput"
                                                       placeholder="Enter your Gemini API key"
                                                       class="flex-1 px-3 py-2 border border-gray-300 rounded-md">
                                                <button onclick="window.financeApp.settingsManager.toggleApiKeyVisibility('geminiApiKeyInput')"
                                                        class="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                                                    👁️
                                                </button>
                                            </div>
                                        </div>                                                                                <div class="flex space-x-2">
                                            <button onclick="window.financeApp.settingsManager.saveGeminiKey()"
                                                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                                Save Key
                                            </button>
                                            <button onclick="window.financeApp.settingsManager.testGeminiKey()"
                                                    class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                                Test Connection
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>                                                        <!-- Import/Export Section -->
                            <div id="importExportSection" class="hidden p-6 settings-content">
                                <h3 class="text-lg font-semibold mb-4">Data Management</h3>                                                                <div class="space-y-6">
                                    <div>
                                        <h4 class="font-medium mb-3">Clear All Data</h4>
                                        <p class="text-sm text-gray-600 mb-3">Remove all transactions and reset accounts</p>
                                        <button onclick="window.financeApp.settingsManager.clearAllData()"
                                                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                                            Clear All Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
}

    open() {
        // Auto-configure the API key if not already set
        const existingApiKey = this.geminiService.getApiKey();
        if (!existingApiKey) {
            const defaultKey = 'AIzaSyA4lwOuimRwUXtSbChOmkkSa2zGv4RzrUI';
            this.geminiService.setApiKey(defaultKey);
            console.log('Gemini API key has been auto-configured.');
        }

        document.getElementById('settingsModal').classList.remove('hidden');
        this.loadApiKeys();
        this.loadAccounts();
        this.loadCategories();
    }

    close() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.settings-content').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.settings-section-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-gray-200');
        });
        
        // Show selected section
        const sectionMap = {
            'api-keys': 'apiKeysSection',
            'accounts': 'accountsSection',
            'categories': 'categoriesSection',
            'import-export': 'importExportSection'
        };
        
        const sectionId = sectionMap[section];
        if (sectionId) {
            document.getElementById(sectionId).classList.remove('hidden');
        }
        
        // Add active class to clicked button
        if (event && event.target) {
            const button = event.target.closest('button');
            if (button) {
                button.classList.add('active', 'bg-gray-200');
            }
        }
    }

    loadApiKeys() {
        const apiKey = this.geminiService.getApiKey();
        const keyInput = document.getElementById('geminiApiKeyInput'); // Changed from 'geminiApiKey'
        const statusDiv = document.getElementById('geminiStatus');
            if (apiKey) {
            if (keyInput) keyInput.value = this.maskApiKey(apiKey);
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                    </span>
                `;
            }
        } else {
            if (keyInput) keyInput.value = '';
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Configured
                    </span>
                `;
            }
        }
    }

    maskApiKey(key) {
        if (!key) return '';
        const visibleChars = 4;
        return key.substring(0, visibleChars) + '•'.repeat(Math.max(0, key.length - visibleChars * 2)) + key.substring(key.length - visibleChars);
    }

    toggleApiKeyVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

    saveGeminiKey() {
        const keyInput = document.getElementById('geminiApiKeyInput'); // Changed from 'geminiApiKey'
        if (!keyInput) {
            console.error('Could not find API key input field');
            return;
        }
            const key = keyInput.value.trim();
            if (!key) {
            this.showNotification('Please enter an API key', 'error');
            return;
        }
        // Don't save if it's the masked version
        if (key.includes('•')) {
            this.showNotification('Please enter the full API key', 'error');
            return;
        }
        this.geminiService.setApiKey(key);
        this.loadApiKeys();
        this.showNotification('API key saved successfully', 'success');
    }

    async testGeminiKey() {
        const keyInput = document.getElementById('geminiApiKeyInput'); // Changed from 'geminiApiKey'
        const apiKey = keyInput ? keyInput.value : this.geminiService.getApiKey();
            if (!apiKey || apiKey.includes('•')) {
            this.showNotification('Please enter a valid API key first', 'error');
            return;
        }
        this.showNotification('Testing API connection...', 'info');
        try {
            // Use gemini-1.5-flash model (free tier)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Categorize this transaction: 'ZELLE payment from tenant' as 'Real Estate Income', 'Tech Income', or 'Other'. Reply with just the category name."
                        }]
                    }]
                })
            });
            if (response.ok) {
                const data = await response.json();
                const result = data.candidates[0].content.parts[0].text;
                this.geminiService.setApiKey(apiKey);
                this.showNotification(`✅ API connected successfully! Test result: ${result}`, 'success');
                this.loadApiKeys();
            } else {
                const error = await response.json();
                this.showNotification(`API test failed: ${error.error.message}`, 'error');
                console.error('API test failed:', error);
            }
        } catch (error) {
            this.showNotification('Connection test failed: ' + error.message, 'error');
            console.error('Connection test error:', error);
        }
    }

    removeGeminiKey() {
        if (confirm('Are you sure you want to remove the API key?')) {
            localStorage.removeItem('gemini_api_key');
            this.geminiService.apiKey = null;
            this.loadApiKeys();
            this.showNotification('API key removed', 'info');
        }
    }

    loadAccounts() {
        const accountsList = document.getElementById('accountsList');
        if (!accountsList) return;
        
        const accounts = Object.entries(AppConfig.ACCOUNT_MAPPING || {});
        
        accountsList.innerHTML = accounts.map(([id, data]) => `
            <div class="bg-white border rounded-lg p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium">${data.name}</h4>
                        <p class="text-sm text-gray-600">
                            ID: ${id} • Type: ${data.type} • Entity: ${data.entity}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">${data.description}</p>
                    </div>
                    <button onclick="settingsManager.editAccount('${id}')"
                            class="text-blue-600 hover:text-blue-800">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadCategories() {
        const incomeList = document.getElementById('incomeCategoriesList');
        const expenseList = document.getElementById('expenseCategoriesList');
        
        if (incomeList && AppConfig.INCOME_CATEGORIES) {
            incomeList.innerHTML = AppConfig.INCOME_CATEGORIES.map(cat => `
                <div class="flex justify-between items-center p-2 bg-white border rounded">
                    <span>${cat}</span>
                    <button onclick="settingsManager.removeCategory('income', '${cat}')"
                            class="text-red-600 hover:text-red-800">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `).join('');
        }
        
        if (expenseList && AppConfig.EXPENSE_CATEGORIES) {
            expenseList.innerHTML = AppConfig.EXPENSE_CATEGORIES.map(cat => `
                <div class="flex justify-between items-center p-2 bg-white border rounded">
                    <span>${cat}</span>
                    <button onclick="settingsManager.removeCategory('expense', '${cat}')"
                            class="text-red-600 hover:text-red-800">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `).join('');
        }
    }

    async exportData() {
        this.showNotification('Preparing export...', 'info');
        
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                settings: {
                    accounts: AppConfig.ACCOUNT_MAPPING,
                    categories: {
                        income: AppConfig.INCOME_CATEGORIES,
                        expense: AppConfig.EXPENSE_CATEGORIES
                    },
                    properties: AppConfig.PROPERTY_MAPPINGS
                },
                customRules: localStorage.getItem('customTransactionPatterns') || '[]',
                transactions: []
            };
            
            // Get transactions if dataService is available
            if (window.financeApp && window.financeApp.dataService) {
                exportData.transactions = await window.financeApp.dataService.loadTransactions();
            }
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    async importData() {
        const fileInput = document.getElementById('importFile');
        if (!fileInput) return;
        
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a file to import', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.version || !data.settings) {
                    throw new Error('Invalid backup file format');
                }
                
                if (confirm('This will replace your current data. Continue?')) {
                    // Import custom rules
                    if (data.customRules) {
                        localStorage.setItem('customTransactionPatterns', data.customRules);
                    }
                    
                    // Import transactions if dataService is available
                    if (data.transactions && window.financeApp && window.financeApp.dataService) {
                        for (const txn of data.transactions) {
                            await window.financeApp.dataService.saveTransaction(txn);
                        }
                    }
                    
                    this.showNotification('Data imported successfully. Please refresh the page.', 'success');
                    
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }
            } catch (error) {
                this.showNotification('Import failed: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    }

    async clearAllData() {
        // First confirmation
        if (!confirm('⚠️ WARNING: This will permanently delete ALL data including:\n\n• All transactions\n• All accounts\n• All settings\n\nAre you sure?')) {
            return;
        }
            // Second confirmation
        const userConfirm = prompt('Type "DELETE" to confirm you want to clear all data:');
        if (userConfirm !== 'DELETE') {
            this.showNotification('Clear data cancelled', 'info');
            return;
        }
            try {
            this.showNotification('Clearing all data...', 'info');
                    // Clear all localStorage items
            const keysToRemove = [
                'demo-transactions',
                'demo-accounts',
                'demo-rules',
                'demo-categories',
                'gemini_api_key',
                'transactions',
                'accounts',
                'settings'
            ];
                    keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`Removed localStorage key: ${key}`);
            });
                    // Reset to default accounts
            const defaultAccounts = Object.entries(AppConfig.ACCOUNT_MAPPING).map(([id, data]) => ({
                id: id,
                name: data.name,
                type: data.type,
                entity: data.entity,
                balance: 0
            }));
                    localStorage.setItem('demo-accounts', JSON.stringify(defaultAccounts));
            console.log('Reset to default accounts:', defaultAccounts);
                    this.showNotification('All data cleared successfully!', 'success');
                    // Close the modal
            this.close();
                    // Reload the page to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 1500);
                } catch (error) {
            console.error('Error clearing data:', error);
            this.showNotification('Failed to clear data: ' + error.message, 'error');
        }
    }

    addAccount() {
        this.showNotification('Account addition coming soon', 'info');
    }

    editAccount(accountId) {
        this.showNotification('Account editing coming soon', 'info');
    }

    removeCategory(type, category) {
        this.showNotification('Category removal coming soon', 'info');
    }

    showNotification(message, type) {
        // Use global notification manager if available
        if (window.notificationManager) {
            window.notificationManager.show(message, type);
        } else if (window.financeApp && window.financeApp.showNotification) {
            window.financeApp.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// The class is exported, to be instantiated in the main application.
