// js/data/DataService.js
// Data Persistence Layer - Firestore/LocalStorage Abstraction

import { AppConfig } from '../config/AppConfig.js';

export class DataService {
    constructor(authService) {
        this.authService = authService;
        this.db = authService.getDatabase();
        this.cache = new Map();
    }

    // Also add this static method that the importer is trying to call
    static async getTransactions() {
        // This needs to be reworked - static methods can't access instance data
        console.warn("Static getTransactions called - this needs refactoring");
        return [];
    }

    async loadAccounts() {
        let accounts;

        if (AppConfig.DEMO_MODE) {
            accounts = this.loadFromLocalStorage('demo-accounts', []);
        } else {
            accounts = await this.loadAccountsFromFirestore();
        }

        return accounts;
    }

    async saveAccount(account) {
        if (AppConfig.DEMO_MODE) {
            return this.saveToLocalStorage('accounts', account);
        } else {
            return await this.saveAccountToFirestore(account);
        }
    }

    async loadTransactions(limit = 1000) {
        let transactions;

        if (AppConfig.DEMO_MODE) {
            transactions = this.loadTransactionsFromLocalStorage();
        } else {
            transactions = await this.loadTransactionsFromFirestore(limit);
        }

        return transactions;
    }

    async getTransactions(limit = 1000) {
        return await this.loadTransactions(limit);
    }

    async saveTransaction(transaction) {
        const transactionData = {
            ...transaction,
            userId: this.authService.getCurrentUser().uid,
            createdAt: AppConfig.DEMO_MODE ?
                new Date().toISOString() :
                firebase.firestore.FieldValue.serverTimestamp()
        };

        if (AppConfig.DEMO_MODE) {
            return this.saveTransactionToLocalStorage(transactionData);
        } else {
            return await this.saveTransactionToFirestore(transactionData);
        }
    }

    async saveTransactionBatch(transactions) {
        if (AppConfig.DEMO_MODE) {
            const results = { success: 0, failed: 0 };

            transactions.forEach(trans => {
                try {
                    this.saveTransactionToLocalStorage(trans);
                    results.success++;
                } catch (error) {
                    console.error('Failed to save transaction:', error);
                    results.failed++;
                }
            });

            return results;
        } else {
            return await this.saveTransactionBatchToFirestore(transactions);
        }
    }

    // --- START: NEW METHODS ADDED FROM INSTRUCTIONS ---

    async addTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transactions to add');
        }

        // Use existing batch method
        if (typeof this.saveTransactionBatch === 'function') {
            return await this.saveTransactionBatch(transactions);
        }

        // Fallback: save one by one
        const results = { success: 0, failed: 0 };
        for (const transaction of transactions) {
            try {
                await this.saveTransaction(transaction);
                results.success++;
            } catch (error) {
                console.error('Failed to save transaction:', error);
                results.failed++;
            }
        }
        return results;
    }

    async getAllTransactions() {
        return await this.loadTransactions(10000); // Large limit to get all
    }

    async updateTransaction(transactionId, updates) {
        try {
            if (AppConfig.DEMO_MODE) {
                const transactions = this.loadFromLocalStorage('demo-transactions', []);
                const index = transactions.findIndex(t => t.id === transactionId);
                if (index !== -1) {
                    transactions[index] = { ...transactions[index], ...updates, updatedAt: new Date().toISOString() };
                    localStorage.setItem('demo-transactions', JSON.stringify(transactions));
                }
            } else {
                const docRef = this.db.collection('transactions').doc(transactionId);
                await docRef.update({
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async updateAccountBalance(accountId, balance) {
        try {
            if (AppConfig.DEMO_MODE) {
                const accounts = this.loadFromLocalStorage('demo-accounts', []);
                const index = accounts.findIndex(a => a.id === accountId);
                if (index !== -1) {
                    accounts[index].balance = balance;
                } else {
                    // A more complete implementation would get the account name from AppConfig
                    accounts.push({ id: accountId, balance: balance, name: `Account ${accountId}` });
                }
                localStorage.setItem('demo-accounts', JSON.stringify(accounts));
            } else {
                const docRef = this.db.collection('accounts').doc(accountId);
                await docRef.set({
                    balance: balance,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }); // Use merge to update or create
            }
        } catch (error) {
            console.error('Error updating account balance:', error);
            throw error;
        }
    }

    // --- END: NEW METHODS ADDED FROM INSTRUCTIONS ---


    // Firebase operations
    async loadAccountsFromFirestore() {
        const snapshot = await this.db.collection('accounts')
            .where('userId', '==', this.authService.getCurrentUser().uid)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async saveAccountToFirestore(account) {
        const docRef = await this.db.collection('accounts').add({
            ...account,
            userId: this.authService.getCurrentUser().uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { id: docRef.id, ...account };
    }

    async loadTransactionsFromFirestore(limit) {
        const snapshot = await this.db.collection('transactions')
            .where('userId', '==', this.authService.getCurrentUser().uid)
            .orderBy('date', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async saveTransactionToFirestore(transaction) {
        const docRef = await this.db.collection('transactions').add(transaction);
        return { id: docRef.id, ...transaction };
    }

    async saveTransactionBatchToFirestore(transactions) {
        const batch = this.db.batch();
        const results = { success: 0, failed: 0 };

        transactions.forEach(trans => {
            try {
                const docRef = this.db.collection('transactions').doc();
                batch.set(docRef, {
                    ...trans,
                    userId: this.authService.getCurrentUser().uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                results.success++;
            } catch (error) {
                console.error('Failed to add transaction to batch:', error);
                results.failed++;
            }
        });

        await batch.commit();
        return results;
    }

    // LocalStorage operations
    loadFromLocalStorage(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    saveToLocalStorage(collection, data) {
        const key = `demo-${collection}`;
        const existing = this.loadFromLocalStorage(key, []);

        const newData = {
            ...data,
            id: data.id || this.generateId(),
            createdAt: new Date().toISOString()
        };

        existing.push(newData);
        localStorage.setItem(key, JSON.stringify(existing));

        return newData;
    }

    loadTransactionsFromLocalStorage() {
        const stored = this.loadFromLocalStorage('demo-transactions', []);
        return stored.map(t => ({
            ...t,
            date: { seconds: new Date(t.date).getTime() / 1000 }
        }));
    }

    saveTransactionToLocalStorage(transaction) {
        const transactions = this.loadFromLocalStorage('demo-transactions', []);

        const newTransaction = {
            ...transaction,
            id: transaction.id || this.generateId(),
            date: transaction.date instanceof Date ?
                transaction.date.toISOString() :
                transaction.date
        };

        transactions.unshift(newTransaction);
        localStorage.setItem('demo-transactions', JSON.stringify(transactions));

        return newTransaction;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
