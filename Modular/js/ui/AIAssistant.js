// js/ui/AIAssistant.js
// AI-powered chat interface for financial insights and assistance

import { geminiService } from '../ai/GeminiService.js';
import { DataService } from '../data/DataService.js';
import { transactionRules } from '../rules/TransactionRules.js';
import { AppConfig } from '../config/AppConfig.js';

export class AIAssistant {
    constructor(dataService) {
        this.dataService = dataService;
        this.chatHistory = [];
        this.isOpen = false;
        this.initializeUI();
        this.setupPredefinedQueries();
    }

    initializeUI() {
        // Create chat widget
        const chatHtml = `
            <!-- Floating Chat Button -->
            <button id="aiChatButton" class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center justify-center">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <span class="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
            </button>

            <!-- Chat Window -->
            <div id="aiChatWindow" class="hidden fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <h3 class="font-semibold">AI Financial Assistant</h3>
                        </div>
                        <button id="closeChatButton" class="text-white hover:text-gray-200 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs mt-1 text-purple-100">Ask about transactions, categories, or insights</p>
                </div>

                <!-- Suggested Queries -->
                <div id="suggestedQueries" class="p-3 bg-gray-50 border-b">
                    <p class="text-xs text-gray-600 mb-2">Quick actions:</p>
                    <div class="flex flex-wrap gap-2">
                        <button class="suggested-query text-xs bg-white px-3 py-1.5 rounded-full border hover:bg-blue-50 transition-colors" data-query="monthly-summary">
                            📊 Monthly Summary
                        </button>
                        <button class="suggested-query text-xs bg-white px-3 py-1.5 rounded-full border hover:bg-blue-50 transition-colors" data-query="uncategorized">
                            🏷️ Uncategorized Items
                        </button>
                        <button class="suggested-query text-xs bg-white px-3 py-1.5 rounded-full border hover:bg-blue-50 transition-colors" data-query="tax-deductible">
                            📋 Tax Deductible
                        </button>
                        <button class="suggested-query text-xs bg-white px-3 py-1.5 rounded-full border hover:bg-blue-50 transition-colors" data-query="cash-flow">
                            💰 Cash Flow Analysis
                        </button>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3">
                    <div class="assistant-message">
                        <div class="flex items-start space-x-2">
                            <div class="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span class="text-white text-xs">AI</span>
                            </div>
                            <div class="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                                <p class="text-sm">Hello! I can help you analyze transactions, categorize expenses, and provide insights about your finances. What would you like to know?</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="border-t p-4">
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            id="chatInput" 
                            placeholder="Ask about your finances..."
                            class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                        <button id="sendChatButton" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-md transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Powered by Gemini AI • Your data stays private</p>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', chatHtml);
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Toggle chat window
        document.getElementById('aiChatButton').addEventListener('click', () => this.toggleChat());
        document.getElementById('closeChatButton').addEventListener('click', () => this.closeChat());
        
        // Send message
        document.getElementById('sendChatButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Suggested queries
        document.querySelectorAll('.suggested-query').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const queryType = e.target.dataset.query;
                this.handleSuggestedQuery(queryType);
            });
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('aiChatWindow');
        chatWindow.classList.toggle('hidden');
        
        if (this.isOpen) {
            document.getElementById('chatInput').focus();
        }
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('aiChatWindow').classList.add('hidden');
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Process the message
            const response = await this.processUserQuery(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'assistant');
        } catch (error) {
            console.error('Error processing message:', error);
            this.removeTypingIndicator();
            this.addMessage('Sorry, I encountered an error processing your request. Please try again.', 'assistant');
        }
    }

    async processUserQuery(query) {
        const queryLower = query.toLowerCase();
        
        // Check for specific query patterns
        if (queryLower.includes('categorize') || queryLower.includes('category')) {
            return await this.handleCategorizationQuery(query);
        }
        
        if (queryLower.includes('spend') || queryLower.includes('spent') || queryLower.includes('expense')) {
            return await this.handleSpendingQuery(query);
        }
        
        if (queryLower.includes('income') || queryLower.includes('revenue') || queryLower.includes('rent')) {
            return await this.handleIncomeQuery(query);
        }
        
        if (queryLower.includes('transfer') || queryLower.includes('move')) {
            return await this.handleTransferQuery(query);
        }
        
        if (queryLower.includes('tax') || queryLower.includes('deduct')) {
            return await this.handleTaxQuery(query);
        }
        
        if (queryLower.includes('pattern') || queryLower.includes('recurring') || queryLower.includes('regular')) {
            return await this.analyzePatterns(query);
        }
        
        // Default to AI analysis
        return await this.getAIInsight(query);
    }

    async handleCategorizationQuery(query) {
        const transactions = await this.dataService.getTransactions();
        const uncategorized = transactions.filter(t => !t.category || t.category === 'Uncategorized');
        
        if (uncategorized.length === 0) {
            return "Great news! All your transactions are already categorized. 🎉";
        }
        
        let response = `Found ${uncategorized.length} uncategorized transaction${uncategorized.length > 1 ? 's' : ''}:\n\n`;
        
        // Show first 5 uncategorized
        const toShow = uncategorized.slice(0, 5);
        toShow.forEach(t => {
            const suggestion = transactionRules.categorize(t);
            response += `• ${t.description} ($${Math.abs(t.amount).toFixed(2)})\n`;
            response += `  Suggested: ${suggestion.category} (${Math.round(suggestion.confidence * 100)}% confidence)\n\n`;
        });
        
        if (uncategorized.length > 5) {
            response += `\n...and ${uncategorized.length - 5} more.\n\n`;
        }
        
        response += "Would you like me to auto-categorize these transactions?";
        
        return response;
    }

    async handleSpendingQuery(query) {
        const transactions = await this.dataService.getTransactions();
        const expenses = transactions.filter(t => t.amount < 0);
        
        // Parse time period from query
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        let relevantExpenses = expenses;
        if (query.includes('month') || query.includes('monthly')) {
            relevantExpenses = expenses.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            });
        }
        
        // Group by category
        const byCategory = {};
        let total = 0;
        
        relevantExpenses.forEach(t => {
            const cat = t.category || 'Uncategorized';
            if (!byCategory[cat]) byCategory[cat] = 0;
            byCategory[cat] += Math.abs(t.amount);
            total += Math.abs(t.amount);
        });
        
        // Sort by amount
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        
        let response = `📊 Expense Analysis:\n\n`;
        response += `Total Expenses: $${total.toFixed(2)}\n\n`;
        response += `By Category:\n`;
        
        sorted.slice(0, 5).forEach(([cat, amount]) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            response += `• ${cat}: $${amount.toFixed(2)} (${percentage}%)\n`;
        });
        
        // Add insights
        if (sorted.length > 0) {
            response += `\n💡 Insight: Your biggest expense category is ${sorted[0][0]} at $${sorted[0][1].toFixed(2)}`;
        }
        
        return response;
    }

    async handleIncomeQuery(query) {
        const transactions = await this.dataService.getTransactions();
        const income = transactions.filter(t => t.amount > 0 && t.type === 'Income');
        
        // Group by source/account
        const bySource = {};
        let total = 0;
        
        income.forEach(t => {
            const source = t.entity || t.account || 'Unknown';
            if (!bySource[source]) bySource[source] = { amount: 0, count: 0 };
            bySource[source].amount += t.amount;
            bySource[source].count++;
            total += t.amount;
        });
        
        let response = `💰 Income Analysis:\n\n`;
        response += `Total Income: $${total.toFixed(2)}\n\n`;
        response += `By Source:\n`;
        
        Object.entries(bySource).forEach(([source, data]) => {
            response += `• ${source}: $${data.amount.toFixed(2)} (${data.count} payment${data.count > 1 ? 's' : ''})\n`;
        });
        
        // Check for missing expected income
        const expectedRentAmount = 25000; // From your context
        const actualRentThisMonth = income
            .filter(t => t.category === 'Rental Income' && this.isCurrentMonth(t.date))
            .reduce((sum, t) => sum + t.amount, 0);
        
        if (actualRentThisMonth < expectedRentAmount * 0.9) {
            response += `\n⚠️ Alert: Rental income this month ($${actualRentThisMonth.toFixed(2)}) is below expected ($${expectedRentAmount.toFixed(2)})`;
        }
        
        return response;
    }

    async handleTransferQuery(query) {
        const transactions = await this.dataService.getTransactions();
        const transfers = transactions.filter(t => t.type === 'Transfer');
        
        // Group transfers by account pairs
        const transferPairs = {};
        
        transfers.forEach(t => {
            const key = `${t.fromAccount || t.account} → ${t.toAccount || 'Unknown'}`;
            if (!transferPairs[key]) transferPairs[key] = { count: 0, total: 0 };
            transferPairs[key].count++;
            transferPairs[key].total += Math.abs(t.amount);
        });
        
        let response = `🔄 Transfer Analysis:\n\n`;
        response += `Total Transfers: ${transfers.length}\n\n`;
        response += `Common Transfer Routes:\n`;
        
        Object.entries(transferPairs).forEach(([route, data]) => {
            response += `• ${route}\n`;
            response += `  ${data.count} transfer${data.count > 1 ? 's' : ''}, Total: $${data.total.toFixed(2)}\n`;
        });
        
        // Identify regular transfers
        const monthlyInvestment = transfers.filter(t => 
            t.description?.includes('investment') || 
            (t.toAccount === '8895' && Math.abs(t.amount) === 1250)
        );
        
        if (monthlyInvestment.length > 0) {
            response += `\n✅ Regular monthly investment transfer detected: $1,250 to account 8895`;
        }
        
        return response;
    }

    async handleTaxQuery(query) {
        const transactions = await this.dataService.getTransactions();
        const currentYear = new Date().getFullYear();
        
        // Tax deductible categories for real estate
        const realEstateDeductible = [
            'Maintenance', 'Repairs', 'Property Management',
            'Insurance', 'Property Tax', 'Professional Services',
            'Utilities', 'HOA Fees', 'Mortgage Interest'
        ];
        
        // Tax deductible categories for business
        const businessDeductible = [
            'Software', 'Equipment', 'Professional Services',
            'Travel', 'Office Supplies', 'Internet', 'Phone'
        ];
        
        const deductibleTransactions = transactions.filter(t => {
            if (t.entity === 'Real Estate') {
                return realEstateDeductible.includes(t.category);
            }
            if (t.entity === 'Tech') {
                return businessDeductible.includes(t.category);
            }
            return false;
        });
        
        const totalDeductible = deductibleTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        let response = `📋 Tax Deductible Expenses Analysis:\n\n`;
        response += `Total Deductible: $${totalDeductible.toFixed(2)}\n\n`;
        
        // Group by entity
        const byEntity = { 'Real Estate': 0, 'Tech': 0 };
        deductibleTransactions.forEach(t => {
            if (byEntity[t.entity] !== undefined) {
                byEntity[t.entity] += Math.abs(t.amount);
            }
        });
        
        response += `By Business:\n`;
        response += `• Real Estate: $${byEntity['Real Estate'].toFixed(2)}\n`;
        response += `• Tech Business: $${byEntity['Tech'].toFixed(2)}\n\n`;
        
        response += `💡 Remember to keep all receipts and documentation for these expenses!`;
        
        return response;
    }

    async analyzePatterns(query) {
        const transactions = await this.dataService.getTransactions();
        
        // Find recurring transactions
        const recurring = this.findRecurringTransactions(transactions);
        
        let response = `🔍 Pattern Analysis:\n\n`;
        response += `Found ${recurring.length} recurring transaction patterns:\n\n`;
        
        recurring.slice(0, 5).forEach(pattern => {
            response += `• ${pattern.description}\n`;
            response += `  Amount: $${pattern.amount.toFixed(2)}, Frequency: ${pattern.frequency}\n`;
            response += `  Last seen: ${pattern.lastDate}\n\n`;
        });
        
        // Check for anomalies
        const anomalies = this.findAnomalies(transactions);
        if (anomalies.length > 0) {
            response += `\n⚠️ Unusual Transactions Detected:\n`;
            anomalies.forEach(a => {
                response += `• ${a.description}: $${a.amount.toFixed(2)} (${a.reason})\n`;
            });
        }
        
        return response;
    }

    async getAIInsight(query) {
        // Use Gemini to analyze the query with transaction context
        const transactions = await this.dataService.getTransactions();
        const recentTransactions = transactions.slice(0, 20); // Last 20 transactions
        
        const context = {
            query: query,
            recentTransactions: recentTransactions.map(t => ({
                date: t.date,
                amount: t.amount,
                description: t.description,
                category: t.category,
                entity: t.entity
            })),
            accounts: Object.entries(AppConfig.ACCOUNT_MAPPING).map(([id, data]) => ({
                id: id,
                name: data.name,
                entity: data.entity
            }))
        };
        
        try {
            const aiResponse = await geminiService.getFinancialInsight(context);
            return aiResponse;
        } catch (error) {
            console.error('AI insight error:', error);
            return "I'll help you with that. Based on your transaction history... [AI service temporarily unavailable]";
        }
    }

    async handleSuggestedQuery(queryType) {
        let response = '';
        
        switch(queryType) {
            case 'monthly-summary':
                response = await this.generateMonthlySummary();
                break;
            case 'uncategorized':
                response = await this.handleCategorizationQuery('show uncategorized');
                break;
            case 'tax-deductible':
                response = await this.handleTaxQuery('tax deductible expenses');
                break;
            case 'cash-flow':
                response = await this.analyzeCashFlow();
                break;
            default:
                response = 'Processing your request...';
        }
        
        this.addMessage(response, 'assistant');
    }

    async generateMonthlySummary() {
        const transactions = await this.dataService.getTransactions();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });
        
        const income = monthTransactions.filter(t => t.amount > 0 && t.type === 'Income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = monthTransactions.filter(t => t.amount < 0 && t.type === 'Expense')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const netIncome = income - expenses;
        
        let response = `📊 Monthly Summary for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:\n\n`;
        response += `💰 Total Income: $${income.toFixed(2)}\n`;
        response += `💸 Total Expenses: $${expenses.toFixed(2)}\n`;
        response += `📈 Net Income: $${netIncome.toFixed(2)}\n\n`;
        
        // Business breakdown
        const realEstateIncome = monthTransactions
            .filter(t => t.entity === 'Real Estate' && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        const techIncome = monthTransactions
            .filter(t => t.entity === 'Tech' && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        
        response += `By Business:\n`;
        response += `🏠 Real Estate: $${realEstateIncome.toFixed(2)}\n`;
        response += `💻 Tech Auditing: $${techIncome.toFixed(2)}\n\n`;
        
        if (netIncome > 0) {
            response += `✅ Positive cash flow this month!`;
        } else {
            response += `⚠️ Negative cash flow - expenses exceeded income.`;
        }
        
        return response;
    }

    async analyzeCashFlow() {
        const transactions = await this.dataService.getTransactions();
        const last3Months = this.getLastNMonthsTransactions(transactions, 3);
        
        let response = `💰 Cash Flow Analysis (Last 3 Months):\n\n`;
        
        last3Months.forEach(monthData => {
            const income = monthData.transactions.filter(t => t.amount > 0 && t.type === 'Income')
                .reduce((sum, t) => sum + t.amount, 0);
            const expenses = monthData.transactions.filter(t => t.amount < 0 && t.type === 'Expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const net = income - expenses;
            
            response += `${monthData.month}:\n`;
            response += `  Income: $${income.toFixed(2)}\n`;
            response += `  Expenses: $${expenses.toFixed(2)}\n`;
            response += `  Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}\n\n`;
        });
        
        // Calculate trend
        const netFlows = last3Months.map(m => {
            const income = m.transactions.filter(t => t.amount > 0 && t.type === 'Income')
                .reduce((sum, t) => sum + t.amount, 0);
            const expenses = m.transactions.filter(t => t.amount < 0 && t.type === 'Expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            return income - expenses;
        });
        
        const trend = netFlows[2] - netFlows[0]; // Current month vs 3 months ago
        
        if (trend > 0) {
            response += `📈 Trend: Improving (${trend >= 0 ? '+' : ''}$${trend.toFixed(2)} over 3 months)`;
        } else {
            response += `📉 Trend: Declining ($${trend.toFixed(2)} over 3 months)`;
        }
        
        return response;
    }

    // Helper methods
    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageHtml = sender === 'user' ? 
            `<div class="user-message">
                <div class="flex items-start justify-end space-x-2">
                    <div class="bg-blue-600 text-white rounded-lg p-3 max-w-[80%]">
                        <p class="text-sm">${this.escapeHtml(content)}</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-gray-700 text-xs">You</span>
                    </div>
                </div>
            </div>` :
            `<div class="assistant-message">
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-white text-xs">AI</span>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                        <p class="text-sm whitespace-pre-wrap">${this.formatAssistantMessage(content)}</p>
                    </div>
                </div>
            </div>`;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add to history
        this.chatHistory.push({ sender, content, timestamp: new Date() });
    }

    showTypingIndicator() {
        const indicator = `
            <div id="typingIndicator" class="assistant-message">
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-white text-xs">AI</span>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-3">
                        <div class="flex space-x-1">
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('chatMessages').insertAdjacentHTML('beforeend', indicator);
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    formatAssistantMessage(content) {
        // Convert line breaks to HTML and add emoji
        return content.replace(/\n/g, '\n');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    findRecurringTransactions(transactions) {
        const patterns = {};
        
        transactions.forEach(t => {
            const key = `${t.description}_${Math.abs(t.amount).toFixed(2)}`;
            if (!patterns[key]) {
                patterns[key] = {
                    description: t.description,
                    amount: Math.abs(t.amount),
                    dates: [],
                    category: t.category
                };
            }
            patterns[key].dates.push(new Date(t.date));
        });
        
        // Find patterns that occur regularly
        const recurring = [];
        Object.values(patterns).forEach(pattern => {
            if (pattern.dates.length >= 2) {
                const intervals = [];
                for (let i = 1; i < pattern.dates.length; i++) {
                    intervals.push(pattern.dates[i] - pattern.dates[i-1]);
                }
                
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const daysBetween = avgInterval / (1000 * 60 * 60 * 24);
                
                let frequency = 'irregular';
                if (daysBetween >= 28 && daysBetween <= 32) frequency = 'monthly';
                else if (daysBetween >= 13 && daysBetween <= 15) frequency = 'bi-weekly';
                else if (daysBetween >= 6 && daysBetween <= 8) frequency = 'weekly';
                else if (daysBetween >= 364 && daysBetween <= 366) frequency = 'yearly';
                
                if (frequency !== 'irregular') {
                    recurring.push({
                        ...pattern,
                        frequency,
                        lastDate: pattern.dates[pattern.dates.length - 1].toLocaleDateString()
                    });
                }
            }
        });
        
        return recurring;
    }

    findAnomalies(transactions) {
        const anomalies = [];
        
        // Group by category to find outliers
        const byCategory = {};
        transactions.forEach(t => {
            const cat = t.category || 'Uncategorized';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(Math.abs(t.amount));
        });
        
        // Find statistical outliers
        Object.entries(byCategory).forEach(([category, amounts]) => {
            if (amounts.length > 3) {
                const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
                const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / amounts.length);
                
                transactions.forEach(t => {
                    if (t.category === category) {
                        const amount = Math.abs(t.amount);
                        if (amount > avg + (2 * stdDev)) {
                            anomalies.push({
                                ...t,
                                reason: `Unusually high for ${category}`
                            });
                        }
                    }
                });
            }
        });
        
        return anomalies.slice(0, 5); // Return top 5 anomalies
    }

    isCurrentMonth(date) {
        const tDate = new Date(date);
        const now = new Date();
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }

    getLastNMonthsTransactions(transactions, n) {
        const months = [];
        const now = new Date();
        
        for (let i = 0; i < n; i++) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === month.getMonth() && 
                       tDate.getFullYear() === month.getFullYear();
            });
            
            months.push({
                month: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                transactions: monthTransactions
            });
        }
        
        return months.reverse();
    }

    setupPredefinedQueries() {
        // Store common queries for quick access
        this.predefinedQueries = {
            'monthly-summary': 'Show me a summary of this month',
            'uncategorized': 'Show uncategorized transactions',
            'tax-deductible': 'What are my tax deductible expenses?',
            'cash-flow': 'Analyze my cash flow'
        };
    }
}

// Export for use in main app
export default AIAssistant;