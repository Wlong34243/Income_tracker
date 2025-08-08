// js/utils/TestFramework.js
// Lightweight testing framework for finance tracker validation

export class FinanceTestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    // ===== TEST DEFINITION METHODS =====
    
    describe(description, testFunction) {
        console.group(`🧪 ${description}`);
        testFunction();
        console.groupEnd();
    }
    
    test(description, testFunction) {
        try {
            testFunction();
            this.logSuccess(description);
            this.results.push({ description, status: 'PASS' });
        } catch (error) {
            this.logFailure(description, error);
            this.results.push({ description, status: 'FAIL', error: error.message });
        }
    }
    
    // ===== ASSERTION METHODS =====
    
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }
    
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }
    
    assertAlmostEqual(actual, expected, tolerance = 0.01, message) {
        if (Math.abs(actual - expected) > tolerance) {
            throw new Error(message || `Expected ${expected} ± ${tolerance}, got ${actual}`);
        }
    }
    
    assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} > ${expected}`);
        }
    }
    
    assertArrayEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Arrays don't match: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
        }
    }
    
    // ===== FINANCE-SPECIFIC TESTS =====
    
    validateTransfer(fromTransaction, toTransaction) {
        this.test('Transfer validation', () => {
            // Amounts should be opposite
            this.assertAlmostEqual(
                Math.abs(fromTransaction.amount), 
                Math.abs(toTransaction.amount),
                0.01,
                'Transfer amounts must match'
            );
            
            // One should be positive, one negative
            this.assert(
                (fromTransaction.amount < 0 && toTransaction.amount > 0) ||
                (fromTransaction.amount > 0 && toTransaction.amount < 0),
                'Transfer amounts should have opposite signs'
            );
            
            // Dates should be the same
            this.assertEqual(
                fromTransaction.date,
                toTransaction.date,
                'Transfer dates must match'
            );
        });
    }
    
    validateAccountBalance(account, transactions) {
        this.test(`Account balance validation: ${account.name}`, () => {
            const accountTransactions = transactions.filter(t => t.account === account.id);
            
            let calculatedBalance = account.startingBalance || 0;
            
            accountTransactions.forEach(transaction => {
                if (transaction.type === 'Income') {
                    calculatedBalance += transaction.amount;
                } else if (transaction.type === 'Expense') {
                    calculatedBalance -= Math.abs(transaction.amount);
                } else if (transaction.type === 'Transfer') {
                    calculatedBalance += transaction.amount; // Can be positive or negative
                }
            });
            
            this.assertAlmostEqual(
                account.balance,
                calculatedBalance,
                0.01,
                `Account ${account.name} balance mismatch: Expected ${calculatedBalance}, got ${account.balance}`
            );
        });
    }
    
    validateMonthlyTotals(monthlyData) {
        this.test('Monthly totals validation', () => {
            const { income, expenses, net, byCategory } = monthlyData;
            
            // Net should equal income minus expenses
            this.assertAlmostEqual(net, income - expenses, 0.01, 'Net calculation incorrect');
            
            // Category totals should sum to totals
            const categoryIncomeSum = Object.entries(byCategory)
                .filter(([cat, amount]) => amount > 0)
                .reduce((sum, [cat, amount]) => sum + amount, 0);
                
            const categoryExpenseSum = Object.entries(byCategory)
                .filter(([cat, amount]) => amount < 0)
                .reduce((sum, [cat, amount]) => sum + Math.abs(amount), 0);
            
            this.assertAlmostEqual(income, categoryIncomeSum, 0.01, 'Income category sum mismatch');
            this.assertAlmostEqual(expenses, categoryExpenseSum, 0.01, 'Expense category sum mismatch');
        });
    }
    
    // ===== BUSINESS LOGIC TESTS =====
    
    runBusinessLogicTests(testData) {
        this.describe('Business Logic Validation', () => {
            
            // Test 1: Real Estate Income Recognition
            this.test('Real Estate income from account 0111', () => {
                const realEstateIncome = testData.transactions
                    .filter(t => t.account === '0111' && t.type === 'Income')
                    .reduce((sum, t) => sum + t.amount, 0);
                    
                this.assertGreaterThan(realEstateIncome, 0, 'Should have real estate income');
            });
            
            // Test 2: Monthly Investment Transfer
            this.test('Monthly $1,250 investment transfer', () => {
                const investmentTransfers = testData.transactions
                    .filter(t => 
                        t.fromAccount === '8529' && 
                        t.toAccount === '8895' && 
                        Math.abs(t.amount) === 1250
                    );
                    
                this.assertGreaterThan(investmentTransfers.length, 0, 'Should have monthly investment transfers');
            });
            
            // Test 3: Health Insurance Payment
            this.test('Monthly health insurance payment', () => {
                const healthPayments = testData.transactions
                    .filter(t => 
                        t.account === '7588' && 
                        t.description.toLowerCase().includes('health') &&
                        Math.abs(t.amount) === 1367
                    );
                    
                this.assertGreaterThan(healthPayments.length, 0, 'Should have health insurance payments');
            });
            
            // Test 4: HSA Contributions
            this.test('Monthly HSA contributions', () => {
                const hsaContributions = testData.transactions
                    .filter(t => 
                        t.account === '7588' && 
                        t.description.toLowerCase().includes('hsa') &&
                        Math.abs(t.amount) === 750
                    );
                    
                this.assertGreaterThan(hsaContributions.length, 0, 'Should have HSA contributions');
            });
        });
    }
    
    // ===== CSV IMPORT VALIDATION =====
    
    validateCSVImport(originalData, importedTransactions) {
        this.describe('CSV Import Validation', () => {
            
            this.test('All rows processed', () => {
                this.assertEqual(
                    importedTransactions.length,
                    originalData.length,
                    'Should import all valid rows'
                );
            });
            
            this.test('Amount parsing', () => {
                importedTransactions.forEach((transaction, index) => {
                    this.assert(
                        !isNaN(transaction.amount),
                        `Row ${index + 1}: Amount should be numeric`
                    );
                    
                    this.assert(
                        isFinite(transaction.amount),
                        `Row ${index + 1}: Amount should be finite`
                    );
                });
            });
            
            this.test('Date parsing', () => {
                importedTransactions.forEach((transaction, index) => {
                    this.assert(
                        transaction.date instanceof Date || !isNaN(Date.parse(transaction.date)),
                        `Row ${index + 1}: Date should be valid`
                    );
                });
            });
            
            this.test('Account assignment', () => {
                importedTransactions.forEach((transaction, index) => {
                    this.assert(
                        transaction.account && transaction.account.length > 0,
                        `Row ${index + 1}: Should have account assigned`
                    );
                });
            });
        });
    }
    
    // ===== DUPLICATE DETECTION TESTS =====
    
    testDuplicateDetection(transactions, duplicateDetector) {
        this.describe('Duplicate Detection', () => {
            
            // Create test duplicates
            const testTransaction = transactions[0];
            const exactDuplicate = { ...testTransaction };
            const nearDuplicate = { 
                ...testTransaction, 
                amount: testTransaction.amount + 0.001 // Very small difference
            };
            
            const testSet = [testTransaction, exactDuplicate, nearDuplicate];
            
            this.test('Exact duplicate detection', () => {
                const duplicates = duplicateDetector.findDuplicates(testSet);
                this.assertGreaterThan(duplicates.length, 0, 'Should detect exact duplicates');
            });
            
            this.test('Near duplicate detection', () => {
                const duplicates = duplicateDetector.findNearDuplicates(testSet, 0.95);
                this.assertGreaterThan(duplicates.length, 0, 'Should detect near duplicates');
            });
        });
    }
    
    // ===== REPORTING AND UTILITIES =====
    
    logSuccess(description) {
        console.log(`✅ ${description}`);
    }
    
    logFailure(description, error) {
        console.error(`❌ ${description}: ${error.message}`);
    }
    
    generateTestReport() {
        const totalTests = this.results.length;
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = totalTests - passed;
        
        console.group('📊 Test Report');
        console.log(`Total: ${totalTests}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / totalTests) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.group('❌ Failed Tests');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(result => {
                    console.error(`${result.description}: ${result.error}`);
                });
            console.groupEnd();
        }
        
        console.groupEnd();
        
        return {
            total: totalTests,
            passed,
            failed,
            successRate: (passed / totalTests) * 100,
            results: this.results
        };
    }
    
    // ===== SAMPLE DATA GENERATORS =====
    
    generateSampleTransactions() {
        return [
            {
                id: '1',
                date: '2024-01-01',
                description: 'Rent - 5th St Property',
                amount: 1200,
                type: 'Income',
                account: '0111',
                category: 'Rental Income'
            },
            {
                id: '2',
                date: '2024-01-01',
                description: 'Monthly Investment Transfer',
                amount: -1250,
                type: 'Transfer',
                account: '8529',
                toAccount: '8895'
            },
            {
                id: '3',
                date: '2024-01-01',
                description: 'Health Insurance',
                amount: -1367,
                type: 'Expense',
                account: '7588',
                category: 'Insurance'
            }
        ];
    }
    
    generateSampleAccounts() {
        return [
            {
                id: '0111',
                name: 'Sweep Account',
                type: 'Checking',
                balance: 5000,
                startingBalance: 0
            },
            {
                id: '8529',
                name: 'Real Estate Ops',
                type: 'Business',
                balance: 15000,
                startingBalance: 10000
            }
        ];
    }
}

// Export singleton instance
export const testFramework = new FinanceTestFramework();

// Make available globally for console testing
window.testFramework = testFramework;

// Example usage:
/*
// Run business logic tests
const sampleData = {
    transactions: testFramework.generateSampleTransactions(),
    accounts: testFramework.generateSampleAccounts()
};

testFramework.runBusinessLogicTests(sampleData);

// Validate account balances
sampleData.accounts.forEach(account => {
    testFramework.validateAccountBalance(account, sampleData.transactions);
});

// Generate report
const report = testFramework.generateTestReport();
console.log('Test completed:', report);
*/