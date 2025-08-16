// js/import/ChaseCSVParser.js
export class ChaseCSVParser {

    parseChaseCSVAdvanced(row, accountInfo) {
        // Handle different Chase CSV formats
        const formats = [
            {
                // Format 1: Standard Chase checking/savings
                date: ['Posting Date', 'Transaction Date'],
                description: ['Description'],
                amount: ['Amount'],
                type: ['Type']
            },
            {
                // Format 2: Chase credit card
                date: ['Transaction Date', 'Post Date'],
                description: ['Description', 'Merchant'],
                amount: ['Amount'],
                type: ['Category']
            },
            {
                // Format 3: Older Chase format
                date: ['Date'],
                description: ['Description', 'Check or Slip #'],
                amount: ['Amount'],
                type: ['Details']
            }
        ];

        let transaction = null;

        for (const format of formats) {
            const dateValue = this.getFirstValue(row, format.date);
            const descValue = this.getFirstValue(row, format.description);
            const amountValue = this.getFirstValue(row, format.amount);
            const typeValue = this.getFirstValue(row, format.type);

            if (dateValue && descValue && amountValue !== undefined) {
                const date = this.parseDate(dateValue);
                if (date) {
                    const amount = parseFloat(String(amountValue).replace(/[$,]/g, ''));

                    transaction = {
                        date: date,
                        description: this.cleanDescription(descValue),
                        amount: amount,
                        type: this.detectTransactionType(descValue, amount, typeValue),
                        accountId: accountInfo?.id || '',
                        accountName: accountInfo?.name || 'Unknown Account',
                        entity: accountInfo?.entity || 'Personal'
                    };
                    break;
                }
            }
        }

        return transaction;
    }

    getFirstValue(row, columns) {
        for (const col of columns) {
            if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
                return row[col];
            }
        }
        return null;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;

        // Try different date formats
        const formats = [
            // MM/DD/YYYY
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
            // MM-DD-YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
            // YYYY-MM-DD
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
            // MM/DD/YY
            /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
        ];

        for (const format of formats) {
            const match = String(dateStr).match(format);
            if (match) {
                let year, month, day;

                if (match[0].startsWith('20') || match[0].startsWith('19')) {
                    // YYYY-MM-DD format
                    [_, year, month, day] = match;
                } else if (match[3].length === 2) {
                    // MM/DD/YY format
                    [_, month, day, year] = match;
                    year = '20' + year;
                } else {
                    // MM/DD/YYYY format
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

    cleanDescription(description) {
        if (!description) return '';

        // Remove common noise from descriptions
        return String(description)
            .replace(/\s+/g, ' ')
            .replace(/^\d+\s+/, '') // Remove leading transaction numbers
            .replace(/\s+\d{4,}$/, '') // Remove trailing reference numbers
            .replace(/^(DEBIT|CREDIT|CHECK|ACH|WIRE)\s+/i, '') // Remove transaction type prefixes
            .trim();
    }

    detectTransactionType(description, amount, typeField) {
        const desc = description.toLowerCase();
        const type = (typeField || '').toLowerCase();

        // Check for transfers
        if (desc.includes('transfer') || desc.includes('xfer')) {
            return 'transfer';
        }

        // Check type field
        if (type.includes('credit') || type.includes('deposit') || type.includes('payment received')) {
            return 'income';
        }

        // Check description patterns
        if (desc.includes('deposit') || desc.includes('credit') || desc.includes('payment from')) {
            return 'income';
        }

        // Default based on amount
        return amount > 0 ? 'income' : 'expense';
    }
}
