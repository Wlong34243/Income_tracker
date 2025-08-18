// js/categorization/CategoryManager.js
export class CategoryManager {
    cons// js/categorization/CategoryManager.js
export class CategoryManager {
    constructor(dataService, appConfig) {
        this.dataService = dataService;
        this.appConfig = appConfig;
        this.categories = [];
        this.rules = [];
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
            'michael katzen': null
        };
    }

    async init() {
        this.categories = this.getDefaultCategories();
        this.rules = this.buildRules();
        console.log(`CategoryManager initialized with ${this.rules.length} rules.`);
    }

    buildRules() {
        // Higher priority rules (lower number) are checked first
        return [
            // High Priority Keywords & Specific Payments
            { pattern: /schwab brokerage.*moneylink/i, category: 'Investment', subcategory: 'Transfer to Schwab', entity: 'Investment', priority: 1 },
            { pattern: /zelle payment to lisa/i, category: 'Personal Income', subcategory: "Lisa's Income", entity: 'Personal', priority: 1 },
            { pattern: /irs.*usataxpymt/i, category: 'Taxes', subcategory: 'Federal Income Tax', entity: 'Personal', priority: 1 },
            { pattern: /chase credit crd.*autopay/i, category: 'CC Payment', subcategory: 'Chase Card', entity: 'Transfer', priority: 1 },
            { pattern: /rocket|mortgage|shellpoint/i, category: 'Property Expenses', subcategory: 'Mortgage', entity: 'Real Estate', priority: 2 },
            { pattern: /vyve|frontier/i, category: 'Utilities', subcategory: 'Internet/Cable', entity: 'Real Estate', priority: 2 },

            // Transfers
            { pattern: /online transfer (to|from) (CHK|SAV|.*\d{4})/i, category: 'Transfer', subcategory: 'Internal', entity: 'Transfer', priority: 3 },
            { pattern: /transfer (to|from).*(8529|0111|7991|8895|119)/i, category: 'Transfer', subcategory: 'Internal', entity: 'Transfer', priority: 3 },

            // Account-based Rules (lower priority)
            { condition: (t) => t.accountId === '0111' && t.amount > 0, action: (t) => this.categorizeRent(t), priority: 4 },
            { condition: (t) => t.accountId === '8529' && t.amount < 0, category: 'Property Expenses', subcategory: 'Operating', entity: 'Real Estate', priority: 5 },
            { condition: (t) => t.accountId === '7991' && t.amount > 0, category: 'Tech Business Income', subcategory: 'Consulting', entity: 'Tech Business', priority: 5 },
            { condition: (t) => t.accountId === '2299' && t.amount < 0, category: 'Tech Business Expense', subcategory: 'Business Expense', entity: 'Tech Business', priority: 5 },
            { condition: (t) => t.accountId === '7588', category: 'Personal Expense', subcategory: 'Shared Expense', entity: 'Personal', priority: 5 },
            { condition: (t) => t.accountId === '2433' && t.amount < 0, category: 'Personal Expense', subcategory: 'Credit Card', entity: 'Personal', priority: 5 },
        ].sort((a, b) => a.priority - b.priority);
    }

    categorizeTransaction(transaction) {
        const descLower = transaction.description.toLowerCase();

        for (const rule of this.rules) {
            let match = false;
            // Check for regex pattern match
            if (rule.pattern && descLower.match(rule.pattern)) {
                match = true;
            } 
            // Check for a custom condition function
            else if (rule.condition && rule.condition(transaction)) {
                if (rule.action) {
                    return rule.action(transaction); // Action handles returning the category itself
                }
                match = true;
            }

            if (match) {
                return {
                    category: rule.category,
                    subcategory: rule.subcategory,
                    entity: rule.entity,
                    confidence: 1.0 - (rule.priority * 0.1), // Confidence based on priority
                    method: `rule_p${rule.priority}`
                };
            }
        }

        // Fallback if no rules match
        return { category: 'Uncategorized', subcategory: 'Uncategorized', entity: 'Unknown', confidence: 0.0, method: 'no_match' };
    }

    categorizeRent(transaction) {
        const tenant = this.identifyTenant(transaction.description);
        return {
            category: 'Real Estate Income',
            subcategory: 'Rent',
            entity: 'Real Estate',
            property: tenant ? this.tenantPropertyMap[tenant] : 'Unknown Property',
            confidence: 0.9,
            method: 'rent_categorization_rule'
        };
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

    async categorizeAll(transactions) {
        return transactions.map(transaction => {
            const categoryResult = this.categorizeTransaction(transaction);
            return { ...transaction, ...categoryResult };
        });
    }
    
    getDefaultCategories() {
        return [
            { id: 'income_rent', category: 'Real Estate Income', subcategory: 'Rent', entity: 'Real Estate' },
            { id: 'expense_mortgage', category: 'Property Expenses', subcategory: 'Mortgage', entity: 'Real Estate' },
            { id: 'expense_utilities', category: 'Utilities', subcategory: 'Internet/Cable', entity: 'Real Estate' },
            { id: 'income_tech', category: 'Tech Business Income', subcategory: 'Consulting', entity: 'Tech Business' },
            { id: 'expense_tech', category: 'Tech Business Expense', subcategory: 'Business Expense', entity: 'Tech Business' },
            { id: 'income_personal', category: 'Personal Income', subcategory: "Lisa's Income", entity: 'Personal' },
            { id: 'expense_health', category: 'Insurance', subcategory: 'Health Insurance', entity: 'Personal' },
            { id: 'expense_hsa', category: 'Healthcare', subcategory: 'HSA Contribution', entity: 'Personal' },
            { id: 'transfer_internal', category: 'Transfer', subcategory: 'Internal', entity: 'Transfer' },
            { id: 'cc_payment', category: 'CC Payment', subcategory: 'Chase Card', entity: 'Transfer' },
            { id: 'taxes_federal', category: 'Taxes', subcategory: 'Federal Income Tax', entity: 'Personal' },
            { id: 'investment_transfer', category: 'Investment', subcategory: 'Transfer to Schwab', entity: 'Investment' }
        ];
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
}
