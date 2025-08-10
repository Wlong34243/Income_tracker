// Enhanced Transaction Categorizer - Integration with Modular App
// File: js/categorization/CategoryManager.js

export class CategoryManager {
    constructor() {
        this.categories = [];
        this.autoTagRules = new Map();
        this.init();
    }

    async init() {
        await this.loadCategories();
        this.buildAutoTagRules();
    }

    async loadCategories() {
        // Load from localStorage/Firestore with fallback to default categories
        const stored = localStorage.getItem('expense_categories');

        if (stored) {
            this.categories = JSON.parse(stored);
        } else {
            // Load default categories
            this.categories = this.getDefaultCategories();
            await this.saveCategories();
        }
    }

    getDefaultCategories() {
        return [
            // Income Categories
            {
                id: 'income_rent',
                category: 'Income',
                subcategory: 'Rent Received',
                entity: 'Real Estate',
                autoTagKeywords: ['rent', 'rental income', 'monthly rent', 'sevilla', 'johnson', 'smith'],
                taxCategory: 'Schedule_E',
                description: 'Monthly rental payments from tenants',
                accountIds: ['0111', '8529']
            },
            {
                id: 'income_tech',
                category: 'Income',
                subcategory: 'Tech Audit Fees',
                entity: 'Tech Business',
                autoTagKeywords: ['packerthomas', 'consulting', 'audit', 'professional services'],
                taxCategory: 'Schedule_C',
                description: 'Technology auditing service income',
                accountIds: ['7991']
            },
            {
                id: 'income_investment',
                category: 'Income',
                subcategory: 'Investment Income',
                entity: 'Personal',
                autoTagKeywords: ['dividend', 'interest', 'capital gains', 'schwab'],
                taxCategory: 'Schedule_D',
                description: 'Investment dividends and interest',
                accountIds: ['119', '8895']
            },

            // Utilities Categories
            {
                id: 'utilities_electric',
                category: 'Utilities',
                subcategory: 'Electric',
                entity: 'Real Estate',
                autoTagKeywords: ['electric', 'electricity', 'power', 'pge', 'duke energy'],
                taxCategory: 'Schedule_E',
                description: 'Electrical service for rental properties',
                accountIds: ['8529']
            },
            {
                id: 'utilities_internet',
                category: 'Utilities',
                subcategory: 'Internet/Cable',
                entity: 'Real Estate',
                autoTagKeywords: ['vyve', 'frontier', 'internet', 'cable', 'wifi', 'comcast', 'spectrum'],
                taxCategory: 'Schedule_E',
                description: 'Internet and cable service',
                accountIds: ['8529']
            },
            {
                id: 'utilities_water',
                category: 'Utilities',
                subcategory: 'Water/Sewer',
                entity: 'Real Estate',
                autoTagKeywords: ['water', 'sewer', 'waste management'],
                taxCategory: 'Schedule_E',
                description: 'Water and sewer service',
                accountIds: ['8529']
            },

            // Insurance Categories
            {
                id: 'insurance_property',
                category: 'Insurance',
                subcategory: 'Property Insurance',
                entity: 'Real Estate',
                autoTagKeywords: ['property insurance', 'homeowners', 'dwelling', 'allstate'],
                taxCategory: 'Schedule_E',
                description: 'Property insurance premiums',
                accountIds: ['8529']
            },
            {
                id: 'insurance_health',
                category: 'Insurance',
                subcategory: 'Health Insurance',
                entity: 'Personal',
                autoTagKeywords: ['health insurance', 'medical insurance', 'bcbs', 'blue cross'],
                taxCategory: 'Personal',
                description: 'Personal health insurance premiums',
                accountIds: ['7588'],
                expectedAmount: -1367
            },
            {
                id: 'insurance_auto',
                category: 'Insurance',
                subcategory: 'Car Insurance',
                entity: 'Personal',
                autoTagKeywords: ['auto insurance', 'car insurance', 'vehicle', 'geico', 'state farm'],
                taxCategory: 'Personal',
                description: 'Vehicle insurance premiums',
                accountIds: ['8529', '7588']
            },

            // Maintenance Categories
            {
                id: 'maintenance_plumbing',
                category: 'Maintenance',
                subcategory: 'Plumbing',
                entity: 'Real Estate',
                autoTagKeywords: ['plumber', 'plumbing', 'pipe', 'drain', 'toilet', 'water leak'],
                taxCategory: 'Schedule_E',
                description: 'Plumbing repairs and maintenance',
                accountIds: ['8529']
            },
            {
                id: 'maintenance_hvac',
                category: 'Maintenance',
                subcategory: 'HVAC',
                entity: 'Real Estate',
                autoTagKeywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac repair'],
                taxCategory: 'Schedule_E',
                description: 'HVAC service and repairs',
                accountIds: ['8529']
            },
            {
                id: 'maintenance_lawn',
                category: 'Maintenance',
                subcategory: 'Landscaping',
                entity: 'Real Estate',
                autoTagKeywords: ['lawn', 'landscaping', 'yard', 'mowing', 'trimming', 'grass'],
                taxCategory: 'Schedule_E',
                description: 'Lawn care and landscaping services',
                accountIds: ['8529']
            },

            // Financial Categories
            {
                id: 'financial_hsa',
                category: 'Financial',
                subcategory: 'HSA Contribution',
                entity: 'Personal',
                autoTagKeywords: ['hsa', 'health savings'],
                taxCategory: 'Personal',
                description: 'Health Savings Account contributions',
                accountIds: ['7588'],
                expectedAmount: -750
            },
            {
                id: 'financial_investment',
                category: 'Financial',
                subcategory: 'Investment Transfer',
                entity: 'Personal',
                autoTagKeywords: ['schwab', 'investment', 'brokerage'],
                taxCategory: 'Personal',
                description: 'Transfers to investment accounts',
                accountIds: ['8529', '7991'],
                expectedAmount: -1250
            },
            {
                id: 'financial_mortgage',
                category: 'Financial',
                subcategory: 'Mortgage Interest',
                entity: 'Real Estate',
                autoTagKeywords: ['mortgage', 'interest', 'loan interest'],
                taxCategory: 'Schedule_E',
                description: 'Mortgage interest payments',
                accountIds: ['8529']
            },

            // Personal Categories
            {
                id: 'personal_netflix',
                category: 'Personal',
                subcategory: 'Entertainment',
                entity: 'Personal',
                autoTagKeywords: ['netflix', 'streaming', 'hulu', 'disney', 'spotify'],
                taxCategory: 'Personal',
                description: 'Entertainment subscriptions',
                accountIds: ['8529', '2433']
            },
            {
                id: 'personal_groceries',
                category: 'Personal',
                subcategory: 'Groceries',
                entity: 'Personal',
                autoTagKeywords: ['grocery', 'walmart', 'kroger', 'food', 'supermarket'],
                taxCategory: 'Personal',
                description: 'Personal grocery expenses',
                accountIds: ['2433']
            },
            {
                id: 'personal_phone',
                category: 'Personal',
                subcategory: 'Phone',
                entity: 'Personal',
                autoTagKeywords: ['phone', 'cell phone', 'mobile', 'verizon', 'att', 'tmobile'],
                taxCategory: 'Personal',
                description: 'Phone service',
                accountIds: ['8529', '2433']
            },

            // Business Categories
            {
                id: 'business_office',
                category: 'Office',
                subcategory: 'Office Supplies',
                entity: 'Tech Business',
                autoTagKeywords: ['office supplies', 'paper', 'pens', 'supplies'],
                taxCategory: 'Schedule_C',
                description: 'Office supplies and materials',
                accountIds: ['2299']
            },
            {
                id: 'business_software',
                category: 'Office',
                subcategory: 'Software',
                entity: 'Tech Business',
                autoTagKeywords: ['software', 'saas', 'microsoft', 'adobe', 'subscription'],
                taxCategory: 'Schedule_C',
                description: 'Software and technology subscriptions',
                accountIds: ['2299']
            },

            // Transfer Categories
            {
                id: 'transfer_internal',
                category: 'Transfers',
                subcategory: 'Internal_Transfer',
                entity: 'All',
                autoTagKeywords: ['transfer', 'deposit', 'withdrawal', 'internal'],
                taxCategory: 'Exclude',
                description: 'Internal transfers between accounts',
                accountIds: ['all']
            },
            {
                id: 'transfer_credit_payment',
                category: 'Transfers',
                subcategory: 'Credit_Payment',
                entity: 'All',
                autoTagKeywords: ['payment', 'credit card payment', 'visa payment'],
                taxCategory: 'Exclude',
                description: 'Credit card payments',
                accountIds: ['all']
            }
        ];
    }

