export class DashboardUI {
    /**
     * Renders the entire business dashboard.
     * @param {object} report - The analytics report from BusinessAnalytics.js.
     * @param {HTMLElement} container - The DOM element to render the dashboard into.
     */
    static render(report, container) {
        const { realEstate, techBusiness, combined, propertyPerformance } = report;

        // Find uncategorized transactions from all entities
        const uncategorizedCount =
            (report.realEstate.transactions.filter(t => !t.category || t.category === 'Uncategorized').length) +
            (report.techBusiness.transactions.filter(t => !t.category || t.category === 'Uncategorized').length) +
            (report.personal.transactions.filter(t => !t.category || t.category === 'Uncategorized').length);

        container.innerHTML = `
            <div class="mb-6">
                ${this.renderSummaryCards(realEstate, techBusiness, combined, uncategorizedCount)}
            </div>
            <div>
                ${this.renderPropertyPerformance(propertyPerformance)}
            </div>
        `;
    }

    static _formatCurrency(amount) {
        const color = amount >= 0 ? 'text-green-600' : 'text-red-600';
        return `<span class="${color}">$${Math.abs(amount).toFixed(2)}</span>`;
    }

    static renderSummaryCards(realEstate, techBusiness, combined, uncategorizedCount) {
        return `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">Real Estate Net Income</h3>
                    <p class="text-2xl font-bold">${this._formatCurrency(realEstate.net)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">Tech Business Net Income</h3>
                    <p class="text-2xl font-bold">${this._formatCurrency(techBusiness.net)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">Combined Net Income</h3>
                    <p class="text-2xl font-bold">${this._formatCurrency(combined.net)}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-sm text-gray-600">Uncategorized Transactions</h3>
                    <p class="text-2xl font-bold text-orange-600">${uncategorizedCount}</p>
                </div>
            </div>
        `;
    }

    static renderPropertyPerformance(propertyPerformance) {
        const properties = Object.entries(propertyPerformance)
            .sort(([, a], [, b]) => b.net - a.net); // Sort by net income

        if (properties.length === 0) {
            return '<div class="bg-white p-4 rounded-lg shadow"><h3 class="text-lg font-semibold">No property data available.</h3></div>';
        }

        const rows = properties.map(([name, data]) => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-medium">${name}</td>
                <td class="p-3 text-green-600">$${data.income.toFixed(2)}</td>
                <td class="p-3 text-red-600">$${data.expenses.toFixed(2)}</td>
                <td class="p-3 font-bold">${this._formatCurrency(data.net)}</td>
                <td class="p-3 text-center">${data.transactionCount}</td>
            </tr>
        `).join('');

        return `
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold mb-4">Property Performance</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-50 border-b">
                                <th class="p-3 font-semibold">Property</th>
                                <th class="p-3 font-semibold">Income</th>
                                <th class="p-3 font-semibold">Expenses</th>
                                <th class="p-3 font-semibold">Net Income</th>
                                <th class="p-3 font-semibold text-center">Transactions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}
