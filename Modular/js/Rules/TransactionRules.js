// js/rules/TransactionRules.js

import { AppConfig } from '../config/AppConfig.js';

export class TransactionRules {
    constructor() {
        // Initialize rules in priority order
        this.rules = [
            // Real Estate Rental Income Rules
            {
                name: 'Rental Income - Tenant Payments',
                priority: 1,
                condition: (txn) => {
                    const desc = txn.description.toLowerCase();
                    // Check each property's tenants
                    for (const [property, tenants] of Object.entries(AppConfig.PROPERTY_MAPPINGS)) {
                        for (const tenant of tenants) {
                            if (desc.includes(tenant.toLowerCase())) {
                                return { matched: true, property };
                            }
                        }
                    }
                    return { matched: false };
                },
                apply: (txn, context) => ({
                    category: 'Rental Income',
                    property: context.property,
                    entity: 'Real Estate',
                    confidence: 1.0,
                    reasoning: `Tenant payment from ${txn.description}`,
                    source: 'Rule: Tenant Match'
                })
            },

            // Business Income Rules
            {
                name: 'Tech Auditing Income - PackerThomas',
                priority: 1,
                condition: (txn) => 
                    txn.account === '7991' && 
                    txn.description.toLowerCase().includes('packerthomas') &&
                    txn.amount > 0,
                apply: (txn) => ({
                    category: 'Business Income',
                    entity: 'Tech Auditing',
                    confidence: 1.0,
                    reasoning: 'PackerThomas deposit to business account',
                    source: 'Rule: Known Client'
                })
            },

            // Insurance Rules
            {
                name: 'Home Insurance - Allstate',
                priority: 2,
                condition: (txn) => 
                    txn.description.toLowerCase().includes('allstate') &&
                    txn.amount >= -400 && txn.amount <= -300,
                apply: (txn) => ({
                    category: 'Insurance',
                    property: 'Primary Residence',
                    entity: 'Personal',
                    confidence: 0.95,
                    reasoning: 'Annual Allstate payment in expected range',
                    source: 'Rule: Insurance Pattern'
                })
            },

            // Recurring Transfer Rules
            {
                name: 'Investment Transfer - Monthly',
                priority: 2,
                condition: (txn) => 
                    txn.account === '8529' && 
                    txn.description.toLowerCase().includes('transfer to 8895') &&
                    Math.abs(txn.amount) === 1250,
                apply: (txn) => ({
                    category: 'Transfer',
                    isTransfer: true,
                    transferAccount: '8895',
                    entity: 'Investment',
                    confidence: 1.0,
                    reasoning: 'Monthly $1,250 investment transfer',
                    source: 'Rule: Recurring Transfer'
                })
            },

            // Utility Rules
            {
                name: 'Internet - Vyve',
                priority: 3,
                condition: (txn) => 
                    txn.description.toLowerCase().includes('vyve'),
                apply: (txn) => ({
                    category: 'Utilities',
                    subCategory: 'Internet',
                    entity: 'Personal',
                    confidence: 1.0,
                    reasoning: 'Vyve internet service',
                    source: 'Rule: Known Vendor'
                })
            },

            {
                name: 'Internet - Frontier',
                priority: 3,
                condition: (txn) => 
                    txn.description.toLowerCase().includes('frontier'),
                apply: (txn) => ({
                    category: 'Utilities',
                    subCategory: 'Internet',
                    entity: 'Personal',
                    confidence: 1.0,
                    reasoning: 'Frontier internet service',
                    source: 'Rule: Known Vendor'
                })
            },

            {
                name: 'Netflix Subscription',
                priority: 3,
                condition: (txn) => 
                    txn.description.toLowerCase().includes('netflix'),
                apply: (txn) => ({
                    category: 'Entertainment',
                    entity: 'Personal',
                    confidence: 1.0,
                    reasoning: 'Netflix subscription',
                    source: 'Rule: Known Vendor'
                })
            },

            // Health Insurance Rules
            {
                name: 'Health Insurance Payment',
                priority: 2,
                condition: (txn) => 
                    txn.account === '7588' && 
                    Math.abs(txn.amount) === 1367,
                apply: (txn) => ({
                    category: 'Healthcare',
                    subCategory: 'Health Insurance',
                    entity: 'Personal',
                    confidence: 1.0,
                    reasoning: 'Monthly health insurance payment',
                    source: 'Rule: Fixed Amount'
                })
            },

            {
                name: 'HSA Contribution',
                priority: 2,
                condition: (txn) => 
                    txn.account === '7588' && 
                    Math.abs(txn.amount) === 750,
                apply: (txn) => ({
                    category: 'Healthcare',
                    subCategory: 'HSA Contribution',
                    entity: 'Personal',
                    confidence: 1.0,
                    reasoning: 'Monthly HSA contribution',
                    source: 'Rule: Fixed Amount'
                })
            },

            // Property-Specific Expense Rules
            {
                name: 'Property Maintenance',
                priority: 3,
                condition: (txn) => {
                    const desc = txn.description.toLowerCase();
                    const maintenanceKeywords = ['repair', 'plumber', 'electric', 'hvac', 'maintenance', 'home depot', 'lowes'];
                    
                    if (txn.account === '8529' && maintenanceKeywords.some(keyword => desc.includes(keyword))) {
                        // Try to match property from description
                        for (const property of Object.keys(AppConfig.PROPERTY_MAPPINGS)) {
                            if (desc.includes(property.toLowerCase())) {
                                return { matched: true, property };
                            }
                        }
                        return { matched: true, property: null };
                    }
                    return { matched: false };
                },
                apply: (txn, context) => ({
                    category: 'Maintenance',
                    property: context.property,
                    entity: 'Real Estate',
                    confidence: context.property ? 0.9 : 0.7,
                    reasoning: 'Property maintenance expense',
                    source: 'Rule: Maintenance Pattern'
                })
            },

            // Credit Card Payment Rules
            {
                name: 'Credit Card Payment',
                priority: 4,
                condition: (txn) => {
                    const desc = txn.description.toLowerCase();
                    return desc.includes('payment thank you') || 
                           desc.includes('autopay payment') ||
                           (desc.includes('payment') && desc.includes('credit'));
                },
                apply: (txn) => ({
                    category: 'Credit Card Payment',
                    entity: 'Personal',
                    confidence: 0.9,
                    reasoning: 'Credit card payment',
                    source: 'Rule: Payment Pattern'
                })
            },

            // Mortgage Rules
            {
                name: 'Mortgage Payment',
                priority: 2,
                condition: (txn) => {
                    const desc = txn.description.toLowerCase();
                    return (desc.includes('mortgage') || desc.includes('home loan')) && 
                           txn.amount < 0;
                },
                apply: (txn) => ({
                    category: 'Mortgage',
                    entity: 'Real Estate',
                    confidence: 0.95,
                    reasoning: 'Mortgage payment',
                    source: 'Rule: Mortgage Pattern'
                })
            },

            // Car Insurance Rule
            {
                name: 'Car Insurance',
                priority: 3,
                condition: (txn) => {
                    const desc = txn.description.toLowerCase();
                    const insuranceCompanies = ['geico', 'progressive', 'state farm', 'farmers', 'usaa'];
                    return insuranceCompanies.some(company => desc.includes(company)) && 
                           txn.amount < 0 && 
                           Math.abs(txn.amount) < 500; // Reasonable car insurance range
                },
                apply: (txn) => ({
                    category: 'Insurance',
                    subCategory: 'Auto Insurance',
                    entity: 'Personal',
                    confidence: 0.9,
                    reasoning: 'Auto insurance payment',
                    source: 'Rule: Insurance Company'
                })
            },

            // Account-Based Default Rules
            {
                name: 'Real Estate Income Default',
                priority: 10,
                condition: (txn) => 
                    ['0111', '0898'].includes(txn.account) && txn.amount > 0,
                apply: (txn) => ({
                    category: 'Other Income',
                    entity: 'Real Estate',
                    confidence: 0.6,
                    reasoning: 'Income to real estate account',
                    source: 'Rule: Account Default'
                })
            },

            {
                name: 'Real Estate Expense Default',
                priority: 10,
                condition: (txn) => 
                    txn.account === '8529' && txn.amount < 0,
                apply: (txn) => ({
                    category: 'Other Expenses',
                    entity: 'Real Estate',
                    confidence: 0.6,
                    reasoning: 'Expense from real estate operations account',
                    source: 'Rule: Account Default'
                })
            },

            {
                name: 'Business Income Default',
                priority: 10,
                condition: (txn) => 
                    txn.account === '7991' && txn.amount > 0,
                apply: (txn) => ({
                    category: 'Business Income',
                    entity: 'Tech Auditing',
                    confidence: 0.7,
                    reasoning: 'Income to business account',
                    source: 'Rule: Account Default'
                })
            },

            {
                name: 'Business Expense Default',
                priority: 10,
                condition: (txn) => 
                    txn.account === '2299' && txn.amount < 0,
                apply: (txn) => ({
                    category: 'Business Expenses',
                    entity: 'Tech Auditing',
                    confidence: 0.7,
                    reasoning: 'Business credit card expense',
                    source: 'Rule: Account Default'
                })
            }
        ];

        // Sort rules by priority (lower number = higher priority)
        this.rules.sort((a, b) => a.priority - b.priority);

        // Initialize custom patterns that can be added by users
        this.customPatterns = this.loadCustomPatterns();
    }

