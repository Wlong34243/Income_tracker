// js/Rules/RulesManager.js

import { TransactionRules } from '../Rules/TransactionRules.js';
import { DataService } from '../data/DataService.js';

export class RulesManager {
    constructor(transactionRules) {
        if (!transactionRules) {
            throw new Error("TransactionRules instance is required.");
        }
        this.transactionRules = transactionRules;
        this.initializeUI();
    }

    initializeUI() {
        // Add rules manager button to settings or menu
        const rulesButtonHtml = `
            <button id="rulesManagerBtn" onclick="window.financeApp.rulesManager.open()"
                    class="text-purple-600 hover:text-purple-800 text-sm font-medium">
                Manage Rules
            </button>
        `;
        
        // You can add this button to your settings menu or navigation
        
        // Create rules manager modal
        this.createRulesModal();
    }

    createRulesModal() {
        const modalHtml = `
            <div id="rulesModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="modal-backdrop fixed inset-0"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div class="bg-purple-600 text-white p-4">
                            <div class="flex items-center justify-between">
                                <h2 class="text-xl font-semibold">Transaction Rules Manager</h2>
                                <button onclick="window.financeApp.rulesManager.close()" class="text-white hover:text-gray-200">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="flex h-[calc(90vh-8rem)]">
                            <!-- Sidebar -->
                            <div class="w-64 bg-gray-50 p-4 border-r overflow-y-auto">
                                <button onclick="window.financeApp.rulesManager.showSection('overview')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 rule-section-btn active">
                                    Overview
                                </button>
                                <button onclick="window.financeApp.rulesManager.showSection('custom')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 rule-section-btn">
                                    Custom Rules
                                </button>
                                <button onclick="window.financeApp.rulesManager.showSection('create')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 rule-section-btn">
                                    Create Rule
                                </button>
                                <button onclick="window.financeApp.rulesManager.showSection('test')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 rule-section-btn">
                                    Test Rules
                                </button>
                                <button onclick="window.financeApp.rulesManager.showSection('import-export')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 rule-section-btn">
                                    Import/Export
                                </button>
                            </div>
                            
                            <!-- Content -->
                            <div class="flex-1 overflow-y-auto">
                                <!-- Overview Section -->
                                <div id="rulesOverview" class="p-6 rule-section">
                                    <h3 class="text-lg font-semibold mb-4">Rules Overview</h3>
                                    
                                    <div class="grid grid-cols-3 gap-4 mb-6">
                                        <div class="bg-blue-50 p-4 rounded-lg">
                                            <p class="text-sm text-blue-600">Built-in Rules</p>
                                            <p class="text-2xl font-bold text-blue-800">${this.transactionRules.rules.length}</p>
                                        </div>
                                        <div class="bg-purple-50 p-4 rounded-lg">
                                            <p class="text-sm text-purple-600">Custom Rules</p>
                                            <p class="text-2xl font-bold text-purple-800" id="customRuleCount">0</p>
                                        </div>
                                        <div class="bg-green-50 p-4 rounded-lg">
                                            <p class="text-sm text-green-600">Rules Applied</p>
                                            <p class="text-2xl font-bold text-green-800" id="rulesAppliedCount">0</p>
                                        </div>
                                    </div>
                                    
                                    <h4 class="font-medium mb-3">Built-in Rules by Category</h4>
                                    <div id="builtInRulesList" class="space-y-2">
                                        <!-- Rules will be populated here -->
                                    </div>
                                </div>
                                
                                <!-- Custom Rules Section -->
                                <div id="rulesCustom" class="p-6 rule-section hidden">
                                    <h3 class="text-lg font-semibold mb-4">Custom Rules</h3>
                                    <div id="customRulesList" class="space-y-3">
                                        <!-- Custom rules will be populated here -->
                                    </div>
                                </div>
                                
                                <!-- Create Rule Section -->
                                <div id="rulesCreate" class="p-6 rule-section hidden">
                                    <h3 class="text-lg font-semibold mb-4">Create Custom Rule</h3>
                                    <form id="createRuleForm" class="space-y-4 max-w-2xl">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                                            <input type="text" id="ruleName" required
                                                   placeholder="e.g., Monthly Gym Membership"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
                                            <input type="text" id="ruleKeywords" required
                                                   placeholder="e.g., planet fitness, gym"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                        </div>
                                        
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                                <select id="ruleCategory" required
                                                        class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                    <option value="">Select Category</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Account (Optional)</label>
                                                <select id="ruleAccount"
                                                        class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                    <option value="">Any Account</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Min Amount (Optional)</label>
                                                <input type="number" id="ruleAmountMin" step="0.01"
                                                       placeholder="-50.00"
                                                       class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                            </div>
                                            
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Max Amount (Optional)</label>
                                                <input type="number" id="ruleAmountMax" step="0.01"
                                                       placeholder="-45.00"
                                                       class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Property (Optional)</label>
                                            <select id="ruleProperty"
                                                    class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                <option value="">No Property</option>
                                            </select>
                                        </div>
                                        
                                        <div class="flex justify-end space-x-3 pt-4">
                                            <button type="button" onclick="window.financeApp.rulesManager.clearForm()"
                                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                                Clear
                                            </button>
                                            <button type="submit"
                                                    class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">
                                                Create Rule
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                
                                <!-- Test Rules Section -->
                                <div id="rulesTest" class="p-6 rule-section hidden">
                                    <h3 class="text-lg font-semibold mb-4">Test Rules</h3>
                                    <p class="text-sm text-gray-600 mb-4">Enter transaction details to see which rule would apply</p>
                                    
                                    <div class="space-y-4 max-w-2xl">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <input type="text" id="testDescription"
                                                   placeholder="e.g., ALLSTATE INSURANCE"
                                                   class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                        </div>
                                        
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                                <input type="number" id="testAmount" step="0.01"
                                                       placeholder="-350.00"
                                                       class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                            </div>
                                            
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Account</label>
                                                <select id="testAccount"
                                                        class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                    <option value="">Select Account</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <button onclick="window.financeApp.rulesManager.testRules()"
                                                class="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700">
                                            Test Rules
                                        </button>
                                        
                                        <div id="testResults" class="mt-6 hidden">
                                            <!-- Test results will appear here -->
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Import/Export Section -->
                                <div id="rulesImportExport" class="p-6 rule-section hidden">
                                    <h3 class="text-lg font-semibold mb-4">Import/Export Rules</h3>
                                    
                                    <div class="space-y-6">
                                        <div>
                                            <h4 class="font-medium mb-3">Export Custom Rules</h4>
                                            <p class="text-sm text-gray-600 mb-3">Download your custom rules for backup or sharing</p>
                                            <button onclick="window.financeApp.rulesManager.exportRules()"
                                                    class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                                Export Rules
                                            </button>
                                        </div>
                                        
                                        <div>
                                            <h4 class="font-medium mb-3">Import Custom Rules</h4>
                                            <p class="text-sm text-gray-600 mb-3">Import rules from a backup file</p>
                                            <input type="file" id="importFile" accept=".json" class="mb-3">
                                            <button onclick="window.financeApp.rulesManager.importRules()"
                                                    class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                                                Import Rules
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
        
        // Attach event listeners
        document.getElementById('createRuleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRule();
        });
    }

    open() {
        document.getElementById('rulesModal').classList.remove('hidden');
        this.loadOverview();
        this.populateDropdowns();
    }

    close() {
        document.getElementById('rulesModal').classList.add('hidden');
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.rule-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.rule-section-btn').forEach(el => el.classList.remove('active'));
        
        // Show selected section
        document.getElementById(`rules${section.charAt(0).toUpperCase() + section.slice(1).replace('-', '')}`).classList.remove('hidden');
        event.target.classList.add('active');
        
        // Load section data
        switch(section) {
            case 'overview':
                this.loadOverview();
                break;
            case 'custom':
                this.loadCustomRules();
                break;
            case 'test':
                this.setupTestSection();
                break;
        }
    }

    loadOverview() {
        // Update counts
        document.getElementById('customRuleCount').textContent = this.transactionRules.customPatterns.length;
        
        // Load statistics from localStorage or geminiService
        const stats = JSON.parse(localStorage.getItem('ruleStatistics') || '{}');
        document.getElementById('rulesAppliedCount').textContent = stats.totalApplied || 0;
        
        // Display built-in rules
        const rulesHtml = this.transactionRules.rules.map(rule => `
            <div class="bg-gray-50 p-3 rounded">
                <div class="flex justify-between items-center">
                    <span class="font-medium">${rule.name}</span>
                    <span class="text-sm text-gray-500">Priority: ${rule.priority}</span>
                </div>
            </div>
        `).join('');
        
        document.getElementById('builtInRulesList').innerHTML = rulesHtml;
    }

    loadCustomRules() {
        const customRules = this.transactionRules.customPatterns;
        
        if (customRules.length === 0) {
            document.getElementById('customRulesList').innerHTML = 
                '<p class="text-gray-500">No custom rules created yet.</p>';
            return;
        }
        
        const rulesHtml = customRules.map(rule => `
            <div class="bg-white border rounded-lg p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium">${rule.name}</h4>
                        <p class="text-sm text-gray-600 mt-1">
                            Keywords: ${rule.keywords.join(', ')}<br>
                            Category: ${rule.category}
                            ${rule.property ? `<br>Property: ${rule.property}` : ''}
                            ${rule.account ? `<br>Account: ${rule.account}` : ''}
                        </p>
                    </div>
                    <button onclick="window.financeApp.rulesManager.deleteRule('${rule.id}')"
                            class="text-red-600 hover:text-red-800">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('customRulesList').innerHTML = rulesHtml;
    }

