// js/utils/DateUtils.js
// Date Parsing and Formatting Utilities

export class DateUtils {
    static parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Try different date formats common in CSV files
        const formats = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,     // MM/DD/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{4})/,      // MM-DD-YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/,      // YYYY-MM-DD
            /(\d{1,2})\/(\d{1,2})\/(\d{2})/     // MM/DD/YY
        ];
        
        for (const format of formats) {
            const match = String(dateStr).match(format);
            if (match) {
                let year, month, day;
                
                if (match[0].startsWith('20') || match[0].startsWith('19')) {
                    [_, year, month, day] = match;
                } else if (match[3]?.length === 2) {
                    [_, month, day, year] = match;
                    year = '20' + year;
                } else {
                    [_, month, day, year] = match;
                }
                
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        // Try native Date parsing as fallback
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }
    
    static formatDate(date, format = 'MM/DD/YYYY') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        
        switch (format) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            default:
                return d.toLocaleDateString();
        }
    }
}