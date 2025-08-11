// js/utils/DateUtils.js
// Centralized Date Parsing and Formatting Utilities

export class DateUtils {
    /**
     * Parses a date string from various common formats into a standard YYYY-MM-DD string.
     * @param {string | Date | object} dateInput - The date input to parse.
     * @returns {string} The formatted date string (YYYY-MM-DD) or today's date as a fallback.
     */
    static parseToYYYYMMDD(dateInput) {
        if (!dateInput) return new Date().toISOString().split('T')[0];

        // Handle Firestore Timestamp objects
        if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
            return new Date(dateInput.seconds * 1000).toISOString().split('T')[0];
        }
        
        // Handle existing Date objects
        if (dateInput instanceof Date) {
            if (!isNaN(dateInput.getTime())) {
                return dateInput.toISOString().split('T')[0];
            }
            return new Date().toISOString().split('T')[0];
        }

        // Handle string inputs
        const dateStr = String(dateInput);

        // Try YYYY-MM-DD format first (most reliable)
        let match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
            const date = new Date(match[1], match[2] - 1, match[3]);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }

        // Try MM/DD/YYYY or M/D/YYYY
        match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (match) {
            const year = match[3].length === 2 ? `20${match[3]}` : match[3];
            const date = new Date(year, match[1] - 1, match[2]);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
        
        // Fallback to native parsing
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
    }

    /**
     * Formats a date object or string into a specified format.
     * @param {string | Date} dateInput
     * @param {string} format
     * @returns {string}
     */
    static formatDate(dateInput, format = 'MM/DD/YYYY') {
        if (!dateInput) return '';
        
        const d = new Date(this.parseToYYYYMMDD(dateInput));
        if (isNaN(d.getTime())) return '';
        
        // The date object is now in UTC, get parts in UTC to avoid timezone shifts
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const year = d.getUTCFullYear();
        
        switch (format) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'Month D, YYYY':
                return d.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
            default:
                return d.toLocaleDateString('en-US', { timeZone: 'UTC' });
        }
    }
}
