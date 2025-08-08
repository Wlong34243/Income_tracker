// js/analytics/AnalyticsEngine.js
// Business Intelligence for Real Estate and Tech Business

import { AppConfig } from '../config/AppConfig.js';

export class AnalyticsEngine {
    constructor(dataService) {
        this.dataService = dataService;
    }
    
    async calculateMonthlyMetrics(transactions, accounts, month = null, year = null) {
        const now = new Date();
        const targetMonth = month ?? now.getMonth();
        const targetYear = year ?? now.getFullYear();
        
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date.seconds * 1000);
            return date.getMonth() === targetMonth && 
                   date.getFullYear() === targetYear &&
                   t.category !== 'Internal Transfer'; // Exclude internal transfers
        });
        
        const metrics = {
            realEstate: { income: 0, expenses: 0 },
            techBusiness: { income: 0, expenses: 0 },
            personal: { income: 0, expenses: 0 },
            investment: { transfers: 0 },
            totals: { income: 0, expenses: 0, netWorth: 0 }
        };
        
        // Process transactions by entity
        monthlyTransactions.forEach(trans => {
            const amount = Math.abs(trans.amount);
            const entity = this.getTransactionEntity(trans, accounts);
            
            if (trans.type === 'Income') {
                metrics[entity].income += amount;
                metrics.totals.income += amount;
            } else if (trans.type === 'Expense') {
                metrics[entity].expenses += amount;
                metrics.totals.expenses += amount;
            } else if (trans.type === 'Transfer' && trans.category === 'Investment Transfer') {
                metrics.investment.transfers += amount;
            }
        });
        
        // Calculate net worth from account balances
        metrics.totals.netWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);
        
        // Calculate net income by entity
        Object.keys(metrics).forEach(key => {
            if (key !== 'totals' && key !== 'investment') {
                metrics[key].net = metrics[key].income - metrics[key].expenses;
            }
        });
        
        metrics.totals.net = metrics.totals.income - metrics.totals.expenses;
        
        return metrics;
    }
    
    getTransactionEntity(transaction, accounts) {
        // Map transaction to business entity based on account
        const account = accounts.find(a => a.id === transaction.accountId);
        const entity = account?.entity || 'personal';
        
        const entityMap = {
            'Real Estate': 'realEstate',
            'Tech Business': 'techBusiness',
            'Personal': 'personal',
            'Investment': 'investment'
        };
        
        return entityMap[entity] || 'personal';
    }
    
    calculateGoalProgress(metrics) {
        const combinedNet = metrics.realEstate.net + metrics.techBusiness.net;
        const goalProgress = (combinedNet / AppConfig.GOALS.monthlyNet) * 100;
        
        return {
            current: combinedNet,
            target: AppConfig.GOALS.monthlyNet,
            percentage: Math.min(goalProgress, 100),
            status: combinedNet >= AppConfig.GOALS.monthlyNet ? 'achieved' : 'in-progress'
        };
    }
}