    /**
     * Apply rules to a transaction
     * @param {Object} transaction 
     * @returns {Object|null} Categorization result or null if no rule matches
     */
    applyRules(transaction) {
        // Try each rule in priority order
        for (const rule of this.rules) {
            const conditionResult = rule.condition(transaction);
            
            if (conditionResult === true || conditionResult.matched) {
                // Rule matched, apply it
                const result = rule.apply(transaction, conditionResult);
                
                // Log for debugging
                console.log(`Rule matched: ${rule.name} for transaction: ${transaction.description}`);
                
                return {
                    ...result,
                    ruleApplied: rule.name,
                    timestamp: new Date().toISOString()
                };
            }
        }

        // Check custom patterns
        const customResult = this.applyCustomPatterns(transaction);
        if (customResult) {
            return customResult;
        }

        // No rules matched
        return null;
    }

    /**
     * Add a custom pattern based on user feedback
     */
    addCustomPattern(pattern) {
        this.customPatterns.push({
            id: Date.now().toString(),
            ...pattern,
            createdAt: new Date().toISOString()
        });
        this.saveCustomPatterns();
    }

    /**
     * Apply custom patterns
     */
    applyCustomPatterns(transaction) {
        for (const pattern of this.customPatterns) {
            if (this.matchesPattern(transaction, pattern)) {
                return {
                    category: pattern.category,
                    property: pattern.property,
                    entity: pattern.entity,
                    confidence: 0.85,
                    reasoning: `Matches custom pattern: ${pattern.name}`,
                    source: 'Custom Pattern'
                };
            }
        }
        return null;
    }

