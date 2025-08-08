// js/utils/ValidationUtils.js
// Input Validation Utilities

export class ValidationUtils {
    static validateTransaction(transaction) {
        const errors = [];
        
        if (!transaction.description || transaction.description.trim() === '') {
            errors.push('Description is required');
        }
        
        if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
            errors.push('Valid amount is required');
        }
        
        if (!transaction.type || !['Income', 'Expense', 'Transfer'].includes(transaction.type)) {
            errors.push('Valid transaction type is required');
        }
        
        if (!transaction.date) {
            errors.push('Date is required');
        }
        
        if (!transaction.accountId) {
            errors.push('Account is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static validateCSVFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('No file selected');
            return { isValid: false, errors };
        }
        
        if (file.size === 0) {
            errors.push('File is empty');
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            errors.push('File is too large (max 10MB)');
        }
        
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
        const fileName = file.name.toLowerCase();
        
        if (!allowedTypes.includes(file.type) && !fileName.endsWith('.csv')) {
            errors.push('File must be a CSV file');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}