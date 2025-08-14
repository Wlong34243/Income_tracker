// js/ai/GeminiService.js
// This version incorporates all the fixes from the code review.

import { AppConfig } from '../config/AppConfig.js';

class GeminiService {
    constructor(categoryManager) {
        this.categoryManager = categoryManager;
        this.apiKey = this.getApiKey();
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        // this.transactionHistory is unused, so it has been removed.
        this.stats = {
            rulesApplied: 0,
            aiCalled: 0,
            fallbackUsed: 0
        };
    }

    async initialize() {
        console.log('Initializing GeminiService...');
        if (this.apiKey) {
            console.log('API key already set from localStorage.');
            return;
        }
        try {
            const { SecureConfig } = await import('../../config.js');
            if (SecureConfig && SecureConfig.GEMINI_API_KEY) {
                this.setApiKey(SecureConfig.GEMINI_API_KEY);
                console.log('API key set from config.js.');
            }
        } catch (e) {
            console.warn('config.js not found or failed to load. Please set API key in settings.');
        }
        if (!this.apiKey) {
            console.warn('No Gemini API key configured.');
        }
    }

    getApiKey() {
        return localStorage.getItem('gemini_api_key') || null;
    }

    setApiKey(apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        this.apiKey = apiKey;
    }

    async testConnection() {
       if (!this.apiKey) return false;
       try {
           const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   contents: [{ parts: [{ text: "Test" }] }]
               })
           });
           return response.ok;
       } catch (error) {
           console.error('Gemini test failed:', error);
           return false;
       }
    }

    async categorizeTransaction(transaction, options = {}) {
        if (!this.apiKey) {
            return this.fallbackCategorization(transaction);
        }
        try {
            this.stats.aiCalled++;
            const result = await this.aiCategorize(transaction);
            return result;
        } catch (error) {
            console.error('AI categorization failed:', error);
            return this.fallbackCategorization(transaction);
        }
    }

    async aiCategorize(transaction) {
        const categories = this.categoryManager.categories.map(c => `${c.category} / ${c.subcategory}`);
        const prompt = `Categorize this financial transaction:\nDescription: "${transaction.description}"\nAmount: $${transaction.amount}\n\nAvailable categories: ${categories.join(', ')}\n\nRespond with ONLY a JSON object (no markdown, no explanation) with these exact fields:\n{\n    "type": "income" or "expense",\n    "category": "one of the available categories",\n    "subcategory": "specific subcategory or null",\n    "confidence": 0.0 to 1.0,\n    "entity": "RealEstate", "Tech", "Personal", or null\n}`;

        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        // FIX: Add robustness check for API response
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content.parts[0].text) {
            console.warn('API returned no valid candidates. Falling back.', data);
            return this.fallbackCategorization(transaction);
        }

        const result = data.candidates[0].content.parts[0].text;
        return this.parseCategorizationResponse(result, transaction);
    }

    parseCategorizationResponse(result, transaction) {
        try {
            const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanedResult);
            return {
                type: parsed.type || (transaction.amount > 0 ? 'income' : 'expense'),
                category: parsed.category || 'Uncategorized',
                subcategory: parsed.subcategory || null,
                confidence: parsed.confidence || 0.5,
                entity: parsed.entity || null,
                method: 'ai'
            };
        } catch (error) {
            console.error("Failed to parse AI response:", result, error);
            return this.fallbackCategorization(transaction);
        }
    }

    fallbackCategorization(transaction) {
        this.stats.fallbackUsed++;
        const desc = transaction.description.toLowerCase();
        const amount = Math.abs(transaction.amount);

        // This function now returns a result object or null
        const applyRule = (result) => {
            this.stats.rulesApplied++; // FIX: Increment stats counter
            return result;
        };

        if (desc.includes('0111') && desc.includes('transfer')) {
            return applyRule({ type: 'income', category: 'Real Estate Income', subcategory: 'Rent', confidence: 0.95, entity: 'RealEstate', method: 'fallback' });
        }
        if ((desc.includes('zelle') || desc.includes('venmo')) && amount >= 500) {
            const rentPatterns = ['payment', 'rent', 'deposit', 'tenant'];
            const tenantNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'davis', 'miller'];
            if (rentPatterns.some(p => desc.includes(p)) || tenantNames.some(n => desc.includes(n))) {
                return applyRule({ type: 'income', category: 'Real Estate Income', subcategory: 'Rent', confidence: 0.85, entity: 'RealEstate', method: 'fallback' });
            }
        }
        if (desc.includes('mortgage') || desc.includes('rocket') || desc.includes('mtg')) {
            return applyRule({ type: 'expense', category: 'Mortgage', subcategory: 'Property', confidence: 0.9, entity: 'RealEstate', method: 'fallback' });
        }
        if (desc.includes('consulting') || desc.includes('audit') || desc.includes('invoice')) {
            return applyRule({ type: 'income', category: 'Tech Income', subcategory: 'Consulting', confidence: 0.85, entity: 'Tech', method: 'fallback' });
        }
        if (desc.includes('schwab') || desc.includes('vanguard') || desc.includes('fidelity')) {
            return applyRule({ type: transaction.amount > 0 ? 'income' : 'expense', category: 'Investment Transfer', subcategory: 'Brokerage', confidence: 0.8, entity: 'Investment', method: 'fallback' });
        }
        if (desc.includes('electric') || desc.includes('water') || desc.includes('gas') || desc.includes('utility') || desc.includes('vyve') || desc.includes('frontier')) {
            return applyRule({ type: 'expense', category: 'Utilities', subcategory: null, confidence: 0.85, entity: 'Personal', method: 'fallback' });
        }
        if (desc.includes('insurance') || desc.includes('state farm') || desc.includes('geico')) {
            return applyRule({ type: 'expense', category: 'Insurance', subcategory: desc.includes('health') ? 'Health' : 'Auto', confidence: 0.85, entity: 'Personal', method: 'fallback' });
        }
        if (desc.includes('payment') && (desc.includes('visa') || desc.includes('mastercard') || desc.includes('amex') || desc.includes('discover'))) {
            return applyRule({ type: 'expense', category: 'Credit Card Payment', subcategory: null, confidence: 0.8, entity: 'Personal', method: 'fallback' });
        }

        // FIX: Integrate logic from enhancedCategorizeTransaction here as a final fallback step
        const accountId = transaction.accountId || transaction.account;
        if (accountId && AppConfig.ACCOUNT_MAPPING[accountId]) {
            const accountInfo = AppConfig.ACCOUNT_MAPPING[accountId];
            if (accountInfo.entity === 'RealEstate' && amount > 500) {
                return applyRule({ type: 'income', category: 'Real Estate Income', subcategory: 'Rent', entity: 'RealEstate', confidence: 0.6, method: 'fallback' });
            } else if (accountInfo.entity === 'Tech') {
                return applyRule({ type: amount > 0 ? 'income' : 'expense', category: amount > 0 ? 'Tech Income' : 'Tech Expense', entity: 'Tech', confidence: 0.6, method: 'fallback' });
            }
        }

        // Default categorization
        return { type: transaction.amount > 0 ? 'income' : 'expense', category: 'Uncategorized', subcategory: null, confidence: 0.1, entity: null, method: 'fallback' };
    }

    // FIX: Re-implemented with Promise.all for parallel execution
    async batchCategorize(transactions, options = {}) {
        const promises = transactions.map(transaction =>
            this.categorizeTransaction(transaction, options)
                .then(suggestion => ({ transaction, suggestion }))
                .catch(error => {
                    console.error('Error in batch categorization for transaction:', transaction.description, error);
                    return {
                        transaction,
                        suggestion: this.fallbackCategorization(transaction)
                    };
                })
        );
        return Promise.all(promises);
    }

    getStats() {
        return {
            ...this.stats,
            totalProcessed: this.stats.rulesApplied + this.stats.aiCalled + this.stats.fallbackUsed
        };
    }

    resetStats() {
        this.stats = { rulesApplied: 0, aiCalled: 0, fallbackUsed: 0 };
    }
}

// FIX: Export both the class and a singleton instance for flexibility
const geminiService = new GeminiService();
export { GeminiService, geminiService };
