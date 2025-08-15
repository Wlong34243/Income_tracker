export class CategoryManager {
    constructor(dataService, appConfig) {
        this.dataService = dataService;
        this.appConfig = appConfig;
        this.categories = [];
        this.autoTagRules = new Map();
        this.tenantPropertyMap = {
            'jack sevilla': '5th ST E',
            'araceli ponce': '5th ST E',
            'lucy cepeda': '2024 50th',
            'jesus cruz': '2024 50th',
            'angel de la cruz': 'Las Palmas',
            'pablo joaquin': '37th Ave E',
            'wendy cordova': '2nd St W',
            'geron vile': '2nd St W',
            'michelle ruth': '1112 36th St W',
            'steven malloy': '1112 36th St W',
            'claribel castillomero': '59th Ave E',
            'belem amaro': '59th Ave E',
            'michael katzen': null  // Lisa's income, not property-related
        };
    }

    getCategoriesForDropdown() {
       const grouped = {};
       this.categories.forEach(cat => {
           if (!grouped[cat.category]) {
               grouped[cat.category] = [];
           }
           grouped[cat.category].push({
               id: cat.id || `${cat.category}_${cat.subcategory}`,
               category: cat.category,
               subcategory: cat.subcategory,
               entity: cat.entity
           });
       });
       return grouped;
    }

    async init() {
        // Clear and rebuild categories to ensure proper structure
        this.categories = this.getDefaultCategories();
        localStorage.setItem('expense_categories', JSON.stringify(this.categories));
        this.buildAutoTagRules();
        console.log(`CategoryManager initialized with ${this.categories.length} categories`);
    }

    categorizeTransaction(transaction) {
        const descLower = transaction.description.toLowerCase();
        
        // PRIORITY 0: Detect Tech Business by amount and description patterns
        // PackerThomas payments are large (>$10k) and go to various accounts
        if (transaction.amount > 10000 &&
            (descLower.includes('packer') ||
             descLower.includes('thomas') ||
             (descLower.includes('deposit') && transaction.accountId === '7991'))) {
            console.log('Detected Tech Business income:', transaction.description);
            return {
                category: 'Tech Business Income',
                subcategory: 'Consulting',
                entity: 'Tech Business',
                property: null,
                confidence: 0.98,
                method: 'large_deposit_pattern'
            };
        }
        
        // PRIORITY 1: Lisa's income special case
        if (transaction.accountId === '0111' && 
            Math.abs(transaction.amount - 1500) < 10 &&
            (descLower.includes('michael katzen') || 
             (descLower.includes('deposit') && descLower.includes('927579')))) {
            return {
                category: 'Personal Income',
                subcategory: "Lisa's Monthly Income",
                entity: 'Personal',
                property: null,
                confidence: 0.99,
                method: 'lisa_income_rule'
            };
        }
        
        // PRIORITY 2: Tech Business Income (7991)
        if (transaction.accountId === '7991' && transaction.amount > 0) {
            return {
                category: 'Tech Business Income',
                subcategory: 'Consulting',
                entity: 'Tech Business',
                property: null,
                confidence: 0.95,
                method: 'tech_business_income'
            };
        }
        
        // PRIORITY 3: Real Estate Rent (0111 deposits)
        if (transaction.accountId === '0111' && transaction.amount > 0) {
            // Skip Lisa's income which we already handled
            if (!(descLower.includes('michael katzen') && Math.abs(transaction.amount - 1500) < 10)) {
                const tenant = this.identifyTenant(transaction.description);
                return {
                    category: 'Real Estate Income',
                    subcategory: 'Rent',
                    entity: 'Real Estate',
                    property: tenant ? this.tenantPropertyMap[tenant] : 'Unknown Property',
                    confidence: 0.90,
                    method: 'rent_detection'
                };
            }
        }
        
        // PRIORITY 4: Tech Business Expenses (2299)
        if (transaction.accountId === '2299' && transaction.amount < 0) {
            return {
                category: 'Tech Business Expense',
                subcategory: 'Business Expense',
                entity: 'Tech Business',
                property: null,
                confidence: 0.85,
                method: 'tech_expense_cc'
            };
        }
        
        // PRIORITY 5: Real Estate Operations (8529)
        if (transaction.accountId === '8529') {
            if (transaction.amount < 0) {
                // Check for specific expense types
                if (descLower.includes('rocket') || descLower.includes('mortgage') || descLower.includes('shellpoint')) {
                    return {
                        category: 'Property Expenses',
                        subcategory: 'Mortgage',
                        entity: 'Real Estate',
                        property: this.identifyPropertyFromMortgage(descLower),
                        confidence: 0.95,
                        method: 'mortgage_payment'
                    };
                }
                
                // Default RE expense
                return {
                    category: 'Property Expenses',
                    subcategory: 'Operating',
                    entity: 'Real Estate',
                    property: null,
                    confidence: 0.75,
                    method: 'real_estate_expense'
                };
            }
        }
        
        // PRIORITY 6: Shared Checking (7588)
        if (transaction.accountId === '7588') {
            if (Math.abs(transaction.amount + 1367) < 10) {
                return {
                    category: 'Insurance',
                    subcategory: 'Health Insurance',
                    entity: 'Personal',
                    property: null,
                    confidence: 0.95,
                    method: 'health_insurance'
                };
            }
            if (Math.abs(transaction.amount + 750) < 10) {
                return {
                    category: 'Healthcare',
                    subcategory: 'HSA Contribution',
                    entity: 'Personal',
                    property: null,
                    confidence: 0.95,
                    method: 'hsa_contribution'
                };
            }
        }
        
        // PRIORITY 7: Check for transfers
        if (this.isTransfer(transaction)) {
            return {
                category: 'Transfer',
                subcategory: 'Internal',
                entity: 'Transfer',
                property: null,
                confidence: 0.90,
                method: 'transfer_detection'
            };
        }
        
        // DEFAULT: Uncategorized
        return {
            category: 'Uncategorized',
            subcategory: null,
            entity: 'Unknown',
            property: null,
            confidence: 0.0,
            method: 'no_match'
        };
    }

    isTransfer(transaction) {
        const desc = transaction.description.toLowerCase();
        return desc.includes('transfer to') || 
               desc.includes('transfer from') ||
               desc.includes('online transfer') ||
               (desc.includes('transfer') && desc.match(/\d{4}/)); // has account number
    }

    identifyPropertyFromMortgage(description) {
        // This would need to be enhanced based on your mortgage servicer descriptions
        // For now, return null and handle manually
        return null;
    }

    identifyTenant(description) {
        const descLower = description.toLowerCase();
        for (const name in this.tenantPropertyMap) {
            if (descLower.includes(name)) {
                return name;
            }
        }
        return null;
    }

    findTransfer(transaction) {
        const { description } = transaction;
        if (description.match(/online transfer (to|from) (CHK|SAV|.*\d{4})/i) ||
            description.match(/transfer (to|from).*(8529|0111|7991|8895|119)/i)) {
            return {
                category: 'Transfer',
                subcategory: 'Internal',
                entity: 'Transfer',
                confidence: 0.90,
                method: 'transfer_regex_match'
            };
        }
        return null;
    }

    identifyProperty(description) {
        const tenant = this.identifyTenant(description);
        return tenant ? this.tenantPropertyMap[tenant] : 'Unknown Property';
    }

    getDefaultCategories() {
        return [
            // Real Estate Income
            {
                id: 'income_rent', 
                category: 'Real Estate Income', 
                subcategory: 'Rent', 
                entity: 'Real Estate',
                autoTagKeywords: []
            },
            // Real Estate Expenses
            {
                id: 'expense_mortgage', 
                category: 'Property Expenses', 
                subcategory: 'Mortgage', 
                entity: 'Real Estate',
                autoTagKeywords: ['rocket', 'shellpoint', 'mortgage']
            },
            {
                id: 'expense_utilities', 
                category: 'Utilities', 
                subcategory: 'Internet/Cable', 
                entity: 'Real Estate',
                autoTagKeywords: ['vyve', 'frontier', 'internet', 'cable']
            },
            // Tech Business
            {
                id: 'income_tech', 
                category: 'Tech Business Income', 
                subcategory: 'Consulting', 
                entity: 'Tech Business',
                autoTagKeywords: ['packerthomas', 'consulting', 'audit']
            },
            {
                id: 'expense_tech', 
                category: 'Tech Business Expense', 
                subcategory: 'Business Expense', 
                entity: 'Tech Business',
                autoTagKeywords: []
            },
            // Personal
            {
                id: 'income_personal', 
                category: 'Personal Income', 
                subcategory: "Lisa's Monthly Income", 
                entity: 'Personal',
                autoTagKeywords: ['michael katzen']
            },
            {
                id: 'expense_health', 
                category: 'Insurance', 
                subcategory: 'Health Insurance', 
                entity: 'Personal',
                autoTagKeywords: []
            },
            {
                id: 'expense_hsa', 
                category: 'Healthcare', 
                subcategory: 'HSA Contribution', 
                entity: 'Personal',
                autoTagKeywords: []
            },
            // Transfers
            {
                id: 'transfer_internal', 
                category: 'Transfer', 
                subcategory: 'Internal', 
                entity: 'Transfer',
                autoTagKeywords: []
            }
        ];
    }

    getDefaultCategory(transaction) {
        // Default based on account and amount
        const { accountId, amount } = transaction;
        
        if (amount > 0) {
            // Income defaults
            if (accountId === '0111') {
                return {
                    category: 'Real Estate Income',
                    subcategory: 'Rent',
                    entity: 'Real Estate',
                    confidence: 0.60,
                    method: 'default_income'
                };
            }
            if (accountId === '7991') {
                return {
                    category: 'Tech Business Income',
                    subcategory: 'Consulting',
                    entity: 'Tech Business',
                    confidence: 0.60,
                    method: 'default_income'
                };
            }
        } else {
            // Expense defaults
            if (accountId === '8529') {
                return {
                    category: 'Property Expenses',
                    subcategory: 'Operating',
                    entity: 'Real Estate',
                    confidence: 0.50,
                    method: 'default_expense'
                };
            }
            if (accountId === '2299') {
                return {
                    category: 'Tech Business Expense',
                    subcategory: 'Business Expense',
                    entity: 'Tech Business',
                    confidence: 0.50,
                    method: 'default_expense'
                };
            }
        }

        // Ultimate fallback
        return {
            category: 'Uncategorized',
            subcategory: null,
            entity: null,
            confidence: 0.0,
            method: 'no_match'
        };
    }

    buildAutoTagRules() {
        // Build rules from categories
        this.autoTagRules.clear();
        for (const cat of this.categories) {
            if (cat.autoTagKeywords && cat.autoTagKeywords.length > 0) {
                for (const keyword of cat.autoTagKeywords) {
                    this.autoTagRules.set(keyword.toLowerCase(), {
                        category: cat.category,
                        subcategory: cat.subcategory,
                        entity: cat.entity
                    });
                }
            }
        }
    }

    async categorizeAll(transactions) {
        return transactions.map(transaction => {
            const categoryResult = this.categorizeTransaction(transaction);
            return { ...transaction, ...categoryResult };
        });
    }

    learnFromCorrection(transaction, newCategory) {
       const rule = {
           pattern: transaction.description.toLowerCase(),
           category: newCategory.category,
           subcategory: newCategory.subcategory,
           entity: newCategory.entity,
           confidence: 0.9
       };

       const customRules = JSON.parse(localStorage.getItem('learned_rules') || '[]');
       customRules.push(rule);
       localStorage.setItem('learned_rules', JSON.stringify(customRules));
    }
}