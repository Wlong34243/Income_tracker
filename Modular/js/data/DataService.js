// js/data/DataService.js
// Data Persistence Layer - Refactored for Testability

import { AppConfig } from '../config/AppConfig.js';

export class DataService {
    constructor(auth, db, firestoreFunctions) {
        this.auth = auth;
        this.db = db; // Firestore database instance
        this.firestore = firestoreFunctions; // Injected functions
        this.cache = new Map();
        console.log('✅ DataService Initialized');
    }

    _getUserId() {
        const userId = this.auth.currentUser?.uid;
        if (!userId) {
            // Throw an error instead of just logging. The App layer will catch this.
            throw new Error("User not authenticated. Cannot perform data operation.");
        }
        return userId;
    }

    async ensureDefaultAccounts() {
       const userId = this._getUserId();
       const accounts = await this.loadAccounts();

       if (accounts.length === 0) {
           console.log('Creating default accounts for new user...');
           const defaults = [
               { accountId: '0111', name: 'Sweep Account', type: 'Checking', entity: 'Real Estate' },
               { accountId: '8529', name: 'Real Estate Ops', type: 'Business', entity: 'Real Estate' },
               { accountId: '7991', name: 'Tech Auditing', type: 'Business', entity: 'Tech Business' },
               { accountId: '2299', name: 'Business Expenses', type: 'Credit Card', entity: 'Tech Business' },
               { accountId: '7588', name: 'Shared Checking', type: 'Checking', entity: 'Personal' },
               { accountId: '2433', name: 'Visa Prime', type: 'Credit Card', entity: 'Personal' },
               { accountId: '8895', name: 'Self-Directed Investment', type: 'Investment', entity: 'Investment' },
               { accountId: '0898', name: "Lisa's Income", type: 'Checking', entity: 'Personal' },
               { accountId: '119', name: 'Schwab Brokerage', type: 'Investment', entity: 'Investment' }
           ];

           for (const account of defaults) {
               await this.saveAccount(account);
           }
           return defaults;
       }
       return accounts;
    }

    async loadAccounts() {
        const userId = this._getUserId();
        if (AppConfig.DEMO_MODE) return this.loadFromLocalStorage(`demo-accounts-${userId}`, []);
        return this.loadAccountsFromFirestore(userId);
    }

    async saveAccount(account) {
        const userId = this._getUserId();
        if (AppConfig.DEMO_MODE) return this.saveToLocalStorage(`demo-accounts-${userId}`, account);
        return this.saveAccountToFirestore(userId, account);
    }

    async loadTransactions(limit = 1000) {
        const userId = this._getUserId();
        if (AppConfig.DEMO_MODE) return this.loadTransactionsFromLocalStorage(userId);
        return this.loadTransactionsFromFirestore(userId, limit);
    }

    async saveTransaction(transaction) {
        const userId = this._getUserId();
        const transactionData = { ...transaction, userId, createdAt: this.firestore.serverTimestamp() };
        if (AppConfig.DEMO_MODE) return this.saveTransactionToLocalStorage(`demo-transactions-${userId}`, transactionData);
        return this.saveTransactionToFirestore(transactionData);
    }

    async saveTransactionBatch(transactions) {
        const userId = this._getUserId();
        if (AppConfig.DEMO_MODE) { /* ... demo logic ... */ return; }
        return this.saveTransactionBatchToFirestore(userId, transactions);
    }

    async updateTransaction(transactionId, updates) {
        const userId = this._getUserId();
        if (AppConfig.DEMO_MODE) return;

        try {
            const { doc, updateDoc, serverTimestamp } = this.firestore;
            const docRef = doc(this.db, 'users', userId, 'transactions', transactionId);
            await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error('DataService: Error updating transaction:', error);
            throw new Error('Failed to update transaction in the database.');
        }
    }

    // --- Firebase Operations ---
    async loadAccountsFromFirestore(userId) {
        try {
            const { collection, query, getDocs } = this.firestore;
            const q = query(collection(this.db, "users", userId, "accounts"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("DataService: Error loading accounts:", error);
            throw new Error("Could not load accounts.");
        }
    }

    async saveAccountToFirestore(userId, account) {
        try {
            const { collection, addDoc, serverTimestamp } = this.firestore;
            const docRef = await addDoc(collection(this.db, "users", userId, "accounts"), { ...account, createdAt: serverTimestamp() });
            return { id: docRef.id, ...account };
        } catch (error) {
            console.error("DataService: Error saving account:", error);
            throw new Error("Could not save the account.");
        }
    }

    async loadTransactionsFromFirestore(userId, limitCount) {
        try {
            const { collection, query, orderBy, limit, getDocs } = this.firestore;
            const q = query(collection(this.db, "users", userId, "transactions"), orderBy('date', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("DataService: Error loading transactions:", error);
            throw new Error("Could not load transactions.");
        }
    }

    async saveTransactionToFirestore(transaction) {
        try {
            const { collection, addDoc } = this.firestore;
            const docRef = await addDoc(collection(this.db, "users", transaction.userId, "transactions"), transaction);
            return { id: docRef.id, ...transaction };
        } catch (error) {
            console.error("DataService: Error saving transaction:", error);
            throw new Error("Could not save the transaction.");
        }
    }

    async saveTransactionBatchToFirestore(userId, transactions) {
        try {
            const { writeBatch, doc, collection, serverTimestamp } = this.firestore;
            const batch = writeBatch(this.db);
            transactions.forEach(trans => {
                const docRef = doc(collection(this.db, "users", userId, "transactions"));
                batch.set(docRef, { ...trans, userId, createdAt: serverTimestamp() });
            });
            await batch.commit();
            return { success: transactions.length, failed: 0 };
        } catch (error) {
            console.error("DataService: Error saving transaction batch:", error);
            throw new Error("Could not save the batch of transactions.");
        }
    }

    // --- LocalStorage Operations (for Demo Mode) ---
    loadFromLocalStorage(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    // ... other localStorage methods
}
