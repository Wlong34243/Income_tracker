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
        this.categories = this.getDefaultCategories();
        localStorage.setItem('expense_categories', JSON.stringify(this.categories));
        this.buildAutoTagRules();
        console.log(`CategoryManager initialized with ${this.categories.length} categories`);
    }

    categorizeTransaction(transaction) {
        if (transaction.accountId === '0111' && Math.abs(transaction.amount - 1500) < 10) {
           const desc = transaction.description.toLowerCase();
           if (desc.includes('michael katzen') || desc.includes('deposit')) {
               return {
                   category: 'Personal Income',
                   subcategory: "Lisa's Monthly Income",
                   entity: 'Personal',
                   property: null,
                   confidence: 0.95,
                   method: 'lisa_income_rule'
               };
           }
        }

        const accountMatch = this.categorizeByAccount(transaction);
        if (accountMatch) return accountMatch;

        const rentMatch = this.findRent(transaction);
        if (rentMatch) return rentMatch;

        const transferMatch = this.findTransfer(transaction);
        if (transferMatch) return transferMatch;

        // CRITICAL FIX: This line ensures a value is always returned.
        return this.getDefaultCategory(transaction);
    }

    categorizeByAccount(transaction) {
        const { accountId, amount, description } = transaction;
        const descLower = description.toLowerCase();

        switch(accountId) {
            case '0111':
                if (amount > 0 && amount !== 1500) {
                    const tenant = this.identifyTenant(description);
                    return {
                        category: 'Real Estate Income',
                        subcategory: 'Rent',
                        entity: 'Real Estate',
                        property: tenant ? this.tenantPropertyMap[tenant] : null,
                        confidence: 0.95,
                        method: 'account_rule_0111'
                    };
                }
                break;

            case '8529':
                if (descLower.includes('rocket') || descLower.includes('mortgage') || descLower.includes('shellpoint')) {
                    return { category: 'Property Expenses', subcategory: 'Mortgage', entity: 'Real Estate', confidence: 0.95, method: 'account_rule_8529_mortgage' };
                }
                if (descLower.includes('vyve') || descLower.includes('frontier')) {
                    return { category: 'Utilities', subcategory: 'Internet/Cable', entity: 'Real Estate', confidence: 0.90, method: 'account_rule_8529_utilities' };
                }
                if (amount < 0) {
                    return { category: 'Property Expenses', subcategory: 'Operating', entity: 'Real Estate', confidence: 0.80, method: 'account_rule_8529_default' };
                }
                break;

            case '7991':
                if (amount > 0) {
                    return { category: 'Tech Business Income', subcategory: 'Consulting', entity: 'Tech Business', confidence: 0.90, method: 'account_rule_7991' };
                }
                break;

            case '2299':
                if (amount < 0) {
                    return { category: 'Tech Business Expense', subcategory: 'Business Expense', entity: 'Tech Business', confidence: 0.85, method: 'account_rule_2299' };
                }
                break;

            case '7588':
                if (Math.abs(amount - (-1367)) < 10) {
                    return { category: 'Insurance', subcategory: 'Health Insurance', entity: 'Personal', confidence: 0.95, method: 'account_rule_7588_health' };
                }
                if (Math.abs(amount - (-750)) < 10) {
                    return { category: 'Healthcare', subcategory: 'HSA Contribution', entity: 'Personal', confidence: 0.95, method: 'account_rule_7588_hsa' };
                }
                return { category: 'Personal Expense', subcategory: 'Shared Expense', entity: 'Personal', confidence: 0.70, method: 'account_rule_7588_default' };

            case '2433':
                if (amount < 0) {
                    return { category: 'Personal Expense', subcategory: 'Credit Card', entity: 'Personal', confidence: 0.80, method: 'account_rule_2433' };
                }
                break;
        }

        return null;
    }

    findRent(transaction) {
        const { accountId, amount, description } = transaction;
        const descLower = description.toLowerCase();

        if (accountId === '0111' && amount > 0 && descLower.includes('zelle') && amount >= 500) {
            const tenant = this.identifyTenant(description);
            return {
                category: 'Real Estate Income', subcategory: 'Rent', entity: 'Real Estate',
                property: tenant ? this.tenantPropertyMap[tenant] : 'Unknown Property',
                confidence: 0.90, method: 'rent_zelle_rule'
            };
        }

        const tenant = this.identifyTenant(description);
        if (tenant && amount > 0) {
            return {
                category: 'Real Estate Income', subcategory: 'Rent', entity: 'Real Estate',
                property: this.tenantPropertyMap[tenant],
                confidence: 0.95, method: 'rent_tenant_name_match'
            };
        }
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
                category: 'Transfer', subcategory: 'Internal', entity: 'Transfer',
                confidence: 0.90, method: 'transfer_regex_match'
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
            { id: 'income_rent', category: 'Real Estate Income', subcategory: 'Rent', entity: 'Real Estate', autoTagKeywords: [] },
            { id: 'expense_mortgage', category: 'Property Expenses', subcategory: 'Mortgage', entity: 'Real Estate', autoTagKeywords: ['rocket', 'shellpoint', 'mortgage'] },
            { id: 'expense_utilities', category: 'Utilities', subcategory: 'Internet/Cable', entity: 'Real Estate', autoTagKeywords: ['vyve', 'frontier', 'internet', 'cable'] },
            { id: 'income_tech', category: 'Tech Business Income', subcategory: 'Consulting', entity: 'Tech Business', autoTagKeywords: ['packerthomas', 'consulting', 'audit'] },
            { id: 'expense_tech', category: 'Tech Business Expense', subcategory: 'Business Expense', entity: 'Tech Business', autoTagKeywords: [] },
            { id: 'income_personal', category: 'Personal Income', subcategory: "Lisa's Monthly Income", entity: 'Personal', autoTagKeywords: ['michael katzen'] },
            { id: 'expense_health', category: 'Insurance', subcategory: 'Health Insurance', entity: 'Personal', autoTagKeywords: [] },
            { id: 'expense_hsa', category: 'Healthcare', subcategory: 'HSA Contribution', entity: 'Personal', autoTagKeywords: [] },
            { id: 'transfer_internal', category: 'Transfer', subcategory: 'Internal', entity: 'Transfer', autoTagKeywords: [] }
        ];
    }

    getDefaultCategory(transaction) {
        const { accountId, amount } = transaction;
        
        if (amount > 0) {
            if (accountId === '0111') return { category: 'Real Estate Income', subcategory: 'Rent', entity: 'Real Estate', confidence: 0.60, method: 'default_income' };
            if (accountId === '7991') return { category: 'Tech Business Income', subcategory: 'Consulting', entity: 'Tech Business', confidence: 0.60, method: 'default_income' };
        } else {
            if (accountId === '8529') return { category: 'Property Expenses', subcategory: 'Operating', entity: 'Real Estate', confidence: 0.50, method: 'default_expense' };
            if (accountId === '2299') return { category: 'Tech Business Expense', subcategory: 'Business Expense', entity: 'Tech Business', confidence: 0.50, method: 'default_expense' };
        }

        return { category: 'Uncategorized', subcategory: null, entity: null, confidence: 0.0, method: 'no_match' };
    }

    buildAutoTagRules() {
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