// js/ai/GeminiService.js
// Revised version incorporating bug fixes, performance enhancements, and improved robustness.

import { AppConfig } from '../config/AppConfig.js';

class GeminiService {
    /**
     * Initializes the service.
     */
    constructor() {
        this.apiKey = null; // Will be set during async initialization
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        this.transactionHistory = [];

        // Stats object to track categorization methods.
        this.stats = {
            rulesApplied: 0,
            aiCalled: 0,
            fallbackUsed: 0,
        };
    }

    /**
     * Asynchronously initializes the service. It first tries to load the API key
     * from localStorage. If not found, it attempts to load it from a `config.js`
     * file, which is treated as optional.
     */
    async initialize() {
        console.log('Initializing GeminiService...');
        const storedKey = localStorage.getItem('gemini_api_key');

        if (storedKey) {
            this.apiKey = storedKey;
            console.log('API key loaded from localStorage.');
            return;
        }

        try {
            // Dynamically import config.js to avoid a hard dependency.
            const { SecureConfig } = await import('../../config.js');
            if (SecureConfig && SecureConfig.GEMINI_API_KEY) {
                this.setApiKey(SecureConfig.GEMINI_API_KEY);
                console.log('API key set from config.js.');
            }
        } catch (e) {
            // This is not a critical error; the user can set the key in the UI.
            console.warn('Optional config.js not found or failed to load. Please set API key in settings if needed.');
        }

        if (!this.apiKey) {
            console.warn('No Gemini API key is configured. Service will rely on fallback rules.');
        }
    }

    /**
     * Retrieves the API key from instance memory.
     * @returns {string|null} The API key.
     */
    getApiKey() {
        return this.apiKey;
    }

    /**
     * Persists the API key to localStorage and sets it on the instance.
     * @param {string} apiKey - The Gemini API key.
     */
    setApiKey(apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        this.apiKey = apiKey;
    }

    /**
     * Categorizes a single transaction. It will try to use the AI first and
     * will use the local fallback rules if the API is unavailable or fails.
     * @param {object} transaction - The transaction object to categorize.
     * @param {object} options - Additional options (currently unused).
     * @returns {Promise<object>} A promise that resolves to the categorization result.
     */
    async categorizeTransaction(transaction, options = {}) {
        // If no API key is available, go straight to the fallback rules.
        if (!this.apiKey) {
            return this.fallbackCategorization(transaction);
        }

        try {
            this.stats.aiCalled++;
            const result = await this.aiCategorize(transaction);
            return result;
        } catch (error) {
            console.error('AI categorization failed, using fallback.', error);
            // The fallback method is self-contained and will provide a valid result.
            return this.fallbackCategorization(transaction);
        }
    }

    /**
     * Sends a request to the Gemini API to categorize the transaction.
     * @param {object} transaction - The transaction to categorize.
     * @returns {Promise<object>} A promise that resolves to the parsed AI response.
     */
    async aiCategorize(transaction) {
        const categories = Object.keys(AppConfig.CATEGORIES || {});

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        // **ROBUSTNESS FIX**: Check if the API returned any valid candidates.
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            throw new Error('API returned an empty or invalid response.');
        }

