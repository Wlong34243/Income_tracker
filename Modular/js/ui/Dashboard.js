// js/ui/Dashboard.js
// Dashboard UI Management

import { CurrencyUtils } from '../utils/CurrencyUtils.js';

export class Dashboard {
    constructor(analyticsEngine) {
        this.analytics = analyticsEngine;
    }
    
    async updateDashboard(transactions, accounts) {
        const metrics = await this.analytics.calculateMonthlyMetrics(transactions, accounts);
        
        // Update summary cards
        this.updateElement('totalIncome', CurrencyUtils.format(metrics.totals.income));
        this.updateElement('totalExpenses', CurrencyUtils.format(metrics.totals.expenses));
        this.updateElement('netSavings', CurrencyUtils.format(metrics.totals.net));
        this.updateElement('totalNetWorth', CurrencyUtils.format(metrics.totals.netWorth));
        
        // Update business performance cards
        this.updateElement('realEstateNet', CurrencyUtils.format(metrics.realEstate.net));
        this.updateElement('businessNet', CurrencyUtils.format(metrics.techBusiness.net));
        this.updateElement('combinedNet', CurrencyUtils.format(
            metrics.realEstate.net + metrics.techBusiness.net
        ));
        
        // Update goal progress
        const goals = this.analytics.calculateGoalProgress(metrics);
        this.updateGoalProgress(goals);
        
        // Update recent transactions
        this.updateRecentTransactions(transactions.slice(0, 5), accounts);
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateGoalProgress(goals) {
        const progressBar = document.getElementById('goalProgress');
        if (progressBar && goals) {
            progressBar.style.width = `${goals.percentage}%`;
        }
    }
    
    updateRecentTransactions(transactions, accounts) {
        const container = document.getElementById('recentTransactions');
        if (!container) return;
        
        container.innerHTML = '';
        
        transactions.forEach(transaction => {
            const account = accounts.find(a => a.id === transaction.accountId);
            const accountName = account ? account.name : 'Unknown Account';
            
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0';
            
            const typeColor = transaction.type === 'Income' ? 'text-green-600' : 
                             transaction.type === 'Expense' ? 'text-red-600' : 'text-blue-600';
            
            div.innerHTML = `
                <div>
                    <div class="text-sm font-medium text-gray-900">${transaction.description}</div>
                    <div class="text-xs text-gray-500">${accountName} • ${transaction.category} • ${new Date(transaction.date.seconds * 1000).toLocaleDateString()}</div>
                </div>
                <div class="text-sm font-medium ${typeColor}">
                    ${transaction.type === 'Expense' ? '-' : ''}${CurrencyUtils.format(Math.abs(transaction.amount))}
                </div>
            `;
            container.appendChild(div);
        });
    }
}