export class MonthlyDashboard {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.targetMonthlyNet = 17932; // User's retirement income target
        this.selectedPeriod = 'last4months';
    }

    async render(container) {
        const data = await this.calculateMonthlyMetrics();
        container.innerHTML = this.generateDashboardHTML(data);
        this.attachEventListeners(container);
    }

    async calculateMonthlyMetrics() {
        // Load more transactions to ensure we get all historical data
        const transactions = await this.dataService.loadTransactions(1000);

        // REMOVE the current month filter - show ALL available data
        // Don't filter by date at all initially
        console.log(`Total transactions loaded: ${transactions.length}`);

        // Group by month for analysis
        const monthlyData = this.groupTransactionsByMonth(transactions);

        // In render method, replace date calculation with:
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 4); // Show last 4 months

        const relevantTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startDate && txDate <= endDate;
        });

        const realEstate = relevantTransactions.filter(t => t.entity === 'Real Estate' && t.category !== 'Transfer');
        const techBusiness = relevantTransactions.filter(t => t.entity === 'Tech Business' && t.category !== 'Transfer');
        const personal = relevantTransactions.filter(t => t.entity === 'Personal' && t.category !== 'Transfer');

        const realEstateMetrics = this.calculateEntityMetrics(realEstate);
        const techBusinessMetrics = this.calculateEntityMetrics(techBusiness);

        const propertyData = this.calculatePropertyPerformance(realEstate);

        const targetProgress = {
            current: realEstateMetrics.net + techBusinessMetrics.net,
            target: 17932, // User's monthly retirement income goal
            percentage: ((realEstateMetrics.net + techBusinessMetrics.net) / 17932 * 100)
        };

        const monthlyComparison = this.generateMonthlyComparison(transactions);

        return {
            realEstate: realEstateMetrics,
            techBusiness: techBusinessMetrics,
            personal: this.calculateEntityMetrics(personal),
            combined: this.calculateCombinedMetrics(realEstate, techBusiness),
            propertyData: propertyData,
            targetProgress: targetProgress,
            monthlyComparison: monthlyComparison
        };
    }

    groupTransactionsByMonth(transactions) {
        return transactions.reduce((acc, t) => {
            const month = new Date(t.date).getMonth();
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(t);
            return acc;
        }, {});
    }

    calculateEntityMetrics(transactions) {
        const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        return {
            income: income,
            expenses: Math.abs(expenses),
            net: income + expenses
        };
    }

    calculateCombinedMetrics(realEstateTrans, techBusinessTrans) {
        const realEstateMetrics = this.calculateEntityMetrics(realEstateTrans);
        const techBusinessMetrics = this.calculateEntityMetrics(techBusinessTrans);
        return {
            income: realEstateMetrics.income + techBusinessMetrics.income,
            expenses: realEstateMetrics.expenses + techBusinessMetrics.expenses,
            net: realEstateMetrics.net + techBusinessMetrics.net
        };
    }

    generateDashboardHTML(data) {
        const { realEstate, techBusiness, combined, propertyData, targetProgress } = data;

        return `
            <div class="space-y-6">
                <div class="bg-white p-4 rounded-lg shadow mb-6">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold">Analysis Period</h3>
                        <div class="flex gap-2">
                            <select id="period-selector" class="px-3 py-1 border rounded">
                                <option value="april2025">April 2025</option>
                                <option value="may2025">May 2025</option>
                                <option value="june2025">June 2025</option>
                                <option value="july2025">July 2025</option>
                                <option value="q2-2025">Q2 2025 (Apr-Jun)</option>
                                <option value="last4months" selected>Last 4 Months</option>
                                <option value="ytd">Year to Date</option>
                            </select>
                            <button id="refresh-dashboard" class="px-4 py-2 bg-blue-600 text-white rounded">
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Target Progress Bar -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Monthly Target Progress</h3>
                    <div class="mb-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Net Income Progress</span>
                            <span class="font-bold">${this.formatCurrency(targetProgress.current)} / ${this.formatCurrency(targetProgress.target)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-4">
                            <div class="bg-${targetProgress.percentage >= 100 ? 'green' : targetProgress.percentage >= 75 ? 'blue' : 'orange'}-600 h-4 rounded-full"
                                 style="width: ${Math.min(targetProgress.percentage, 100)}%"></div>
                        </div>
                        <p class="text-xs text-gray-600 mt-1">${targetProgress.percentage.toFixed(1)}% of monthly goal</p>
                    </div>
                </div>

                <!-- Business Performance Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-4 rounded-lg shadow">
                        <h4 class="text-sm text-gray-600 mb-2">Real Estate</h4>
                        <p class="text-2xl font-bold ${realEstate.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(realEstate.net)}</p>
                        <div class="text-xs text-gray-500 mt-2">
                            <div>Income: ${this.formatCurrency(realEstate.income)}</div>
                            <div>Expenses: ${this.formatCurrency(realEstate.expenses)}</div>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-lg shadow">
                        <h4 class="text-sm text-gray-600 mb-2">Tech Business</h4>
                        <p class="text-2xl font-bold ${techBusiness.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(techBusiness.net)}</p>
                        <div class="text-xs text-gray-500 mt-2">
                            <div>Income: ${this.formatCurrency(techBusiness.income)}</div>
                            <div>Expenses: ${this.formatCurrency(techBusiness.expenses)}</div>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-lg shadow">
                        <h4 class="text-sm text-gray-600 mb-2">Combined Business</h4>
                        <p class="text-2xl font-bold ${combined.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(combined.net)}</p>
                        <div class="text-xs text-gray-500 mt-2">
                            <div>Total Income: ${this.formatCurrency(combined.income)}</div>
                            <div>Total Expenses: ${this.formatCurrency(combined.expenses)}</div>
                        </div>
                    </div>
                </div>

                <!-- Property Performance Table -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Property Performance</h3>
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-2 text-left">Property</th>
                                <th class="p-2 text-right">Expected</th>
                                <th class="p-2 text-right">Received</th>
                                <th class="p-2 text-right">Expenses</th>
                                <th class="p-2 text-right">Net</th>
                                <th class="p-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generatePropertyRows(propertyData)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    calculatePropertyPerformance(realEstateTransactions) {
        const properties = {
            '5th ST E': { expected: 3000, received: 0, expenses: 0 },
            '2024 50th': { expected: 2800, received: 0, expenses: 0 },
            'Las Palmas': { expected: 1250, received: 0, expenses: 0 },
            '37th Ave E': { expected: 1350, received: 0, expenses: 0 },
            '2nd St W': { expected: 2900, received: 0, expenses: 0 },
            '1112 36th St W': { expected: 3200, received: 0, expenses: 0 },
            '59th Ave E': { expected: 3100, received: 0, expenses: 0 }
        };

        // Calculate received rent by property
        realEstateTransactions.forEach(t => {
            if (t.subcategory === 'Rent' && t.amount > 0) {
                const property = this.identifyPropertyFromTransaction(t);
                if (properties[property]) {
                    properties[property].received += t.amount;
                }
            }
            // Track property expenses if identifiable
            if (t.amount < 0 && t.entity === 'Real Estate') {
                const property = this.identifyPropertyFromTransaction(t);
                if (properties[property]) {
                    properties[property].expenses += Math.abs(t.amount);
                }
            }
        });

        // Calculate net for each property
        Object.keys(properties).forEach(prop => {
            const p = properties[prop];
            p.net = p.received - p.expenses;
            p.status = p.received === 0 ? '🔴 Missing' :
                       p.received < p.expected ? '⚠️ Partial' : '✅ Collected';
        });

        return properties;
    }

    generatePropertyRows(propertyData) {
        return Object.entries(propertyData).map(([name, data]) => `
            <tr>
                <td class="p-2">${name}</td>
                <td class="p-2 text-right">${this.formatCurrency(data.expected)}</td>
                <td class="p-2 text-right">${this.formatCurrency(data.received)}</td>
                <td class="p-2 text-right">${this.formatCurrency(data.expenses)}</td>
                <td class="p-2 text-right font-bold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(data.net)}</td>
                <td class="p-2 text-center">${data.status}</td>
            </tr>
        `).join('');
    }

    identifyPropertyFromTransaction(transaction) {
        if (transaction.property) {
            return transaction.property;
        }
        // Fallback for older transactions, can be improved
        const desc = transaction.description.toLowerCase();
        if(desc.includes('5th st')) return '5th ST E';
        if(desc.includes('50th')) return '2024 50th';
        return 'Unassigned';
    }

    attachEventListeners(container) {
        // Period selector
        const periodSelector = container.querySelector('#period-selector');
        if (periodSelector) {
            periodSelector.value = this.selectedPeriod;
            periodSelector.addEventListener('change', async (e) => {
                this.selectedPeriod = e.target.value;
                await this.render(container);
            });
        }

        // Refresh button
        container.querySelector('#refresh-dashboard')?.addEventListener('click', async () => {
            await this.render(container);
        });
    }

    getDateRangeForPeriod(period) {
        const now = new Date(2025, 7, 15); // Use a fixed "now" for consistent testing
        switch(period) {
            case 'april2025':
                return { start: new Date(2025, 3, 1), end: new Date(2025, 3, 30) };
            case 'may2025':
                return { start: new Date(2025, 4, 1), end: new Date(2025, 4, 31) };
            case 'june2025':
                return { start: new Date(2025, 5, 1), end: new Date(2025, 5, 30) };
            case 'july2025':
                return { start: new Date(2025, 6, 1), end: new Date(2025, 6, 31) };
            case 'q2-2025':
                return { start: new Date(2025, 3, 1), end: new Date(2025, 5, 30) };
            case 'last4months':
                return { start: new Date(2025, 3, 1), end: new Date(2025, 6, 31) };
            case 'ytd':
                return { start: new Date(2025, 0, 1), end: new Date(2025, 6, 31) };
            default:
                return { start: new Date(2025, 3, 1), end: new Date(2025, 6, 31) };
        }
    }

    generateMonthlyComparison(transactions) {
        const months = ['April', 'May', 'June', 'July'];
        const monthlyData = {};

        months.forEach((month, index) => {
            const monthNum = index + 3; // April = 3
            const monthTrans = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() === monthNum && date.getFullYear() === 2025;
            });

            monthlyData[month] = {
                realEstateIncome: this.sumByCategory(monthTrans, 'Real Estate Income'),
                realEstateExpenses: this.sumByCategory(monthTrans, 'Property Expenses'),
                techIncome: this.sumByCategory(monthTrans, 'Tech Business Income'),
                netIncome: 0 // Calculate this
            };
        });

        return monthlyData;
    }

    sumByCategory(transactions, category) {
        return transactions
            .filter(t => t.category === category)
            .reduce((sum, t) => sum + t.amount, 0);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
}