    populateDropdowns() {
        // Populate category dropdowns
        const categories = [...AppConfig.INCOME_CATEGORIES, ...AppConfig.EXPENSE_CATEGORIES];
        const categorySelects = ['ruleCategory'];
        
        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Category</option>' +
                    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            }
        });
        
        // Populate account dropdowns
        const accountSelects = ['ruleAccount', 'testAccount'];
        accountSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const defaultOption = selectId === 'ruleAccount' ? 
                    '<option value="">Any Account</option>' : 
                    '<option value="">Select Account</option>';
                    
                select.innerHTML = defaultOption +
                    Object.entries(AppConfig.ACCOUNTS).map(([id, name]) => 
                        `<option value="${id}">${id} - ${name}</option>`
                    ).join('');
            }
        });
        
        // Populate property dropdown
        const propertySelect = document.getElementById('ruleProperty');
        if (propertySelect) {
            propertySelect.innerHTML = '<option value="">No Property</option>' +
                Object.keys(AppConfig.PROPERTY_MAPPINGS).map(prop => 
                    `<option value="${prop}">${prop}</option>`
                ).join('');
        }
    }

    createRule() {
        const rule = {
            name: document.getElementById('ruleName').value,
            keywords: document.getElementById('ruleKeywords').value.split(',').map(k => k.trim()),
            category: document.getElementById('ruleCategory').value,
            account: document.getElementById('ruleAccount').value || undefined,
            amountMin: parseFloat(document.getElementById('ruleAmountMin').value) || undefined,
            amountMax: parseFloat(document.getElementById('ruleAmountMax').value) || undefined,
            property: document.getElementById('ruleProperty').value || undefined,
            entity: this.determineEntity(document.getElementById('ruleAccount').value)
        };
        
        this.transactionRules.addCustomPattern(rule);
        
        this.showNotification('Rule created successfully!', 'success');
        this.clearForm();
        this.loadOverview();
    }

    clearForm() {
        document.getElementById('createRuleForm').reset();
    }

    deleteRule(ruleId) {
        if (confirm('Are you sure you want to delete this rule?')) {
            this.transactionRules.customPatterns = this.transactionRules.customPatterns.filter(r => r.id !== ruleId);
            this.transactionRules.saveCustomPatterns();
            this.loadCustomRules();
            this.showNotification('Rule deleted', 'info');
        }
    }

    setupTestSection() {
        this.populateDropdowns();
    }

    testRules() {
        const testTransaction = {
            description: document.getElementById('testDescription').value,
            amount: parseFloat(document.getElementById('testAmount').value) || 0,
            account: document.getElementById('testAccount').value,
            date: new Date().toISOString().split('T')[0]
        };
        
        const result = this.transactionRules.applyRules(testTransaction);
        
        const resultsDiv = document.getElementById('testResults');
        resultsDiv.classList.remove('hidden');
        
        if (result) {
            resultsDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 class="font-medium text-green-800 mb-2">Rule Match Found!</h4>
                    <p class="text-sm text-green-700">
                        <strong>Rule:</strong> ${result.ruleApplied || result.source}<br>
                        <strong>Category:</strong> ${result.category}<br>
                        ${result.property ? `<strong>Property:</strong> ${result.property}<br>` : ''}
                        <strong>Entity:</strong> ${result.entity}<br>
                        <strong>Confidence:</strong> ${(result.confidence * 100).toFixed(0)}%<br>
                        <strong>Reasoning:</strong> ${result.reasoning}
                    </p>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 class="font-medium text-yellow-800 mb-2">No Rule Match</h4>
                    <p class="text-sm text-yellow-700">
                        No rules matched this transaction. It would be sent to AI categorization or use the fallback.
                    </p>
                </div>
            `;
        }
    }

    exportRules() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            customRules: this.transactionRules.customPatterns,
            statistics: JSON.parse(localStorage.getItem('ruleStatistics') || '{}')
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction-rules-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Rules exported successfully', 'success');
    }

    importRules() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a file to import', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.customRules && Array.isArray(data.customRules)) {
                    this.transactionRules.importCustomPatterns(data.customRules);
                    this.showNotification(`Imported ${data.customRules.length} rules successfully`, 'success');
                    this.loadCustomRules();
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showNotification('Failed to import rules: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    }

    determineEntity(accountId) {
        if (['0111', '8529', '0898'].includes(accountId)) {
            return 'Real Estate';
        } else if (['7991', '2299'].includes(accountId)) {
            return 'Tech Auditing';
        } else if (['8895', '119'].includes(accountId)) {
            return 'Investment';
        } else {
            return 'Personal';
        }
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Export singleton instance
export const rulesManager = new RulesManager();
window.rulesManager = rulesManager;