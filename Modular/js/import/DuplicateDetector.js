// js/import/DuplicateDetector.js

export class DuplicateDetector {
    constructor(existingTransactions = []) {
        this.existingTransactions = existingTransactions;
    }

    /**
     * Check if a transaction is a duplicate
     * @param {Object} transaction 
     * @returns {boolean}
     */
    isDuplicate(transaction) {
        if (!this.existingTransactions || this.existingTransactions.length === 0) {
            return false;
        }

        return this.existingTransactions.some(existing => {
            // Match on date, amount, and description
            const sameDate = this.isSameDate(transaction.date, existing.date);
            const sameAmount = Math.abs(transaction.amount - existing.amount) < 0.01;
            const sameDescription = this.isSimilarDescription(transaction.description, existing.description);
            
            return sameDate && sameAmount && sameDescription;
        });
    }

    /**
     * Check if two dates are the same
     */
    isSameDate(date1, date2) {
        if (!date1 || !date2) return false;
        
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        return d1.toDateString() === d2.toDateString();
    }

    /**
     * Check if two descriptions are similar
     */
    isSimilarDescription(desc1, desc2) {
        if (!desc1 || !desc2) return false;
        
        // Simple similarity check - exact match or very close
        return desc1.toLowerCase().trim() === desc2.toLowerCase().trim();
    }

    /**
     * Find potential duplicates in a batch
     */
    findDuplicates(transactions) {
        const duplicates = [];
        
        for (const transaction of transactions) {
            if (this.isDuplicate(transaction)) {
                duplicates.push(transaction);
            }
        }
        
        return duplicates;
    }
}// Duplicate detection logic will be here