    /**
     * Check if transaction matches a pattern
     */
    matchesPattern(transaction, pattern) {
        const desc = transaction.description.toLowerCase();
        
        // Check description keywords
        if (pattern.keywords && pattern.keywords.length > 0) {
            const hasKeyword = pattern.keywords.some(keyword => 
                desc.includes(keyword.toLowerCase())
            );
            if (!hasKeyword) return false;
        }

        // Check amount range
        if (pattern.amountMin !== undefined && transaction.amount < pattern.amountMin) {
            return false;
        }
        if (pattern.amountMax !== undefined && transaction.amount > pattern.amountMax) {
            return false;
        }

        // Check account
        if (pattern.account && transaction.account !== pattern.account) {
            return false;
        }

        return true;
    }

    /**
     * Load custom patterns from storage
     */
    loadCustomPatterns() {
        try {
            const patterns = localStorage.getItem('customTransactionPatterns');
            return patterns ? JSON.parse(patterns) : [];
        } catch (error) {
            console.error('Error loading custom patterns:', error);
            return [];
        }
    }

    /**
     * Save custom patterns to storage
     */
    saveCustomPatterns() {
        try {
            localStorage.setItem('customTransactionPatterns', JSON.stringify(this.customPatterns));
        } catch (error) {
            console.error('Error saving custom patterns:', error);
        }
    }

    /**
     * Get statistics about rule usage
     */
    getRuleStatistics() {
        const stats = {};
        this.rules.forEach(rule => {
            stats[rule.name] = {
                priority: rule.priority,
                timesApplied: 0 // This would need to be tracked
            };
        });
        return stats;
    }

    /**
     * Export rules for backup or sharing
     */
    exportRules() {
        return {
            builtInRules: this.rules.map(r => ({
                name: r.name,
                priority: r.priority
            })),
            customPatterns: this.customPatterns
        };
    }

    /**
     * Import custom patterns
     */
    importCustomPatterns(patterns) {
        this.customPatterns = [...this.customPatterns, ...patterns];
        this.saveCustomPatterns();
    }
}

// Export singleton instance
export const transactionRules = new TransactionRules();