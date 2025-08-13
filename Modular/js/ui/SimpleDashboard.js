export class SimpleDashboard {
    static render(transactions, accounts, container) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyTrans = transactions.filter(t => {
            const d = new Date(t.date);
            // Adjust for timezone issues by using UTC dates
            return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
        });

        const income = monthlyTrans
            .filter(t => t.amount > 0 && t.category !== 'Transfer')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = monthlyTrans
            .filter(t => t.amount < 0 && t.category !== 'Transfer')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const uncategorized = monthlyTrans
            .filter(t => !t.category || t.category === 'Uncategorized')
            .length;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">This Month's Income</h3>
                    <p class="text-2xl font-bold text-green-600">$${income.toFixed(2)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">This Month's Expenses</h3>
                    <p class="text-2xl font-bold text-red-600">$${expenses.toFixed(2)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">Net Income</h3>
                    <p class="text-2xl font-bold ${ (income - expenses) >= 0 ? 'text-gray-800' : 'text-orange-600' }">$${(income - expenses).toFixed(2)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">Uncategorized</h3>
                    <p class="text-2xl font-bold text-orange-600">${uncategorized}</p>
                </div>
            </div>
        `;
    }
}
