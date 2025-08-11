// js/data/DataService.js
// Data Persistence Layer - Firestore/LocalStorage Abstraction

import { AppConfig } from '../config/AppConfig.js';

// Dynamically import Firebase functions as needed
async function getFirestoreModules() {
    return await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
}

export class DataService {
    constructor(auth, firestore) {
        this.auth = auth; // Direct Firebase auth instance
        this.db = firestore; // Direct Firestore instance
        this.cache = new Map();
        console.log('✅ DataService Initialized');
    }

    _getUserId() {
        const userId = this.auth.currentUser?.uid;
        if (!userId) {
            console.error("DataService error: User is not authenticated.");
            // Or throw new Error("User not authenticated");
        }
        return userId;
    }

    async loadAccounts() {
        const userId = this._getUserId();
        if (!userId) return [];

        if (AppConfig.DEMO_MODE) {
            return this.loadFromLocalStorage(`demo-accounts-${userId}`, []);
        }
        return this.loadAccountsFromFirestore(userId);
    }

    async saveAccount(account) {
        const userId = this._getUserId();
        if (!userId) return;

        if (AppConfig.DEMO_MODE) {
            return this.saveToLocalStorage(`demo-accounts-${userId}`, account);
        }
        return this.saveAccountToFirestore(userId, account);
    }

    async loadTransactions(limit = 1000) {
        const userId = this._getUserId();
        if (!userId) return [];

        if (AppConfig.DEMO_MODE) {
            return this.loadTransactionsFromLocalStorage(userId);
        }
        return this.loadTransactionsFromFirestore(userId, limit);
    }

    async getAllTransactions() {
        return this.loadTransactions(10000); // Large limit for "all"
    }

    async saveTransaction(transaction) {
        const userId = this._getUserId();
        if (!userId) return;

        const { serverTimestamp } = await getFirestoreModules();

        const transactionData = {
            ...transaction,
            userId,
            createdAt: serverTimestamp()
        };

        if (AppConfig.DEMO_MODE) {
            return this.saveTransactionToLocalStorage(`demo-transactions-${userId}`, transactionData);
        }
        return this.saveTransactionToFirestore(transactionData);
    }

    async saveTransactionBatch(transactions) {
        const userId = this._getUserId();
        if (!userId) return;

        if (AppConfig.DEMO_MODE) {
            const results = { success: 0, failed: 0 };
            transactions.forEach(trans => {
                try {
                    this.saveTransactionToLocalStorage(`demo-transactions-${userId}`, trans);
                    results.success++;
                } catch (error) {
                    console.error('Failed to save transaction:', error);
                    results.failed++;
                }
            });
            return results;
        }
        return this.saveTransactionBatchToFirestore(userId, transactions);
    }

    async updateTransaction(transactionId, updates) {
        const userId = this._getUserId();
        if (!userId) return;

        try {
            if (AppConfig.DEMO_MODE) {
                // ... (localStorage logic remains the same)
            } else {
                const { doc, updateDoc, serverTimestamp } = await getFirestoreModules();
                const docRef = doc(this.db, 'users', userId, 'transactions', transactionId);
                await updateDoc(docRef, {
                    ...updates,
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    // --- Firebase Operations ---
    async loadAccountsFromFirestore(userId) {
        const { collection, query, where, getDocs } = await getFirestoreModules();
        const q = query(collection(this.db, "users", userId, "accounts"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async saveAccountToFirestore(userId, account) {
        const { collection, addDoc, serverTimestamp } = await getFirestoreModules();
        const docRef = await addDoc(collection(this.db, "users", userId, "accounts"), {
            ...account,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...account };
    }

    async loadTransactionsFromFirestore(userId, limitCount) {
        const { collection, query, orderBy, limit as firestoreLimit, getDocs } = await getFirestoreModules();
        const q = query(
            collection(this.db, "users", userId, "transactions"),
            orderBy('date', 'desc'),
            firestoreLimit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async saveTransactionToFirestore(transaction) {
        const { collection, addDoc } = await getFirestoreModules();
        const docRef = await addDoc(collection(this.db, "users", transaction.userId, "transactions"), transaction);
        return { id: docRef.id, ...transaction };
    }

    async saveTransactionBatchToFirestore(userId, transactions) {
        const { writeBatch, doc, collection, serverTimestamp } = await getFirestoreModules();
        const batch = writeBatch(this.db);

        transactions.forEach(trans => {
            const docRef = doc(collection(this.db, "users", userId, "transactions"));
            batch.set(docRef, {
                ...trans,
                userId,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        return { success: transactions.length, failed: 0 };
    }

    // --- LocalStorage Operations ---
    loadFromLocalStorage(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    saveToLocalStorage(collectionKey, data) {
        const existing = this.loadFromLocalStorage(collectionKey, []);
        const newData = {
            ...data,
            id: data.id || `local_${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        existing.push(newData);
        localStorage.setItem(collectionKey, JSON.stringify(existing));
        return newData;
    }

    loadTransactionsFromLocalStorage(userId) {
        return this.loadFromLocalStorage(`demo-transactions-${userId}`, []);
    }

    saveTransactionToLocalStorage(collectionKey, transaction) {
        const transactions = this.loadFromLocalStorage(collectionKey, []);
        const newTransaction = {
            ...transaction,
            id: transaction.id || `local_${Date.now()}`
        };
        transactions.unshift(newTransaction);
        localStorage.setItem(collectionKey, JSON.stringify(transactions));
        return newTransaction;
    }
}
