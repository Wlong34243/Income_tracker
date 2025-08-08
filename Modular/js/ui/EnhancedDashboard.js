// js/ui/EnhancedDashboard.js
// Vanilla JavaScript version that integrates with your modular app

export class EnhancedDashboard {
    constructor(financeApp) {
        this.financeApp = financeApp;
        this.currentTab = 'dashboard';
        this.init();
    }

    init() {
        this.createDashboardHTML();
        this.attachEventListeners();
    }

    createDashboardHTML() {
        const dashboardHTML = `
            <div id="enhanced-dashboard" class="hidden min-h-screen bg-gray-50">
                <header class="bg-white shadow-md border-b">
                    <div class="max-w-7xl mx-auto px-4 py-4">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center space-x-4">
                                <button id="back-to-main" class="text-gray-600 hover:text-gray-800">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                    </svg>
                                </button>
                                <h1 class="text-2xl font-bold text-gray-900">Enhanced Dashboard</h1>
                            </div>
                            <div class="flex space-x-2">
                                <button id="test-gemini-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                                    Test Gemini
                                </button>
                                <button id="batch-categorize-btn" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
                                    AI Categorize
                                </button>
                                <button id="clear-data-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                                    Clear Data
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="max-w-7xl mx-auto px-4 py-6">
                    <div class="mb-6">
                        <div class="border-b border-gray-200">
                            <nav class="-mb-px flex space-x-8">
                                <button class="dashboard-tab active border-b-2 border-blue-500 text-blue-600 py-2 px-1 font-medium text-sm flex items-center space-x-2" data-tab="dashboard">
                                    <span>📊</span> <span>Dashboard</span>
                                </button>
                                <button class="dashboard-tab border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-1 font-medium text-sm flex items-center space-x-2" data-tab="properties">
                                    <span>🏠</span> <span>Property P&L</span>
                                </button>
                                <button class="dashboard-tab border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-1 font-medium text-sm flex items-center space-x-2" data-tab="business">
                                    <span>💼</span> <span>Business Analytics</span>
                                </button>
                                <button class="dashboard-tab border-b-2 border-transparent text-gray-500 hover:text-gray-700 py-2 px-1 font-medium text-sm flex items-center space-x-2" data-tab="transactions">
                                    <span>💳</span> <span>Transaction Analysis</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    <div id="dashboard-content">
                        <div id="tab-dashboard" class="tab-content">
                            <div class="space-y-6">
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div class="bg-white rounded-lg shadow p-6">
                                        <div class="flex items-center">
                                            <div class="flex-1">
                                                <p class="text-sm font-medium text-gray-600">Total Income</p>
                                                <p id="total-income" class="text-3xl font-bold text-green-600">$0</p>
                                            </div>
                                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <span class="text-green-600">↗</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-white rounded-lg shadow p-6">
                                        <div class="flex items-center">
                                            <div class="flex-1">
                                                <p class="text-sm font-medium text-gray-600">Total Expenses</p>
                                                <p id="total-expenses" class="text-3xl font-bold text-red-600">$0</p>
                                            </div>
                                            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                <span class="text-red-600">↙</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-white rounded-lg shadow p-6">
                                        <div class="flex items-center">
                                            <div class="flex-1">
                                                <p class="text-sm font-medium text-gray-600">Net Income</p>
                                                <p id="net-income" class="text-3xl font-bold text-blue-600">$0</p>
                                            </div>
                                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span class="text-blue-600">💰</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-white rounded-lg shadow p-6">
                                        <div class="flex items-center">
                                            <div class="flex-1">
                                                <p class="text-sm font-medium text-gray-600">Uncategorized</p>
                                                <p id="uncategorized-count" class="text-3xl font-bold text-orange-600">0</p>
                                            </div>
                                            <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                                <span class="text-orange-600">⚠</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="bg-white rounded-lg shadow p-6">
                                        <h3 class="text-lg font-semibold mb-4">Real Estate Business</h3>
                                        <div class="space-y-3">
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Monthly Income</span>
                                                <span id="re-income" class="font-semibold text-green-600">$0</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Operating Expenses</span>
                                                <span id="re-expenses" class="font-semibold text-red-600">$0</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Net Operating Income</span>
                                                <span id="re-net" class="font-semibold text-blue-600">$0</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="bg-white rounded-lg shadow p-6">
                                        <h3 class="text-lg font-semibold mb-4">Tech Business</h3>
                                        <div class="space-y-3">
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Monthly Revenue</span>
                                                <span id="tech-income" class="font-semibold text-green-600">$0</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Business Expenses</span>
                                                <span id="tech-expenses" class="font-semibold text-red-600">$0</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Net Profit</span>
                                                <span id="tech-net" class="font-semibold text-blue-600">$0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="tab-properties" class="tab-content hidden">
                            <div class="bg-white rounded-lg shadow overflow-hidden">
                                <div class="px-6 py-4 border-b border-gray-200">
                                    <h3 class="text-lg font-semibold">Property Performance</h3>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody id="property-table-body" class="bg-white divide-y divide-gray-200">
                                            </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div id="tab-business" class="tab-content hidden">
                            <div class="space-y-6">
                                <div class="bg-white rounded-lg shadow p-6">
                                    <h3 class="text-lg font-semibold mb-4">Monthly Trends</h3>
                                    <div id="monthly-trends" class="space-y-4">
                                        </div>
                                </div>
                            </div>
                        </div>

                        <div id="tab-transactions" class="tab-content hidden">
                            <div class="space-y-6">
                                <div class="bg-white rounded-lg shadow p-6">
                                    <h3 class="text-lg font-semibold mb-4">Transaction Categories</h3>
                                    <div id="category-breakdown" class="grid grid-cols-2 gap-4">
                                        </div>
                                </div>
                                
                                <div class="bg-white rounded-lg shadow p-6">
                                    <h3 class="text-lg font-semibold mb-4">Recent Uncategorized Transactions</h3>
                                    <div id="uncategorized-list" class="space-y-2">
                                        </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="edit-modal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                    <div class="flex items-center justify-center min-h-screen p-4 bg-gray-900 bg-opacity-50">
                        <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                            <div class="bg-blue-600 text-white p-4">
                                <h2 class="text-xl font-semibold">Edit Transaction</h2>
                            </div>
                            <div class="p-6">
                                <div id="edit-form">
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input type="text" id="edit-description" class="w-full px-3 py-2 border rounded-md" readonly>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select id="edit-category" class="w-full px-3 py-2 border rounded-md">
                                            <option value="">Select Category</option>
                                        </select>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Property</label>
                                        <select id="edit-property" class="w-full px-3 py-2 border rounded-md">
                                            <option value="">Select Property (optional)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="flex justify-end space-x-3">
                                    <button id="cancel-edit" class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50">
                                        Cancel
                                    </button>
                                    <button id="save-edit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    }

    attachEventListeners() {
        // Back button
        document.getElementById('back-to-main')?.addEventListener('click', () => {
            this.hide();
        });

        // Tab navigation
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.target.closest('button').dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Action buttons
        document.getElementById('test-gemini-btn')?.addEventListener('click', () => {
            this.testGeminiConnection();
        });

        document.getElementById('batch-categorize-btn')?.addEventListener('click', () => {
            this.batchCategorize();
        });

        document.getElementById('clear-data-btn')?.addEventListener('click', () => {
            this.clearData();
        });

        // Edit modal buttons
        document.getElementById('cancel-edit')?.addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('save-edit')?.addEventListener('click', () => {
            this.saveEdit();
        });
    }

    show() {
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('enhanced-dashboard').classList.remove('hidden');
        this.updateDashboard();
    }

    hide() {
        document.getElementById('enhanced-dashboard').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
    }

    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
        activeTab.classList.remove('border-transparent', 'text-gray-500');
        activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');

        this.currentTab = tabId;
        this.updateTabContent(tabId);
    }

    updateDashboard() {
        const summary = this.calculateSummary();
        
        // Update summary cards
        document.getElementById('total-income').textContent = this.formatCurrency(summary.totals.income);
        document.getElementById('total-expenses').textContent = this.formatCurrency(summary.totals.expenses);
        document.getElementById('net-income').textContent = this.formatCurrency(summary.totals.net);
        document.getElementById('uncategorized-count').textContent = summary.uncategorizedCount;

        // Update business summaries
        document.getElementById('re-income').textContent = this.formatCurrency(summary.realEstate.income);
        document.getElementById('re-expenses').textContent = this.formatCurrency(summary.realEstate.expenses);
        document.getElementById('re-net').textContent = this.formatCurrency(summary.realEstate.net);

        document.getElementById('tech-income').textContent = this.formatCurrency(summary.techBusiness.income);
        document.getElementById('tech-expenses').textContent = this.formatCurrency(summary.techBusiness.expenses);
        document.getElementById('tech-net').textContent = this.formatCurrency(summary.techBusiness.net);

        // Update current tab
        this.updateTabContent(this.currentTab);
    }

    calculateSummary() {
        const transactions = this.financeApp.transactions || [];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
        });

        // Real Estate Summary
        const realEstateIncome = monthlyTransactions
            .filter(t => t.category === 'Real Estate Income')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const realEstateExpenses = monthlyTransactions
            .filter(t => (t.entity === 'Real Estate' || t.category?.includes('Property')) && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Tech Business Summary
        const techIncome = monthlyTransactions
            .filter(t => t.category === 'Tech Business Income')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const techExpenses = monthlyTransactions
            .filter(t => t.entity === 'Tech Business' && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Property breakdown
        const properties = [...new Set(transactions.filter(t => t.property).map(t => t.property))];
        const propertyBreakdown = properties.map(property => {
            const propertyTransactions = monthlyTransactions.filter(t => t.property === property);
            const income = propertyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
            const expenses = propertyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            return {
                property,
                income,
                expenses,
                net: income - expenses,
                margin: income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0
            };
        });

        return {
            realEstate: {
                income: realEstateIncome,
                expenses: realEstateExpenses,
                net: realEstateIncome - realEstateExpenses
            },
            techBusiness: {
                income: techIncome,
                expenses: techExpenses,
                net: techIncome - techExpenses
            },
            properties: propertyBreakdown,
            totals: {
                income: realEstateIncome + techIncome,
                expenses: realEstateExpenses + techExpenses,
                net: (realEstateIncome + techIncome) - (realEstateExpenses + techExpenses)
            },
            uncategorizedCount: transactions.filter(t => !t.category || t.category === 'Uncategorized').length
        };
    }

    updateTabContent(tabId) {
        const summary = this.calculateSummary();

        switch (tabId) {
            case 'properties':
                this.updatePropertyTable(summary.properties);
                break;
            case 'business':
                this.updateBusinessAnalytics();
                break;
            case 'transactions':
                this.updateTransactionAnalysis();
                break;
        }
    }

    updatePropertyTable(properties) {
        const tbody = document.getElementById('property-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = properties.map(prop => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${prop.property}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">$${prop.income.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">$${prop.expenses.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${prop.net >= 0 ? 'text-green-600' : 'text-red-600'}">
                    $${prop.net.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${prop.margin}%</td>
            </tr>
        `).join('');
    }

    updateBusinessAnalytics() {
        // Placeholder for business analytics
        const trendsDiv = document.getElementById('monthly-trends');
        if (trendsDiv) {
            trendsDiv.innerHTML = '<p class="text-gray-500">Business analytics coming soon...</p>';
        }
    }

    updateTransactionAnalysis() {
        const transactions = this.financeApp.transactions || [];
        
        // Category breakdown
        const categories = {};
        transactions.forEach(t => {
            const cat = t.category || 'Uncategorized';
            if (!categories[cat]) {
                categories[cat] = { count: 0, total: 0 };
            }
            categories[cat].count++;
            categories[cat].total += Math.abs(t.amount);
        });

        const categoryDiv = document.getElementById('category-breakdown');
        if (categoryDiv) {
            categoryDiv.innerHTML = Object.entries(categories)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 10)
                .map(([cat, data]) => `
                    <div class="bg-gray-50 p-3 rounded">
                        <div class="font-medium text-sm">${cat}</div>
                        <div class="text-xs text-gray-500">${data.count} transactions</div>
                        <div class="text-lg font-bold">$${data.total.toFixed(2)}</div>
                    </div>
                `).join('');
        }

        // Uncategorized transactions
        const uncategorized = transactions
            .filter(t => !t.category || t.category === 'Uncategorized')
            .slice(0, 10);

        const uncategorizedDiv = document.getElementById('uncategorized-list');
        if (uncategorizedDiv) {
            uncategorizedDiv.innerHTML = uncategorized.length > 0 
                ? uncategorized.map(t => `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                            <div class="font-medium text-sm">${t.description}</div>
                            <div class="text-xs text-gray-500">${new Date(t.date).toLocaleDateString()}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                                $${Math.abs(t.amount).toFixed(2)}
                            </div>
                            <button onclick="window.financeApp.enhancedDashboard.editTransaction('${t.id}')" 
                                    class="text-xs text-blue-600 hover:text-blue-800">
                                Categorize
                            </button>
                        </div>
                    </div>
                `).join('')
                : '<p class="text-gray-500">No uncategorized transactions</p>';
        }
    }

    editTransaction(transactionId) {
        const transaction = this.financeApp.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        document.getElementById('edit-description').value = transaction.description;
        document.getElementById('edit-category').value = transaction.category || '';
        document.getElementById('edit-property').value = transaction.property || '';
        
        this.currentEditingTransaction = transaction;
        document.getElementById('edit-modal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.add('hidden');
        this.currentEditingTransaction = null;
    }

    async saveEdit() {
        if (!this.currentEditingTransaction) return;

        const category = document.getElementById('edit-category').value;
        const property = document.getElementById('edit-property').value;

        try {
            await this.financeApp.dataService.updateTransaction(this.currentEditingTransaction.id, {
                category,
                property
            });

            // Update local data
            this.currentEditingTransaction.category = category;
            this.currentEditingTransaction.property = property;

            this.closeEditModal();
            this.updateDashboard();
            this.financeApp.showNotification('Transaction updated successfully', 'success');
        } catch (error) {
            console.error('Error updating transaction:', error);
            this.financeApp.showNotification('Failed to update transaction', 'error');
        }
    }

    async testGemini() {
        console.log('Testing Gemini integration...');
        // Placeholder for Gemini test
        this.financeApp.showNotification('Gemini test feature coming soon', 'info');
    }

    async testGeminiConnection() {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            alert('Please configure your Gemini API key in Settings first');
            return;
        }
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Test successful. Reply with: Connected!"
                        }]
                    }]
                })
            });
            if (response.ok) {
                const data = await response.json();
                const result = data.candidates[0].content.parts[0].text;
                alert(`Gemini Test Successful: ${result}`);
            } else {
                const error = await response.json();
                alert(`Gemini Test Failed: ${error.error.message}`);
            }
        } catch (error) {
            alert(`Connection Error: ${error.message}`);
        }
    }

    async batchCategorize() {
        const uncategorized = this.financeApp.transactions.filter(t => !t.category || t.category === 'Uncategorized');
        
        if (uncategorized.length === 0) {
            this.financeApp.showNotification('No uncategorized transactions found', 'info');
            return;
        }

        this.financeApp.showNotification(`Categorizing ${uncategorized.length} transactions...`, 'info');
        
        // Placeholder for batch categorization
        console.log('Batch categorize:', uncategorized);
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    async refresh() {
        console.log('Refreshing enhanced dashboard...');
        this.updateDashboard();
    }
}

// Make it available globally
window.EnhancedDashboard = EnhancedDashboard;