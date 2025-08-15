export class MonthlyDashboard {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.targetMonthlyNet = 17932; // User's retirement income target
    }

    async render(container) {
        const data = await this.calculateMonthlyMetrics();
        container.innerHTML = this.generateDashboardHTML(data);
        this.attachEventListeners(container);
    }

    async calculateMonthlyMetrics() {
        const transactions = await this.dataService.loadTransactions(500);

        // To: Show last 4 months of data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 4);

        const recentTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startDate && txDate <= endDate;
        });

        // Separate by entity
        const realEstate = recentTransactions.filter(t => t.entity === 'Real Estate');
        const techBusiness = monthlyTrans.filter(t => t.entity === 'Tech Business');
        const personal = monthlyTrans.filter(t => t.entity === 'Personal');

        // Calculate expected vs actual rent
        const expectedRents = this.getExpectedRents();
        const receivedRents = this.getReceivedRents(realEstate);
        const missingRents = this.findMissingRents(expectedRents, receivedRents);

        return {
            realEstate: this.calculateEntityMetrics(realEstate),
            techBusiness: this.calculateEntityMetrics(techBusiness),
            personal: this.calculateEntityMetrics(personal),
            combined: this.calculateCombinedMetrics(realEstate, techBusiness),
            rentStatus: { expected: expectedRents, received: receivedRents, missing: missingRents },
            targetProgress: this.calculateTargetProgress(realEstate, techBusiness),
            recurringDue: [] // Placeholder, will be replaced by RecurringTemplates
        };
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

    calculateTargetProgress(realEstateTrans, techBusinessTrans) {
        const combinedNet = this.calculateCombinedMetrics(realEstateTrans, techBusinessTrans).net;
        const percentage = (combinedNet / this.targetMonthlyNet) * 100;
        return {
            percentage: percentage
        };
    }

    getExpectedRents() {
        // Based on user's tenant list from documents
        return [
            { tenant: 'jack sevilla', property: '5th ST E', amount: 1500 },
            { tenant: 'araceli ponce', property: '5th ST E', amount: 1500 },
            { tenant: 'lucy cepeda', property: '2024 50th', amount: 1400 },
            { tenant: 'jesus cruz', property: '2024 50th', amount: 1400 },
            { tenant: 'angel de la cruz', property: 'Las Palmas', amount: 1250 },
            { tenant: 'pablo joaquin', property: '37th Ave E', amount: 1350 },
            { tenant: 'wendy cordova', property: '2nd St W', amount: 1450 },
            { tenant: 'geron vile', property: '2nd St W', amount: 1450 },
            { tenant: 'michelle ruth', property: '1112 36th St W', amount: 1600 },
            { tenant: 'steven malloy', property: '1112 36th St W', amount: 1600 },
            { tenant: 'claribel castillomero', property: '59th Ave E', amount: 1550 },
            { tenant: 'belem amaro', property: '59th Ave E', amount: 1550 }
        ];
    }

    getReceivedRents(realEstateTransactions) {
        const rentTransactions = realEstateTransactions.filter(t => t.subcategory === 'Rent' && t.amount > 0);
        const received = [];
        const expectedRents = this.getExpectedRents();

        for (const rent of rentTransactions) {
            const expected = expectedRents.find(e => rent.description.toLowerCase().includes(e.tenant));
            if(expected) {
                received.push({ ...expected, receivedAmount: rent.amount });
            }
        }
        return received;
    }

    findMissingRents(expectedRents, receivedRents) {
        return expectedRents.filter(expected => !receivedRents.some(received => received.tenant === expected.tenant));
    }

    getUpcomingRecurring() {
        // This will be implemented once RecurringTemplates is available
        return [];
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }

    generateDashboardHTML(data) {
        const { realEstate, techBusiness, combined, rentStatus, targetProgress, recurringDue } = data;

        return `
            <div class="space-y-6">
                <!-- Target Progress Bar -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Monthly Target Progress</h3>
                    <div class="mb-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Net Income Progress</span>
                            <span class="font-bold">${this.formatCurrency(combined.net)} / ${this.formatCurrency(this.targetMonthlyNet)}</span>
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

                <!-- Rent Collection Status -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Rent Collection Status</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-sm text-gray-600">Expected This Month</p>
                            <p class="text-xl font-bold">${this.formatCurrency(rentStatus.expected.reduce((sum, r) => sum + r.amount, 0))}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Collected So Far</p>
                            <p class="text-xl font-bold text-green-600">${this.formatCurrency(rentStatus.received.reduce((sum, r) => sum + r.amount, 0))}</p>
                        </div>
                    </div>
                    ${rentStatus.missing.length > 0 ? `
                        <div class="border-t pt-3">
                            <p class="text-sm font-semibold text-red-600 mb-2">Missing Rents (${rentStatus.missing.length}):</p>
                            <div class="space-y-1">
                                ${rentStatus.missing.map(r => `
                                    <div class="flex justify-between text-sm">
                                        <span>${r.tenant} (${r.property})</span>
                                        <span class="text-red-600 font-mono">${this.formatCurrency(r.amount)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<p class="text-green-600 text-sm">✓ All rents collected!</p>'}
                </div>

                <!-- Upcoming Recurring Transactions -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Upcoming Recurring Transactions</h3>
                    <div class="space-y-2">
                        ${recurringDue.length > 0 ? recurringDue.map(item => `
                            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                <div>
                                    <p class="font-medium">${item.description}</p>
                                    <p class="text-xs text-gray-500">Due: ${item.dueDate}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-mono ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(item.amount)}</span>
                                    <button class="quick-add-recurring text-blue-600 hover:text-blue-800"
                                            data-description="${item.description}"
                                            data-amount="${item.amount}"
                                            data-account="${item.accountId}"
                                            data-category="${item.category}">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('') : '<p class="text-sm text-gray-500">No upcoming transactions in the next 7 days.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners(container) {
        // This will be implemented later
    }
}