    buildAutoTagRules() {
        this.autoTagRules.clear();
        this.categories.forEach(cat => {
            if (cat.autoTagKeywords && cat.autoTagKeywords.length > 0) {
                cat.autoTagKeywords.forEach(keyword => {
                    const key = keyword.toLowerCase();
                    if (!this.autoTagRules.has(key)) {
                        this.autoTagRules.set(key, []);
                    }
                    this.autoTagRules.get(key).push(cat);
                });
            }
        });
    }

    // Enhanced categorization with multiple detection methods
    categorizeTransaction(transaction) {
        const { description, amount, accountId } = transaction;
        const descLower = description.toLowerCase();

        // 1. Check for exact amount matches (health insurance, HSA, etc.)
        const amountMatch = this.findAmountMatch(transaction);
        if (amountMatch) {
            return {
                ...amountMatch,
                confidence: 0.95,
                method: 'amount_match'
            };
        }

        // 2. Check for keyword matches
        const keywordMatch = this.findKeywordMatch(transaction);
        if (keywordMatch) {
            return {
                ...keywordMatch,
                confidence: 0.85,
                method: 'keyword_match'
            };
        }

        // 3. Check for account-based categorization
        const accountMatch = this.findAccountMatch(transaction);
        if (accountMatch) {
            return {
                ...accountMatch,
                confidence: 0.70,
                method: 'account_match'
            };
        }

        // 4. Transfer detection
        if (this.isTransfer(transaction)) {
            return this.getTransferCategory(transaction);
        }

        // 5. Default categorization
        return this.getDefaultCategory(transaction);
    }

