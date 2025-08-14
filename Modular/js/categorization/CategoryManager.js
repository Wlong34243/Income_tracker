export class CategoryManager {
    constructor(dataService, appConfig) {
        this.dataService = dataService;
        this.appConfig = appConfig;
        this.categories = [];
        this.autoTagRules = new Map();
        // This can be expanded or loaded from config
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
            // Special case - not tied to property
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
        await this.loadCategories();
        this.buildAutoTagRules();
    }

    // This is the new, prioritized categorization flow
    categorizeTransaction(transaction) {
        // Special rule for Lisa's income
        if (transaction.accountId === '0111' && transaction.amount === 1500) {
           const desc = transaction.description.toLowerCase();
           if (desc.includes('michael katzen') || desc.includes('deposit') && desc.includes('927579')) {
               return {
                   category: 'Personal Income',
                   subcategory: "Lisa's Monthly Income",
                   entity: 'Personal',
                   property: null,  // Not tied to any property
                   confidence: 0.95,
                   method: 'lisa_income_rule'
               };
           }
        }

        // 1. ACCOUNT-SPECIFIC RULES (HIGHEST PRIORITY)
        const accountMatch = this.categorizeByAccount(transaction);
        if (accountMatch) return accountMatch;

        // 2. RENT DETECTION
        const rentMatch = this.findRent(transaction);
        if (rentMatch) return rentMatch;

        // 3. TRANSFER DETECTION
        const transferMatch = this.findTransfer(transaction);
        if (transferMatch) return transferMatch;

        // 4. AMOUNT MATCH
        const amountMatch = this.findAmountMatch(transaction);
        if (amountMatch) return { ...amountMatch, confidence: 0.95, method: 'amount_match' };

        // 5. KEYWORD MATCH
        const keywordMatch = this.findKeywordMatch(transaction);
        if (keywordMatch) return { ...keywordMatch, confidence: 0.85, method: 'keyword_match' };

        // 6. DEFAULT
        return this.getDefaultCategory(transaction);
    }

    categorizeByAccount(transaction) {
        const { accountId, amount, description } = transaction;
        const descLower = description.toLowerCase();

        switch(accountId) {
            case '0111': // Sweep Account - ALL deposits are rent
                if (amount > 0) {
                    return {
                        category: 'Real Estate Income',
                        subcategory: 'Rent',
                        entity: 'Real Estate',
                        confidence: 0.95,
                        method: 'account_rule_0111'
                    };
                }
                break;

            case '8529': // Real Estate Operations
                if (descLower.includes('rocket') || descLower.includes('mortgage')) {
                    return {
                        category: 'Property Expenses',
                        subcategory: 'Mortgage',
                        entity: 'Real Estate',
                        confidence: 0.95,
                        method: 'account_rule_8529'
                    };
                }
                if (descLower.includes('vyve') || descLower.includes('frontier')) {
                    return {
                        category: 'Utilities',
                        subcategory: 'Internet/Cable',
                        entity: 'Real Estate',
                        confidence: 0.90,
                        method: 'account_rule_8529'
                    };
                }
                break;

            case '7991': // Tech Business Income
                if (amount > 0) {
                    return {
                        category: 'Tech Business Income',
                        subcategory: 'Consulting',
                        entity: 'Tech Business',
                        confidence: 0.90,
                        method: 'account_rule_7991'
                    };
                }
                break;

            case '7588': // Shared Checking
                if (Math.abs(amount - (-1367)) < 10) {
                    return {
                        category: 'Insurance',
                        subcategory: 'Health Insurance',
                        entity: 'Personal',
                        confidence: 0.95,
                        method: 'account_rule_7588_amount'
                    };
                }
                if (Math.abs(amount - (-750)) < 10) {
                    return {
                        category: 'Healthcare',
                        subcategory: 'HSA Contribution',
                        entity: 'Personal',
                        confidence: 0.95,
                        method: 'account_rule_7588_amount'
                    };
                }
                break;
        }

        return null; // No account-specific match
    }

    // New rent detection logic
    findRent(transaction) {
        const { accountId, amount, description } = transaction;
        const descLower = description.toLowerCase();

        // Rule 1: Zelle payment over $500 in account 0111
        if (accountId === '0111' && amount > 0 && descLower.includes('zelle') && amount >= 500) {
            return {
                category: 'Real Estate Income',
                subcategory: 'Rent',
                entity: 'Real Estate',
                property: this.identifyProperty(description),
                confidence: 0.90,
                method: 'rent_zelle_rule'
            };
        }

        // Rule 2: Known tenant names
        const tenantNames = Object.keys(this.tenantPropertyMap);
        const foundTenant = tenantNames.find(name => descLower.includes(name));
        if (foundTenant) {
            return {
                category: 'Real Estate Income',
                subcategory: 'Rent',
                entity: 'Real Estate',
                property: this.identifyProperty(description),
                confidence: 0.95,
                method: 'rent_tenant_name_match'
            };
        }

        return null;
    }

    // New transfer detection logic
    findTransfer(transaction) {
        const { description } = transaction;
        // Only mark as transfer if it explicitly says "transfer" with account numbers/types
        if (description.match(/transfer (to|from) (CHK|SAV|.*\d{4})/i)) {
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
        const descLower = description.toLowerCase();
        for (const name in this.tenantPropertyMap) {
            if (descLower.includes(name)) {
                return this.tenantPropertyMap[name];
            }
        }
        return 'Unknown Property';
    }

    // --- Existing methods (some will be updated/removed in later steps) ---

    // This is the old keyword list that will be cleaned up
    getDefaultCategories() {
        return [
             // Income Categories
            {
                id: 'income_rent', category: 'Income', subcategory: 'Rent Received', entity: 'Real Estate',
                autoTagKeywords: ['rent', 'rental income', 'sevilla', 'johnson', 'smith'], // Removed 'monthly rent'
            },
            {
                id: 'income_tech', category: 'Income', subcategory: 'Tech Audit Fees', entity: 'Tech Business',
                autoTagKeywords: ['packerthomas', 'consulting', 'audit', 'professional services'],
            },
            {
                id: 'income_investment', category: 'Income', subcategory: 'Investment Income', entity: 'Personal',
                autoTagKeywords: ['dividend', 'interest', 'capital gains', 'schwab'],
            },
            // Utilities
            {
                id: 'utilities_electric', category: 'Utilities', subcategory: 'Electric', entity: 'Real Estate',
                autoTagKeywords: ['electric', 'electricity', 'power', 'pge', 'duke energy'],
            },
            {
                id: 'utilities_internet', category: 'Utilities', subcategory: 'Internet/Cable', entity: 'Real Estate',
                autoTagKeywords: ['vyve', 'frontier', 'internet', 'cable', 'wifi', 'comcast', 'spectrum'],
            },
            // Transfers - REMOVED GENERIC KEYWORDS
            {
                id: 'transfer_internal', category: 'Transfers', subcategory: 'Internal_Transfer', entity: 'All',
                autoTagKeywords: ['internal'], // Only 'internal' is specific enough
            },
            {
                id: 'transfer_credit_payment', category: 'Transfers', subcategory: 'Credit_Payment', entity: 'All',
                autoTagKeywords: ['credit card payment', 'visa payment'], // Removed 'payment'
            }
            // ... other categories remain the same for now
        ];
    }

    // Other methods like findAmountMatch, findKeywordMatch, etc. remain for now
    // but their priority in the main categorization flow has changed.

    // --- Boilerplate methods (unchanged) ---
    async loadCategories() {
        // ... (implementation is unchanged)
    }
    buildAutoTagRules() {
        // ... (implementation is unchanged)
    }
    findAmountMatch(transaction) {
        // ... (implementation is unchanged)
    }
    findKeywordMatch(transaction) {
        // ... (implementation is unchanged)
    }
    findAccountMatch(transaction) {
        // ... (implementation is unchanged)
    }
    getDefaultCategory(transaction) {
        // ... (implementation is unchanged)
    }
    // ... and so on for all other existing methods
    learnFromCorrection(transaction, newCategory) {
       const rule = {
           pattern: transaction.description.toLowerCase(),
           category: newCategory.category,
           subcategory: newCategory.subcategory,
           entity: newCategory.entity,
           confidence: 0.9
       };

       // Save to localStorage for persistence
       const customRules = JSON.parse(localStorage.getItem('learned_rules') || '[]');
       customRules.push(rule);
       localStorage.setItem('learned_rules', JSON.stringify(customRules));
    }
}
