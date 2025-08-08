// js/utils/DebugHelper.js
// Advanced debugging utilities for complex financial applications

export class DebugHelper {
    constructor(enableLogging = true) {
        this.enableLogging = enableLogging;
        this.logHistory = [];
        this.performanceMarks = new Map();
        
        // Initialize error tracking
        this.setupErrorHandling();
    }
    
    // ===== TRANSACTION DEBUGGING =====
    
    logTransaction(action, data, context = {}) {
        if (!this.enableLogging) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'TRANSACTION',
            action,
            data: this.sanitizeData(data),
            context,
            stackTrace: new Error().stack
        };
        
        this.logHistory.push(logEntry);
        
        console.group(`🔄 ${action.toUpperCase()}`);
        console.log('Data:', data);
        console.log('Context:', context);
        console.log('Time:', new Date().toLocaleTimeString());
        
        // Validate transaction data
        if (data && typeof data === 'object') {
            this.validateTransaction(data);
        }
        
        console.groupEnd();
    }
    
    validateTransaction(transaction) {
        const issues = [];
        
        if (!transaction.amount || isNaN(transaction.amount)) {
            issues.push('❌ Invalid amount');
        }
        
        if (!transaction.description?.trim()) {
            issues.push('❌ Missing description');
        }
        
        if (!transaction.account) {
            issues.push('❌ Missing account');
        }
        
        if (!transaction.date) {
            issues.push('❌ Missing date');
        }
        
        if (issues.length > 0) {
            console.warn('🚨 Transaction Validation Issues:', issues);
        } else {
            console.log('✅ Transaction validation passed');
        }
    }
    
    // ===== TRANSFER DEBUGGING =====
    
    logTransfer(fromAccount, toAccount, amount, description) {
        if (!this.enableLogging) return;
        
        console.group('💸 TRANSFER OPERATION');
        console.log(`From: ${fromAccount}`);
        console.log(`To: ${toAccount}`);
        console.log(`Amount: $${amount.toFixed(2)}`);
        console.log(`Description: ${description}`);
        
        // Validate transfer
        if (fromAccount === toAccount) {
            console.error('❌ Transfer to same account');
        }
        
        if (amount <= 0) {
            console.error('❌ Invalid transfer amount');
        }
        
        console.groupEnd();
    }
    
    // ===== ACCOUNT BALANCE DEBUGGING =====
    
    logBalanceChange(accountId, oldBalance, newBalance, reason) {
        if (!this.enableLogging) return;
        
        const change = newBalance - oldBalance;
        const changeType = change > 0 ? '📈' : '📉';
        
        console.log(`${changeType} Account ${accountId}: $${oldBalance.toFixed(2)} → $${newBalance.toFixed(2)} (${change > 0 ? '+' : ''}$${change.toFixed(2)}) - ${reason}`);
    }
    
    // ===== PERFORMANCE MONITORING =====
    
    startPerformanceTimer(operation) {
        this.performanceMarks.set(operation, performance.now());
    }
    
    endPerformanceTimer(operation) {
        const startTime = this.performanceMarks.get(operation);
        if (startTime) {
            const duration = performance.now() - startTime;
            console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
            this.performanceMarks.delete(operation);
            
            // Warn on slow operations
            if (duration > 1000) {
                console.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
            }
        }
    }
    
    // ===== CSV IMPORT DEBUGGING =====
    
    logCSVImport(filename, rowCount, errors = []) {
        console.group(`📄 CSV Import: ${filename}`);
        console.log(`Rows processed: ${rowCount}`);
        
        if (errors.length > 0) {
            console.warn(`Errors: ${errors.length}`);
            errors.forEach((error, index) => {
                console.error(`Row ${error.row}: ${error.message}`);
            });
        } else {
            console.log('✅ No errors');
        }
        
        console.groupEnd();
    }
    
    // ===== FIREBASE DEBUGGING =====
    
    logFirebaseOperation(operation, collection, documentId, data) {
        if (!this.enableLogging) return;
        
        console.group(`🔥 Firebase ${operation.toUpperCase()}`);
        console.log(`Collection: ${collection}`);
        if (documentId) console.log(`Document: ${documentId}`);
        if (data) console.log('Data:', data);
        console.groupEnd();
    }
    
    logFirebaseError(operation, error) {
        console.error(`🔥❌ Firebase ${operation} Error:`, error);
        
        // Common Firebase error explanations
        const errorExplanations = {
            'permission-denied': 'Check Firestore security rules',
            'unavailable': 'Network connectivity issue',
            'deadline-exceeded': 'Operation timed out',
            'unauthenticated': 'User not signed in'
        };
        
        if (errorExplanations[error.code]) {
            console.info(`💡 Tip: ${errorExplanations[error.code]}`);
        }
    }
    
    // ===== ANALYTICS DEBUGGING =====
    
    logMonthlyCalculation(month, year, results) {
        console.group(`📊 Monthly Calculation: ${month}/${year}`);
        console.table(results);
        
        // Verify totals add up
        const calculatedTotal = Object.values(results.byCategory || {})
            .reduce((sum, amount) => sum + amount, 0);
        
        if (Math.abs(calculatedTotal - (results.totalIncome - results.totalExpenses)) > 0.01) {
            console.warn('❌ Monthly calculation mismatch');
        }
        
        console.groupEnd();
    }
    
    // ===== ERROR HANDLING =====
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', event.reason);
        });
    }
    
    logError(type, error, context = {}) {
        console.error(`🚨 ${type}:`, error);
        console.error('Context:', context);
        
        const errorEntry = {
            timestamp: new Date().toISOString(),
            type: 'ERROR',
            error: error.message || error,
            stack: error.stack,
            context
        };
        
        this.logHistory.push(errorEntry);
        
        // In production, you might send this to an error tracking service
        // this.sendToErrorService(errorEntry);
    }
    
    // ===== UTILITY METHODS =====
    
    sanitizeData(data) {
        // Remove sensitive information for logging
        if (typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        
        // Remove or mask sensitive fields
        const sensitiveFields = ['password', 'token', 'ssn', 'account_number'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });
        
        return sanitized;
    }
    
    getLogHistory(filterType = null) {
        if (!filterType) return this.logHistory;
        return this.logHistory.filter(entry => entry.type === filterType);
    }
    
    exportLogs() {
        const logs = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            logs: this.logHistory
        };
        
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-tracker-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    // ===== ACCOUNT RECONCILIATION DEBUGGING =====
    
    validateAccountBalances(accounts, transactions) {
        console.group('🔍 Account Balance Validation');
        
        accounts.forEach(account => {
            const accountTransactions = transactions.filter(t => 
                t.account === account.id && t.type !== 'Transfer'
            );
            
            const calculatedBalance = accountTransactions.reduce((sum, t) => {
                return sum + (t.type === 'Income' ? t.amount : -Math.abs(t.amount));
            }, account.startingBalance || 0);
            
            const difference = Math.abs(account.balance - calculatedBalance);
            
            if (difference > 0.01) {
                console.warn(`❌ ${account.name}: Expected $${calculatedBalance.toFixed(2)}, Got $${account.balance.toFixed(2)} (Diff: $${difference.toFixed(2)})`);
            } else {
                console.log(`✅ ${account.name}: Balance matches`);
            }
        });
        
        console.groupEnd();
    }
    
    // ===== DEBUGGING DASHBOARD =====
    
    showDebugDashboard() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-dashboard';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            max-height: 400px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 10px;
            z-index: 9999;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-family: monospace;
            font-size: 12px;
        `;
        
        debugPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>Debug Dashboard</strong>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; cursor: pointer;">✕</button>
            </div>
            <div>
                <button onclick="debugHelper.exportLogs()" style="margin: 2px; padding: 4px 8px; font-size: 11px;">Export Logs</button>
                <button onclick="console.clear()" style="margin: 2px; padding: 4px 8px; font-size: 11px;">Clear Console</button>
            </div>
            <div style="margin-top: 10px;">
                <strong>Recent Activity:</strong>
                <div id="debug-recent-activity" style="max-height: 200px; overflow-y: auto; font-size: 10px;">
                    ${this.logHistory.slice(-10).map(entry => 
                        `<div style="margin: 2px 0; padding: 2px; background: #f5f5f5;">
                            ${entry.timestamp.split('T')[1].split('.')[0]} - ${entry.type}: ${entry.action || entry.error}
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(debugPanel);
    }
}

// Create global debug helper instance
export const debugHelper = new DebugHelper();

// Make it available globally for console access
window.debugHelper = debugHelper;

// Usage examples for your finance tracker:

/*
// In your transaction handling code:
debugHelper.logTransaction('ADD_TRANSACTION', transaction, { source: 'manual_entry' });

// In your transfer logic:
debugHelper.logTransfer('8529', '8895', 1250, 'Monthly investment transfer');

// In your CSV import:
debugHelper.logCSVImport('Chase_8529_Activity.csv', processedRows, errors);

// Performance monitoring:
debugHelper.startPerformanceTimer('monthly_calculation');
// ... your calculation code ...
debugHelper.endPerformanceTimer('monthly_calculation');

// Firebase operations:
debugHelper.logFirebaseOperation('UPDATE', 'transactions', transactionId, updateData);

// Show debug dashboard:
debugHelper.showDebugDashboard();
*/