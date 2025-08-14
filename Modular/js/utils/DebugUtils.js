// js/utils/AppDebugger.js
export class AppDebugger {
    static async fullDiagnostic() {
        console.group('%c🔍 FULL APP DIAGNOSTIC', 'background: #222; color: #bada55; font-size: 14px; padding: 5px');
        
        // 1. Check Firebase Auth
        console.group('🔐 Authentication Status');
        try {
            if (window.app?.authService?.auth) {
                const user = window.app.authService.currentUser;
                console.log('User:', user ? `${user.email} (${user.uid})` : 'Not logged in');
                if (user) {
                    console.log('User ID:', user.uid);
                }
            } else {
                console.error('Auth service not initialized');
            }
        } catch (e) {
            console.error('Auth check failed:', e);
        }
        console.groupEnd();

        // 2. Check Firestore Data
        console.group('📦 Firestore Data Check');
        if (window.app?.dataService) {
            try {
                // Try to load accounts directly
                const accounts = await window.app.dataService.loadAccounts();
                console.log(`Accounts loaded: ${accounts.length}`);
                if (accounts.length > 0) {
                    console.table(accounts.slice(0, 3));
                }

                // Try to load transactions directly
                const transactions = await window.app.dataService.loadTransactions(10);
                console.log(`Transactions loaded: ${transactions.length}`);
                if (transactions.length > 0) {
                    console.table(transactions.slice(0, 3));
                }
            } catch (e) {
                console.error('Data loading failed:', e);
            }
        } else {
            console.error('DataService not initialized');
        }
        console.groupEnd();

        // 3. Check Categories
        console.group('🏷️ Categories Check');
        if (window.categoryIntegration?.categoryManager) {
            const cm = window.categoryIntegration.categoryManager;
            console.log('Categories loaded:', cm.categories?.length || 0);
            if (cm.categories?.length > 0) {
                console.log('Sample categories:');
                console.table(cm.categories.slice(0, 5).map(c => ({
                    id: c.id,
                    category: c.category,
                    subcategory: c.subcategory,
                    entity: c.entity
                })));
            }
            console.log('AutoTag Rules:', cm.autoTagRules?.size || 0);
        } else {
            console.error('CategoryManager not found');
            
            // Try to initialize it manually
            console.log('Attempting manual category load...');
            try {
                const { CategoryManager } = await import('./js/categorization/CategoryManager.js');
                const tempCM = new CategoryManager(window.app?.dataService, window.app?.config);
                await tempCM.init();
                console.log('Manual load - Categories:', tempCM.categories?.length || 0);
            } catch (e) {
                console.error('Manual category load failed:', e);
            }
        }
        console.groupEnd();

        // 4. Check DOM Elements
        console.group('🎨 DOM Elements Check');
        const elements = {
            'Main App': document.getElementById('mainApp'),
            'Dashboard': document.getElementById('dashboard-container'),
            'Transactions': document.getElementById('transactions-container'),
            'Category Button': document.getElementById('categoryManagementBtn'),
            'Settings Button': document.getElementById('settingsBtn')
        };
        for (const [name, element] of Object.entries(elements)) {
            console.log(`${name}:`, element ? '✅ Found' : '❌ Missing');
        }
        console.groupEnd();

        // 5. Check localStorage
        console.group('💾 LocalStorage Check');
        const keys = ['expense_categories', 'gemini_api_key', 'property_list'];
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    const parsed = JSON.parse(value);
                    console.log(`${key}:`, Array.isArray(parsed) ? `${parsed.length} items` : 'Object stored');
                } catch {
                    console.log(`${key}:`, 'String value stored');
                }
            } else {
                console.log(`${key}:`, '❌ Not found');
            }
        }
        console.groupEnd();

        console.groupEnd();
    }

    static async testCategoryManager() {
        console.group('🧪 Testing CategoryManager Directly');
        
        try {
            // Import and create a fresh instance
            const { CategoryManager } = await import('./js/categorization/CategoryManager.js');
            const testCM = new CategoryManager(window.app?.dataService, window.app?.config);
            
            console.log('Loading categories...');
            await testCM.loadCategories();
            
            console.log('Categories loaded:', testCM.categories.length);
            if (testCM.categories.length === 0) {
                console.log('No categories found, using defaults');
                testCM.categories = testCM.getDefaultCategories();
                console.log('Default categories:', testCM.categories.length);
            }
            
            // Test categorization
            const testTransaction = {
                description: 'Rent payment from tenant',
                amount: 1500,
                accountId: '0111'
            };
            
            const result = testCM.categorizeTransaction(testTransaction);
            console.log('Test categorization:', result);
            
            return testCM;
        } catch (e) {
            console.error('CategoryManager test failed:', e);
        }
        
        console.groupEnd();
    }

    static checkFirestoreStructure() {
        console.group('🗂️ Checking Firestore Structure');
        
        if (!window.app?.dataService?.db) {
            console.error('Firestore not initialized');
            return;
        }

        const userId = window.app.authService?.currentUser?.uid;
        if (!userId) {
            console.error('No user logged in');
            return;
        }

        console.log('User ID:', userId);
        console.log('Expected paths:');
        console.log(`  - users/${userId}/accounts`);
        console.log(`  - users/${userId}/transactions`);
        console.log(`  - users/${userId}/settings/categories`);
        
        console.groupEnd();
    }
}

// Make it globally available
window.AppDebugger = AppDebugger;

// Auto-run diagnostic on load if in debug mode
if (window.location.search.includes('debug=true')) {
    setTimeout(() => {
        console.log('Running auto-diagnostic...');
        AppDebugger.fullDiagnostic();
    }, 2000);
}