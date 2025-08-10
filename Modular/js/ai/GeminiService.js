// js/ai/GeminiService.js
// Fixed version with all issues resolved

import { AppConfig } from '../config/AppConfig.js';

class GeminiService {
    constructor() {
        this.apiKey = this.getApiKey(); // Get from localStorage initially
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        this.transactionHistory = [];

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

    async categorizeTransaction(transaction, options = {}) {
        if (!this.apiKey) {
            return this.fallbackCategorization(transaction);
        }

        try {
            this.stats.aiCalled++;
            const result = await this.aiCategorize(transaction);
            return result; // Already has method: 'ai' from aiCategorize
        } catch (error) {
            console.error('AI categorization failed:', error);
            return this.fallbackCategorization(transaction);
        }
    }

    async aiCategorize(transaction) {
        const categories = Object.keys(AppConfig.CATEGORIES || {});
        
        // Updated prompt for consistent structure
        const prompt = `Categorize this financial transaction:
Description: "${transaction.description}"
Amount: $${transaction.amount}

Available categories: ${categories.join(', ')}

Respond with ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
    "type": "income" or "expense",
    "category": "one of the available categories",
    "subcategory": "specific subcategory or null",
    "confidence": 0.0 to 1.0,
    "entity": "RealEstate", "Tech", "Personal", or null
}`;

        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        
        return this.parseCategorizationResponse(result, transaction);
    }

    parseCategorizationResponse(result, transaction) {
        try {
            // Clean up the response - remove markdown code blocks if present
            const cleanedResult = result
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            
            const parsed = JSON.parse(cleanedResult);
            
            // Return unified structure
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
            // Fall back to rule-based categorization
            return this.fallbackCategorization(transaction);
        }
    }

    fallbackCategorization(transaction) {
        this.stats.fallbackUsed++;
        
        const desc = transaction.description.toLowerCase();
        const amount = Math.abs(transaction.amount);

        // CRITICAL FIX: Check for 0111 transfers (rent income)
        if (desc.includes('0111') && desc.includes('transfer')) {
            return {
                type: 'income',
                category: 'Real Estate Income',
                subcategory: 'Rent',
                confidence: 0.95,
                entity: 'RealEstate',
                method: 'fallback'
            };
        }

        // Check for Zelle/Venmo rent payments
        if ((desc.includes('zelle') || desc.includes('venmo')) && amount >= 500) {
            // Common tenant names or payment patterns
            const rentPatterns = ['payment', 'rent', 'deposit', 'tenant'];
            const tenantNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'davis', 'miller'];
            
            if (rentPatterns.some(pattern => desc.includes(pattern)) ||
                tenantNames.some(name => desc.includes(name))) {
                return {
                    type: 'income',
                    category: 'Real Estate Income',
                    subcategory: 'Rent',
                    confidence: 0.85,
                    entity: 'RealEstate',
                    method: 'fallback'
                };
            }
        }

        // Check for mortgage payments
        if (desc.includes('mortgage') || desc.includes('rocket') || desc.includes('mtg')) {
            return {
                type: 'expense',
                category: 'Mortgage',
                subcategory: 'Property',
                confidence: 0.9,
                entity: 'RealEstate',
                method: 'fallback'
            };
        }

        // Check for tech income
        if (desc.includes('consulting') || desc.includes('audit') || desc.includes('invoice')) {
            return {
                type: 'income',
                category: 'Tech Income',
                subcategory: 'Consulting',
                confidence: 0.85,
                entity: 'Tech',
                method: 'fallback'
            };
        }

        // Check for investment transfers
        if (desc.includes('schwab') || desc.includes('vanguard') || desc.includes('fidelity')) {
            return {
                type: transaction.amount > 0 ? 'income' : 'expense',
                category: 'Investment Transfer',
                subcategory: 'Brokerage',
                confidence: 0.8,
                entity: 'Investment',
                method: 'fallback'
            };
        }

        // Check for utilities
        if (desc.includes('electric') || desc.includes('water') || desc.includes('gas') || 
            desc.includes('utility') || desc.includes('vyve') || desc.includes('frontier')) {
            return {
                type: 'expense',
                category: 'Utilities',
                subcategory: null,
                confidence: 0.85,
                entity: 'Personal',
                method: 'fallback'
            };
        }

        // Check for insurance
        if (desc.includes('insurance') || desc.includes('state farm') || desc.includes('geico')) {
            return {
                type: 'expense',
                category: 'Insurance',
                subcategory: desc.includes('health') ? 'Health' : 'Auto',
                confidence: 0.85,
                entity: 'Personal',
                method: 'fallback'
            };
        }

        // Check for credit card payments
        if (desc.includes('payment') && (desc.includes('visa') || desc.includes('mastercard') || 
            desc.includes('amex') || desc.includes('discover'))) {
            return {
                type: 'expense',
                category: 'Credit Card Payment',
                subcategory: null,
                confidence: 0.8,
                entity: 'Personal',
                method: 'fallback'
            };
        }

        // Default categorization based on amount
        return {
            type: transaction.amount > 0 ? 'income' : 'expense',
            category: 'Uncategorized',
            subcategory: null,
            confidence: 0.1,
            entity: null,
            method: 'fallback'
        };
    }

    async batchCategorize(transactions, options = {}) {
        const results = [];
        
        for (const transaction of transactions) {
            try {
                const categorization = await this.categorizeTransaction(transaction, options);
                results.push({
                    transaction,
                    suggestion: categorization
                });
            } catch (error) {
                console.error('Error categorizing transaction:', error);
                results.push({
                    transaction,
                    suggestion: this.fallbackCategorization(transaction)
                });
            }
        }
        
        return results;
    }

    // Enhanced categorization for complex transactions
    enhancedCategorizeTransaction(transaction) {
        const description = transaction.description.toLowerCase();
        const amount = Math.abs(transaction.amount);
        
        // First try the standard categorization
        const result = this.fallbackCategorization(transaction);
        
        // If it's uncategorized, apply more sophisticated rules
        if (result.category === 'Uncategorized') {
            // Check account mappings for hints
            const accountId = transaction.accountId || transaction.account;
            if (accountId && AppConfig.ACCOUNT_MAPPING[accountId]) {
                const accountInfo = AppConfig.ACCOUNT_MAPPING[accountId];
                result.entity = accountInfo.entity;
                
                // Use account type to guess category
                if (accountInfo.entity === 'RealEstate' && amount > 500) {
                    result.category = 'Real Estate Income';
                    result.confidence = 0.6;
                } else if (accountInfo.entity === 'Tech') {
                    result.category = amount > 0 ? 'Tech Income' : 'Tech Expense';
                    result.confidence = 0.6;
                }
            }
        }
        
        return result;
    }

    getStats() {
        return {
            ...this.stats,
            totalProcessed: this.stats.rulesApplied + this.stats.aiCalled + this.stats.fallbackUsed
        };
    }

    resetStats() {
        this.stats = {
            rulesApplied: 0,
            aiCalled: 0,
            fallbackUsed: 0
        };
    }
}

// Export the class for instantiation, no singleton
export { GeminiService };
