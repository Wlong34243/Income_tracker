// DebugUtils.js - Comprehensive debugging utility for Finance Tracker
// Place this file in js/utils/DebugUtils.js

export class DebugUtils {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
        this.moduleStatus = {};
        console.log('%c🔍 Debug Utils Initialized', 'color: #4CAF50; font-weight: bold; font-size: 16px');
    }

    // ============================================
    // STEP 1: Check Module Loading
    // ============================================
    async checkModuleLoading() {
        console.group('%c📦 Module Loading Check', 'color: #2196F3; font-weight: bold');
        
        const modules = [
            'AppConfig', 'AuthService', 'DataService', 'EnhancedCSVImporter',
            'AnalyticsEngine', 'Dashboard', 'TransactionUI', 'Modal',
            'EnhancedDashboard', 'AIAssistant', 'NotificationManager',
            'SettingsManager', 'DuplicateDetector', 'transactionRules',
            'geminiService'
        ];

        for (const moduleName of modules) {
            try {
                // Check if module exists in window.financeApp or global scope
                const exists = window[moduleName] || 
                              (window.financeApp && window.financeApp[moduleName.toLowerCase()]) ||
                              false;
                
                this.moduleStatus[moduleName] = exists ? '✅ Loaded' : '❌ Missing';
                
                if (!exists) {
                    this.warnings.push(`Module ${moduleName} not found in global scope`);
                }
            } catch (error) {
                this.moduleStatus[moduleName] = '❌ Error';
                this.errors.push(`Error checking ${moduleName}: ${error.message}`);
            }
        }

        console.table(this.moduleStatus);
        console.groupEnd();
        return this.moduleStatus;
    }

    // ============================================
    // STEP 2: Check Firebase Configuration
    // ============================================
    checkFirebaseConfig() {
        console.group('%c🔥 Firebase Configuration Check', 'color: #FF9800; font-weight: bold');
        
        const checks = {
            'Firebase SDK Loaded': typeof firebase !== 'undefined',
            'Firebase Initialized': false,
            'Auth Service': false,
            'Firestore Service': false,
            'Current User': null,
            'Demo Mode': false
        };

        try {
            // Check if AppConfig exists and demo mode
            if (typeof AppConfig !== 'undefined') {
                checks['Demo Mode'] = AppConfig.DEMO_MODE || false;
            }

            if (typeof firebase !== 'undefined') {
                // Check if Firebase is initialized
                if (firebase.apps && firebase.apps.length > 0) {
                    checks['Firebase Initialized'] = true;
                    
                    // Check auth
                    if (firebase.auth) {
                        checks['Auth Service'] = true;
                        const currentUser = firebase.auth().currentUser;
                        checks['Current User'] = currentUser ? currentUser.email : 'Not logged in';
                    }
                    
                    // Check Firestore
                    if (firebase.firestore) {
                        checks['Firestore Service'] = true;
                    }
                }
            }
        } catch (error) {
            this.errors.push(`Firebase check error: ${error.message}`);
        }

        console.table(checks);
        console.groupEnd();
        return checks;
    }

    // ============================================
    // STEP 3: Check Data Service Methods
    // ============================================
    async checkDataService() {
        console.group('%c💾 Data Service Check', 'color: #9C27B0; font-weight: bold');
        
        const results = {
            'DataService Exists': false,
            'Has loadAccounts': false,
            'Has loadTransactions': false,
            'Has saveTransaction': false,
            'Has addTransactions': false,
            'Has saveTransactionBatch': false,
            'Has updateTransaction': false,
            'Has updateAccountBalance': false,
            'Has getAllTransactions': false
        };

        try {
            if (window.financeApp && window.financeApp.dataService) {
                const ds = window.financeApp.dataService;
                results['DataService Exists'] = true;
                
                // Check methods
                results['Has loadAccounts'] = typeof ds.loadAccounts === 'function';
                results['Has loadTransactions'] = typeof ds.loadTransactions === 'function';
                results['Has saveTransaction'] = typeof ds.saveTransaction === 'function';
                results['Has addTransactions'] = typeof ds.addTransactions === 'function';
                results['Has saveTransactionBatch'] = typeof ds.saveTransactionBatch === 'function';
                results['Has updateTransaction'] = typeof ds.updateTransaction === 'function';
                results['Has updateAccountBalance'] = typeof ds.updateAccountBalance === 'function';
                results['Has getAllTransactions'] = typeof ds.getAllTransactions === 'function';
                
                // Test load operations
                if (results['Has loadAccounts']) {
                    try {
                        const accounts = await ds.loadAccounts();
                        console.log(`📊 Loaded ${accounts.length} accounts`);
                    } catch (error) {
                        this.errors.push(`loadAccounts failed: ${error.message}`);
                    }
                }
                
                if (results['Has loadTransactions']) {
                    try {
                        const transactions = await ds.loadTransactions();
                        console.log(`📊 Loaded ${transactions.length} transactions`);
                    } catch (error) {
                        this.errors.push(`loadTransactions failed: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            this.errors.push(`DataService check error: ${error.message}`);
        }

        console.table(results);
        console.groupEnd();
        return results;
    }

    // ============================================
    // STEP 4: Check CSV Importer
    // ============================================
    checkCSVImporter() {
        console.group('%c📁 CSV Importer Check', 'color: #00BCD4; font-weight: bold');
        
        const results = {
            'CSVImporter Exists': false,
            'Has dataService': false,
            'Modal in DOM': false,
            'Drop Zone in DOM': false,
            'File Input in DOM': false,
            'PapaParse Loaded': false
        };

        try {
            // Check if CSVImporter exists
            if (window.financeApp && window.financeApp.csvImporter) {
                results['CSVImporter Exists'] = true;
                results['Has dataService'] = !!window.financeApp.csvImporter.dataService;
            }
            
            // Check DOM elements
            results['Modal in DOM'] = !!document.getElementById('importModal');
            results['Drop Zone in DOM'] = !!document.getElementById('dropZone');
            results['File Input in DOM'] = !!document.getElementById('csvFile');
            
            // Check PapaParse
            results['PapaParse Loaded'] = typeof Papa !== 'undefined';
            
        } catch (error) {
            this.errors.push(`CSV Importer check error: ${error.message}`);
        }

        console.table(results);
        console.groupEnd();
        return results;
    }

    // ============================================
    // STEP 5: Fix Missing addTransactions Method
    // ============================================
    fixAddTransactionsMethod() {
        console.group('%c🔧 Fixing addTransactions Method', 'color: #FF5722; font-weight: bold');
        
        try {
            if (window.financeApp && window.financeApp.dataService) {
                const ds = window.financeApp.dataService;
                
                // Check if method already exists
                if (typeof ds.addTransactions === 'function') {
                    console.log('✅ addTransactions method already exists');
                    return true;
                }
                
                // Add the missing method
                ds.addTransactions = async function(transactions) {
                    console.log(`Adding ${transactions.length} transactions...`);
                    
                    if (!transactions || transactions.length === 0) {
                        throw new Error('No transactions to add');
                    }
                    
                    // Use batch method if available
                    if (typeof this.saveTransactionBatch === 'function') {
                        return await this.saveTransactionBatch(transactions);
                    }
                    
                    // Otherwise, add one by one
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
                    
                    console.log(`✅ Added ${results.success} transactions, ${results.failed} failed`);
                    return results;
                }.bind(ds);
                
                console.log('✅ addTransactions method added successfully');
                return true;
            } else {
                console.error('❌ Cannot add method: DataService not found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error fixing addTransactions:', error);
            return false;
        } finally {
            console.groupEnd();
        }
    }

    // ============================================
    // STEP 6: Fix Missing getAllTransactions Method
    // ============================================
    fixGetAllTransactionsMethod() {
        console.group('%c🔧 Fixing getAllTransactions Method', 'color: #FF5722; font-weight: bold');
        
        try {
            if (window.financeApp && window.financeApp.dataService) {
                const ds = window.financeApp.dataService;
                
                // Check if method already exists
                if (typeof ds.getAllTransactions === 'function') {
                    console.log('✅ getAllTransactions method already exists');
                    return true;
                }
                
                // Add the missing method
                ds.getAllTransactions = async function() {
                    console.log('Getting all transactions...');
                    
                    // Use existing loadTransactions method
                    if (typeof this.loadTransactions === 'function') {
                        return await this.loadTransactions(10000); // Large limit to get all
                    }
                    
                    // Fallback to getTransactions if available
                    if (typeof this.getTransactions === 'function') {
                        return await this.getTransactions(10000);
                    }
                    
                    console.warn('No transaction loading method available');
                    return [];
                }.bind(ds);
                
                console.log('✅ getAllTransactions method added successfully');
                return true;
            } else {
                console.error('❌ Cannot add method: DataService not found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error fixing getAllTransactions:', error);
            return false;
        } finally {
            console.groupEnd();
        }
    }

    // ============================================
    // STEP 7: Check Dashboard and UI
    // ============================================
    checkDashboardAndUI() {
        console.group('%c📊 Dashboard & UI Check', 'color: #4CAF50; font-weight: bold');
        
        const results = {
            'Dashboard Tab': !!document.querySelector('[data-tab="dashboard"]'),
            'Transactions Tab': !!document.querySelector('[data-tab="transactions"]'),
            'Import Tab': !!document.querySelector('[data-tab="import"]'),
            'Analytics Tab': !!document.querySelector('[data-tab="analytics"]'),
            'Dashboard Content': !!document.getElementById('dashboardContent'),
            'Transaction List': !!document.getElementById('transactionList'),
            'Add Transaction Button': !!document.getElementById('addTransactionBtn'),
            'Import Button': !!document.getElementById('importTransactionsBtn'),
            'Update Balances Button': !!document.getElementById('updateBalancesBtn')
        };

        console.table(results);
        console.groupEnd();
        return results;
    }

    // ============================================
    // STEP 8: Test CSV Import Flow
    // ============================================
    async testCSVImport() {
        console.group('%c🧪 Testing CSV Import', 'color: #795548; font-weight: bold');
        
        // Create test CSV data
        const testCSV = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2025,01/16/2025,RENTAL INCOME - TENANT 1,Rental Income,Sale,2500.00,
01/16/2025,01/17/2025,PROPERTY TAX,Property Expenses,Sale,-1200.00,
01/17/2025,01/18/2025,TECH CONSULTING PAYMENT,Consulting,Sale,5000.00,`;

        console.log('Test CSV Data:', testCSV);

        try {
            if (window.financeApp && window.financeApp.csvImporter) {
                const importer = window.financeApp.csvImporter;
                
                // Test parsing
                const transactions = importer.parseCSV(testCSV, '8529');
                console.log('Parsed transactions:', transactions);
                
                if (transactions.length > 0) {
                    console.log('✅ CSV parsing works');
                    return true;
                } else {
                    console.error('❌ No transactions parsed');
                    return false;
                }
            } else {
                console.error('❌ CSV Importer not available');
                return false;
            }
        } catch (error) {
            console.error('❌ CSV test failed:', error);
            return false;
        } finally {
            console.groupEnd();
        }
    }

    // ============================================
    // MAIN: Run All Diagnostics
    // ============================================
    async runFullDiagnostics() {
        console.clear();
        console.log('%c🚀 FINANCE TRACKER DIAGNOSTICS', 
                    'color: white; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); padding: 10px 20px; font-size: 20px; font-weight: bold; border-radius: 5px');
        
        console.log('\n%c⏱️ Starting diagnostic sequence...', 'color: #9E9E9E; font-style: italic');
        
        const diagnostics = {
            modules: await this.checkModuleLoading(),
            firebase: this.checkFirebaseConfig(),
            dataService: await this.checkDataService(),
            csvImporter: this.checkCSVImporter(),
            dashboard: this.checkDashboardAndUI()
        };

        // Apply fixes if needed
        if (!diagnostics.dataService['Has addTransactions']) {
            console.log('\n%c🔧 Applying fix for addTransactions...', 'color: #FF9800');
            this.fixAddTransactionsMethod();
        }

        if (!diagnostics.dataService['Has getAllTransactions']) {
            console.log('\n%c🔧 Applying fix for getAllTransactions...', 'color: #FF9800');
            this.fixGetAllTransactionsMethod();
        }

        // Run CSV test
        console.log('\n%c🧪 Running CSV import test...', 'color: #607D8B');
        const csvTestResult = await this.testCSVImport();

        // Summary
        console.log('\n%c📋 DIAGNOSTIC SUMMARY', 'color: white; background: #333; padding: 10px; font-size: 16px; font-weight: bold');
        
        if (this.errors.length > 0) {
            console.group('%c❌ Errors Found:', 'color: #F44336; font-weight: bold');
            this.errors.forEach(error => console.error(error));
            console.groupEnd();
        }

        if (this.warnings.length > 0) {
            console.group('%c⚠️ Warnings:', 'color: #FFC107; font-weight: bold');
            this.warnings.forEach(warning => console.warn(warning));
            console.groupEnd();
        }

        const allChecks = [
            diagnostics.firebase['Firebase SDK Loaded'],
            diagnostics.dataService['DataService Exists'],
            diagnostics.csvImporter['CSVImporter Exists'],
            csvTestResult
        ];

        if (allChecks.every(check => check)) {
            console.log('%c✅ All critical systems operational!', 'color: #4CAF50; font-size: 16px; font-weight: bold');
        } else {
            console.log('%c⚠️ Some issues detected. Review the logs above.', 'color: #FF9800; font-size: 16px; font-weight: bold');
        }

        return {
            diagnostics,
            errors: this.errors,
            warnings: this.warnings,
            csvTest: csvTestResult
        };
    }

    // ============================================
    // Quick Fix Helper
    // ============================================
    async quickFix() {
        console.log('%c🔧 Applying Quick Fixes...', 'color: #2196F3; font-weight: bold; font-size: 16px');
        
        // Fix missing methods
        this.fixAddTransactionsMethod();
        this.fixGetAllTransactionsMethod();
        
        // Refresh data if possible
        if (window.financeApp && window.financeApp.refreshDataAndViews) {
            console.log('Refreshing data and views...');
            await window.financeApp.refreshDataAndViews();
        }
        
        console.log('%c✅ Quick fixes applied!', 'color: #4CAF50; font-weight: bold');
    }
}

// Auto-initialize and attach to window for easy access
window.debugUtils = new DebugUtils();

// Provide console instructions
console.log('%c📘 Debug Utils Ready!', 'color: #2196F3; font-weight: bold');
console.log('Available commands:');
console.log('  %cdebugUtils.runFullDiagnostics()%c - Run complete system check', 'color: #4CAF50; font-family: monospace', 'color: inherit');
console.log('  %cdebugUtils.quickFix()%c - Apply automatic fixes', 'color: #4CAF50; font-family: monospace', 'color: inherit');
console.log('  %cdebugUtils.checkModuleLoading()%c - Check module status', 'color: #4CAF50; font-family: monospace', 'color: inherit');
console.log('  %cdebugUtils.testCSVImport()%c - Test CSV import', 'color: #4CAF50; font-family: monospace', 'color: inherit');