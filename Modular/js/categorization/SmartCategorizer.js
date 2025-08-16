// js/categorization/SmartCategorizer.js
export class SmartCategorizer {
    constructor() {
        this.learnedCategories = this.loadLearnedPatterns();
        this.merchantPatterns = this.initializeMerchantPatterns();
    }

    loadLearnedPatterns() {
        const stored = localStorage.getItem('learnedCategories');
        return stored ? JSON.parse(stored) : {};
    }

    initializeMerchantPatterns() {
        return {
            'Real Estate Income': [
                { pattern: /rent\s*(from|payment|received)/i, confidence: 0.9 },
                { pattern: /tenant/i, confidence: 0.8 },
                { pattern: /property\s*income/i, confidence: 0.9 },
                { pattern: /lease\s*payment/i, confidence: 0.9 }
            ],
            'Business Income': [
                { pattern: /consulting\s*(fee|payment)/i, confidence: 0.9 },
                { pattern: /audit\s*services/i, confidence: 0.9 },
                { pattern: /invoice\s*\d+/i, confidence: 0.8 },
                { pattern: /client\s*payment/i, confidence: 0.9 }
            ],
            'Investment Transfer': [
                { pattern: /transfer.*schwab/i, confidence: 0.95 },
                { pattern: /transfer.*investment/i, confidence: 0.9 },
                { pattern: /to\s*self.*directed/i, confidence: 0.9 }
            ],
            'Property Expenses': [
                { pattern: /property\s*tax/i, confidence: 0.95 },
                { pattern: /hoa/i, confidence: 0.9 },
                { pattern: /home\s*repair/i, confidence: 0.8 },
                { pattern: /lawn\s*service/i, confidence: 0.8 }
            ],
            'Insurance': [
                { pattern: /insurance/i, confidence: 0.9 },
                { pattern: /health\s*plan/i, confidence: 0.9 },
                { pattern: /car\s*insurance/i, confidence: 0.95 }
            ],
            'Healthcare': [
                { pattern: /hsa\s*contribution/i, confidence: 0.95 },
                { pattern: /medical/i, confidence: 0.8 },
                { pattern: /pharmacy/i, confidence: 0.9 },
                { pattern: /doctor/i, confidence: 0.8 }
            ],
            'Utilities': [
                { pattern: /vyve/i, confidence: 0.95 },
                { pattern: /frontier/i,.95 },
                { pattern: /netflix/i, confidence: 0.95 },
                { pattern: /electric\s*company/i, confidence: 0.9 },
                { pattern: /water\s*bill/i, confidence: 0.9 }
            ]
        };
    }

    enhanceCategoryDetection(transaction) {
        const description = transaction.description.toLowerCase();

        let bestMatch = { category: transaction.category || 'Other', confidence: 0 };

        for (const [category, patterns] of Object.entries(this.merchantPatterns)) {
            for (const { pattern, confidence } of patterns) {
                if (pattern.test(description) && confidence > bestMatch.confidence) {
                    bestMatch = { category, confidence };
                }
            }
        }

        return bestMatch.category;
    }

    categorizeWithLearning(description) {
        const key = description.toLowerCase().split(' ').slice(0, 3).join(' ');

        // Check learned patterns first
        if (this.learnedCategories[key]) {
            const categories = this.learnedCategories[key];
            let bestCategory = 'Other';
            let maxCount = 0;

            for (const [category, count] of Object.entries(categories)) {
                if (count > maxCount) {
                    maxCount = count;
                    bestCategory = category;
                }
            }

            if (maxCount > 1) { // Only use if seen multiple times
                return bestCategory;
            }
        }

        // Fall back to pattern-based categorization
        return this.enhanceCategoryDetection({ description });
    }

    improveAutoCategories(existingTransactions) {
        // Learn from existing categorized transactions
        const merchantCategories = {};

        existingTransactions.slice(0, 1000).forEach(trans => {
            if (trans.category && trans.category !== 'Other') {
                const key = trans.description.toLowerCase().split(' ').slice(0, 3).join(' ');
                if (!merchantCategories[key]) {
                    merchantCategories[key] = {};
                }
                merchantCategories[key][trans.category] = (merchantCategories[key][trans.category] || 0) + 1;
            }
        });

        // Store learned patterns for future use
        this.learnedCategories = { ...this.learnedCategories, ...merchantCategories };
        localStorage.setItem('learnedCategories', JSON.stringify(this.learnedCategories));
    }
}
