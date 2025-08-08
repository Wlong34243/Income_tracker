// js/utils/CurrencyUtils.js
// Currency Formatting Utilities

export class CurrencyUtils {
    static format(amount, options = {}) {
        const defaults = {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        };
        
        const config = { ...defaults, ...options };
        
        try {
            return new Intl.NumberFormat('en-US', config).format(amount);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return `$${Number(amount).toFixed(2)}`;
        }
    }
    
    static parse(currencyString) {
        if (typeof currencyString !== 'string') {
            return parseFloat(currencyString) || 0;
        }
        
        // Remove currency symbols and formatting
        const cleaned = currencyString
            .replace(/[$,\s]/g, '')
            .replace(/[()]/g, ''); // Remove parentheses for negative numbers
        
        const amount = parseFloat(cleaned);
        
        // Check if original had parentheses (negative)
        if (currencyString.includes('(') && currencyString.includes(')')) {
            return -Math.abs(amount);
        }
        
        return amount || 0;
    }
}