        const resultText = data.candidates[0].content.parts[0].text;
        return this.parseCategorizationResponse(resultText, transaction);
    }

    /**
     * Safely parses the JSON response from the AI.
     * @param {string} resultText - The text response from the API.
     * @param {object} transaction - The original transaction, for context.
     * @returns {object} The parsed and structured categorization result.
     */
    parseCategorizationResponse(resultText, transaction) {
        try {
            // Clean up potential markdown formatting from the response.
            const cleanedResult = resultText.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(cleanedResult);

            // Return a unified structure with defaults to prevent errors.
            return {
                type: parsed.type || (transaction.amount > 0 ? 'income' : 'expense'),
                category: parsed.category || 'Uncategorized',
                subcategory: parsed.subcategory || null,
                confidence: parsed.confidence || 0.5,
                entity: parsed.entity || null,
                method: 'ai',
            };
        } catch (error) {
            console.error('Failed to parse AI response, using fallback:', resultText, error);
            return this.fallbackCategorization(transaction);
        }
    }

    /**
     * Categorizes a transaction using a series of local, hard-coded rules.
     * This is used when the API is unavailable or fails.
     * **FIX**: This method now correctly increments the stats counter and includes
     * the logic from the previously unused `enhancedCategorizeTransaction`.
     * @param {object} transaction - The transaction to categorize.
     * @returns {object} The categorization result.
     */
    fallbackCategorization(transaction) {
        this.stats.fallbackUsed++;
        const desc = transaction.description.toLowerCase();
        const amount = Math.abs(transaction.amount);
        let result = null;

        // Rule-based categorization
        if (desc.includes('0111') && desc.includes('transfer')) {
            result = { type: 'income', category: 'Real Estate Income', subcategory: 'Rent', confidence: 0.95, entity: 'RealEstate' };
        } else if ((desc.includes('zelle') || desc.includes('venmo')) && amount >= 500) {
            const rentPatterns = ['payment', 'rent', 'deposit', 'tenant', 'smith', 'johnson', 'williams', 'brown', 'jones', 'davis', 'miller'];
            if (rentPatterns.some(pattern => desc.includes(pattern))) {
                result = { type: 'income', category: 'Real Estate Income', subcategory: 'Rent', confidence: 0.85, entity: 'RealEstate' };
            }
        } else if (desc.includes('mortgage') || desc.includes('rocket') || desc.includes('mtg')) {
            result = { type: 'expense', category: 'Mortgage', subcategory: 'Property', confidence: 0.9, entity: 'RealEstate' };
        } else if (desc.includes('consulting') || desc.includes('audit') || desc.includes('invoice')) {
            result = { type: 'income', category: 'Tech Income', subcategory: 'Consulting', confidence: 0.85, entity: 'Tech' };
        } else if (desc.includes('schwab') || desc.includes('vanguard') || desc.includes('fidelity')) {
            result = { type: transaction.amount > 0 ? 'income' : 'expense', category: 'Investment Transfer', subcategory: 'Brokerage', confidence: 0.8, entity: 'Investment' };
        } else if (['electric', 'water', 'gas', 'utility', 'vyve', 'frontier'].some(p => desc.includes(p))) {
            result = { type: 'expense', category: 'Utilities', subcategory: null, confidence: 0.85, entity: 'Personal' };
        } else if (desc.includes('insurance') || desc.includes('state farm') || desc.includes('geico')) {
            result = { type: 'expense', category: 'Insurance', subcategory: desc.includes('health') ? 'Health' : 'Auto', confidence: 0.85, entity: 'Personal' };
        } else if (desc.includes('payment') && ['visa', 'mastercard', 'amex', 'discover'].some(p => desc.includes(p))) {
            result = { type: 'expense', category: 'Credit Card Payment', subcategory: null, confidence: 0.8, entity: 'Personal' };
        }

        // If a rule was successfully applied, increment the counter and return.
        if (result) {
            this.stats.rulesApplied++;
            return { ...result, method: 'fallback-rule' };
        }

        // **INTEGRATED LOGIC**: If no specific rule matched, try enhanced logic.
        const enhancedResult = {
            type: transaction.amount > 0 ? 'income' : 'expense',
            category: 'Uncategorized',
            subcategory: null,
            confidence: 0.1,
            entity: null,
            method: 'fallback-default'
        };

        const accountId = transaction.accountId || transaction.account;
        if (accountId && AppConfig.ACCOUNT_MAPPING && AppConfig.ACCOUNT_MAPPING[accountId]) {
            const accountInfo = AppConfig.ACCOUNT_MAPPING[accountId];
            enhancedResult.entity = accountInfo.entity;
            if (accountInfo.entity === 'RealEstate' && amount > 500) {
                enhancedResult.category = 'Real Estate Income';
                enhancedResult.confidence = 0.6;
                this.stats.rulesApplied++; // This is an applied rule.
            } else if (accountInfo.entity === 'Tech') {
                enhancedResult.category = amount > 0 ? 'Tech Income' : 'Tech Expense';
                enhancedResult.confidence = 0.6;
                this.stats.rulesApplied++; // This is an applied rule.
            }
        }

        return enhancedResult;
    }

    /**
     * Categorizes a batch of transactions in parallel for performance.
     * **PERFORMANCE FIX**: Uses Promise.all to send requests concurrently.
     * @param {Array<object>} transactions - An array of transaction objects.
     * @param {object} options - Additional options.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of results.
     */
    async batchCategorize(transactions, options = {}) {
        const promises = transactions.map(transaction =>
            this.categorizeTransaction(transaction, options)
                .then(suggestion => ({ transaction, suggestion }))
                .catch(error => {
                    console.error('Error in batch categorization for transaction:', transaction.description, error);
                    // Ensure a valid fallback is always returned on error.
                    return {
                        transaction,
                        suggestion: this.fallbackCategorization(transaction),
                    };
                })
        );
        return Promise.all(promises);
    }

    /**
     * Returns the current statistics for categorization.
     * @returns {object} The stats object.
     */
    getStats() {
        return {
            ...this.stats,
            totalProcessed: this.stats.rulesApplied + this.stats.aiCalled + this.stats.fallbackUsed,
        };
    }

    /**
     * Resets the statistics counters to zero.
     */
    resetStats() {
        this.stats = {
            rulesApplied: 0,
            aiCalled: 0,
            fallbackUsed: 0,
        };
    }
}

// Create a singleton instance for easy import across the application.
const geminiService = new GeminiService();

// Export both the class for testing/extension and the singleton instance.
export { GeminiService, geminiService };