    findAmountMatch(transaction) {
        const { amount, accountId } = transaction;

        return this.categories.find(cat => {
            if (!cat.expectedAmount) return false;

            // Check if amount matches (within $5 tolerance)
            const amountMatches = Math.abs(amount - cat.expectedAmount) <= 5;

            // Check if account matches
            const accountMatches = cat.accountIds.includes(accountId) || cat.accountIds.includes('all');

            return amountMatches && accountMatches;
        });
    }

    findKeywordMatch(transaction) {
        const { description, accountId } = transaction;
        const descLower = description.toLowerCase();

        let bestMatch = null;
        let bestScore = 0;

        for (const [keyword, categories] of this.autoTagRules) {
            if (descLower.includes(keyword)) {
                // Find the best category match for this keyword
                for (const category of categories) {
                    let score = 1;

                    // Boost score if account matches
                    if (category.accountIds.includes(accountId) || category.accountIds.includes('all')) {
                        score += 0.5;
                    }

                    // Boost score for longer keyword matches
                    score += keyword.length * 0.1;

                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = category;
                    }
                }
            }
        }

        return bestMatch;
    }

    findAccountMatch(transaction) {
        const { accountId, amount } = transaction;

        // Account-specific rules based on your setup
        if (accountId === '0111' && amount > 0) {
            return this.categories.find(cat => cat.id === 'income_rent');
        }

        if (accountId === '7991' && amount > 0) {
            return this.categories.find(cat => cat.id === 'income_tech');
        }

        if (accountId === '7588') {
            // Shared checking account - likely personal expenses
            return this.categories.find(cat =>
                cat.entity === 'Personal' && cat.subcategory === 'Other'
            ) || this.categories.find(cat => cat.entity === 'Personal');
        }

        if (accountId === '2299' && amount < 0) {
            // Business expense card
            return this.categories.find(cat =>
                cat.entity === 'Tech Business' && cat.subcategory === 'Business Expenses'
            ) || this.categories.find(cat => cat.id === 'business_office');
        }

        return null;
    }

    isTransfer(transaction) {
        const { description } = transaction;
        const transferKeywords = [
            'transfer', 'deposit', 'withdrawal', 'internal',
            'payment', 'credit card payment', 'visa payment',
            'schwab', 'investment'
        ];

        const descLower = description.toLowerCase();
        return transferKeywords.some(keyword => descLower.includes(keyword));
    }

    getTransferCategory(transaction) {
        return {
            category: 'Transfers',
            subcategory: 'Internal_Transfer',
            entity: 'All',
            taxCategory: 'Exclude',
            confidence: 0.90,
            method: 'transfer_detection'
        };
    }

    getDefaultCategory(transaction) {
        const { accountId, amount } = transaction;
        const entity = this.getAccountEntity(accountId);

        if (amount > 0) {
            return {
                category: 'Income',
                subcategory: 'Other Income',
                entity: entity,
                taxCategory: entity === 'Real Estate' ? 'Schedule_E' : 'Other',
                confidence: 0.30,
                method: 'default'
            };
        } else {
            return {
                category: 'Personal',
                subcategory: 'Uncategorized',
                entity: entity,
                taxCategory: 'Personal',
                confidence: 0.30,
                method: 'default'
            };
        }
    }

    getAccountEntity(accountId) {
        const accountEntityMap = {
            '0111': 'Real Estate',
            '8529': 'Real Estate',
            '0898': 'Real Estate',
            '7991': 'Tech Business',
            '2299': 'Tech Business',
            '7588': 'Personal',
            '2433': 'Personal',
            '8895': 'Personal',
            '119': 'Personal'
        };

        return accountEntityMap[accountId] || 'Personal';
    }

    // Category management methods
    addCategory(categoryData) {
        const newCategory = {
            id: this.generateCategoryId(),
            ...categoryData,
            createdAt: new Date().toISOString()
        };

        this.categories.push(newCategory);
        this.buildAutoTagRules();
        this.saveCategories();

        return newCategory;
    }

    updateCategory(categoryId, updates) {
        const index = this.categories.findIndex(cat => cat.id === categoryId);
        if (index !== -1) {
            this.categories[index] = {
                ...this.categories[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.buildAutoTagRules();
            this.saveCategories();
            return this.categories[index];
        }
        return null;
    }

    deleteCategory(categoryId) {
        const index = this.categories.findIndex(cat => cat.id === categoryId);
        if (index !== -1) {
            this.categories.splice(index, 1);
            this.buildAutoTagRules();
            this.saveCategories();
            return true;
        }
        return false;
    }

    getCategoriesForDropdown(entity = null) {
        let filteredCategories = this.categories;

        if (entity) {
            filteredCategories = this.categories.filter(cat =>
                cat.entity === entity || cat.entity === 'All'
            );
        }

        // Group by category for better display
        const grouped = {};
        filteredCategories.forEach(cat => {
            if (!grouped[cat.category]) {
                grouped[cat.category] = [];
            }
            grouped[cat.category].push(cat);
        });

        return grouped;
    }

    async saveCategories() {
        try {
            localStorage.setItem('expense_categories', JSON.stringify(this.categories));
            // Also save to Firestore if available
            if (window.dataService && !window.AppConfig?.DEMO_MODE) {
                await window.dataService.saveUserData('categories', this.categories);
            }
        } catch (error) {
            console.error('Failed to save categories:', error);
        }
    }

    generateCategoryId() {
        return 'cat_' + Math.random().toString(36).substr(2, 9);
    }

    // Export categories for backup/sharing
    exportCategories() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            categories: this.categories
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-categories-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import categories from file
    async importCategories(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.categories && Array.isArray(data.categories)) {
                        this.categories = data.categories;
                        this.buildAutoTagRules();
                        this.saveCategories();
                        resolve(data.categories.length);
                    } else {
                        reject(new Error('Invalid file format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
}

// Make it globally available for integration with existing app
window.CategoryManager = CategoryManager;
