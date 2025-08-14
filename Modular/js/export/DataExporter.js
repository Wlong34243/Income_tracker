export class DataExporter {
    static exportToCSV(transactions, filename = 'transactions.csv') {
        const headers = ['Date', 'Description', 'Amount', 'Category', 'Account'];
        const rows = transactions.map(t => [
            t.date,
            t.description,
            t.amount,
            `${t.category || ''} - ${t.subcategory || ''}`,
            t.accountId
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
