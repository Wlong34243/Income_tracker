// js/ui/MonthlyDashboard.js
export class MonthlyDashboard {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;
        this.targetMonthlyNet = 17932; // User's retirement income target
        
        // Property configurations with expected monthly rent
        this.propertyConfig = {
            '5th ST E': { tenants: ['jack sevilla', 'araceli ponce'], expectedRent: 3000 },
            '2024 50th': { tenants: ['lucy cepeda', 'jesus cruz'], expectedRent: 2800 },
            'Las Palmas': { tenants: ['angel de la cruz'], expectedRent: 1250 },
            '37th Ave E': { tenants: ['pablo joaquin'], expectedRent: 1350 },
            '2nd St W': { tenants: ['wendy cordova', 'geron vile'], expectedRent: 2900 },
            '1112 36th St W': { tenants: ['michelle ruth', 'steven malloy'], expectedRent: 3200 },
            '59th Ave E': { tenants: ['claribel castillomero', 'belem amaro'], expectedRent: 3100 },
            '61st Ave Ter E': { tenants: [], expectedRent: 3200 },
            'Harbor St': { tenants: [], expectedRent: 900 }
        };
    }

    async render(container) {
        const data = await this.calculateMetrics();
        container.innerHTML = this.generateDashboardHTML(data);
        this.attachEventListeners(container);
    }

    async calculateMetrics() {
        // Load ALL transactions
        const transactions = await this.dataService.loadTransactions(1000);
        
        // Get current month bounds
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Filter to current month only
        const currentMonthTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startOfMonth && txDate <= endOfMonth;
        });
        
        console.log(`Dashboard showing ${currentMonthTransactions.length} transactions for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
        
        // Separate by entity (excluding transfers)
        const realEstate = currentMonthTransactions.filter(t => 
            t.entity === 'Real Estate' && t.category !== 'Transfer'
        );
        const techBusiness = currentMonthTransactions.filter(t => 
            t.entity === 'Tech Business' && t.category !== 'Transfer'
        );
        const personal = currentMonthTransactions.filter(t => 
            t.entity === 'Personal' && t.category !== 'Transfer'
        );
        
        // Calculate ACTUAL metrics (not hardcoded!)
        const realEstateMetrics = this.calculateEntityMetrics(realEstate);
        const techBusinessMetrics = this.calculateEntityMetrics(techBusiness);
        const personalMetrics = this.calculateEntityMetrics(personal);
        
        // Combined business metrics (Real Estate + Tech only, not Personal)
        const combinedBusiness = {
            income: realEstateMetrics.income + techBusinessMetrics.income,
            expenses: realEstateMetrics.expenses + techBusinessMetrics.expenses,
            net: realEstateMetrics.net + techBusinessMetrics.net
        };
        
        // Calculate property performance with ACTUAL data
        const propertyPerformance = this.calculatePropertyPerformance(realEstate);
        
        // Check rent collection status
        const rentStatus = this.checkRentStatus(realEstate);
        
        return {
            realEstate: realEstateMetrics,
            techBusiness: techBusinessMetrics,
            personal: personalMetrics,
            combined: combinedBusiness,
            propertyPerformance,
            rentStatus,
            targetProgress: {
                amount: combinedBusiness.net,
                target: this.targetMonthlyNet,
                percentage: (combinedBusiness.net / this.targetMonthlyNet * 100)
            },
            recurringDue: [] // Placeholder for future RecurringTemplates feature
        };
    }

    calculateEntityMetrics(transactions) {
        const income = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        return {
            income,
            expenses,
            net: income - expenses,
            transactionCount: transactions.length
        };
    }

    calculatePropertyPerformance(realEstateTransactions) {
        const performance = {};
        
        // Initialize all properties from propertyConfig
        Object.entries(this.propertyConfig).forEach(([property, config]) => {
            performance[property] = {
                income: 0,
                expenses: 0,
                net: 0,
                expected: config.expectedRent,
                received: false,
                tenants: config.tenants
            };
        });
        
        // Process ACTUAL transactions
        realEstateTransactions.forEach(t => {
            // Only process rent income and property expenses
            if (t.category === 'Real Estate Income' || t.category === 'Property Expenses') {
                let property = t.property;
                
                // If no property set, try to identify from description
                if (!property) {
                    property = this.identifyProperty(t.description);
                }
                
                if (property && performance[property]) {
                    if (t.amount > 0) {
                        performance[property].income += t.amount;
                        performance[property].received = true;
                    } else {
                        performance[property].expenses += Math.abs(t.amount);
                    }
                }
            }
        });
        
        // Calculate net for each property
        Object.keys(performance).forEach(property => {
            performance[property].net = performance[property].income - performance[property].expenses;
        });
        
        return performance;
    }

    identifyProperty(description) {
        const descLower = description.toLowerCase();
        
        for (const [property, config] of Object.entries(this.propertyConfig)) {
            for (const tenant of config.tenants) {
                if (descLower.includes(tenant)) {
                    return property;
                }
            }
        }
        
        return null;
    }

    checkRentStatus(realEstateTransactions) {
        const rentTransactions = realEstateTransactions.filter(t => 
            t.subcategory === 'Rent' && t.amount > 0
        );
        
        const totalExpected = Object.values(this.propertyConfig)
            .reduce((sum, config) => sum + config.expectedRent, 0);
        
        const totalReceived = rentTransactions
            .reduce((sum, t) => sum + t.amount, 0);
        
        const missingProperties = [];
        Object.entries(this.propertyConfig).forEach(([property, config]) => {
            const received = rentTransactions.some(t => {
                const desc = t.description.toLowerCase();
                return config.tenants.some(tenant => desc.includes(tenant));
            });
            
            if (!received && config.tenants.length > 0) { // Only flag if property has tenants
                missingProperties.push(property);
            }
        });
        
        return {
            expected: totalExpected,
            received: totalReceived,
            missing: totalExpected - totalReceived,
            missingProperties,
            collectionRate: totalExpected > 0 ? (totalReceived / totalExpected * 100) : 0
        };
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        }).format(amount);
    }

    generateDashboardHTML(data) {
        const { realEstate, techBusiness, personal, combined, propertyPerformance, rentStatus, targetProgress } = data;

        return `
            <div class="space-y-6">
                <!-- Monthly Target Progress -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Monthly Target Progress</h3>
                    <div class="mb-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Combined Business Net Income</span>
                            <span class="font-bold">${this.formatCurrency(combined.net)} / ${this.formatCurrency(this.targetMonthlyNet)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-4">
                            <div class="bg-${targetProgress.percentage >= 100 ? 'green' : targetProgress.percentage >= 75 ? 'blue' : 'orange'}-600 h-4 rounded-full transition-all duration-500"
                                 style="width: ${Math.min(targetProgress.percentage, 100)}%"></div>
                        </div>
                        <p class="text-xs text-gray-600 mt-1">${targetProgress.percentage.toFixed(1)}% of monthly goal</p>
                    </div>
                </div>

                <!-- Three Business Segments -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Real Estate Business -->
                    <div class="bg-white rounded-lg shadow">
                        <div class="bg-blue-600 text-white p-4 rounded-t-lg">
                            <h4 class="text-lg font-semibold">🏠 Real Estate</h4>
                        </div>
                        <div class="p-4">
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rental Income</span>
                                    <span class="font-semibold text-green-600">${this.formatCurrency(realEstate.income)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Operating Expenses</span>
                                    <span class="font-semibold text-red-600">${this.formatCurrency(realEstate.expenses)}</span>
                                </div>
                                <div class="flex justify-between pt-2 border-t">
                                    <span class="font-semibold">Net Income</span>
                                    <span class="font-bold text-lg ${realEstate.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(realEstate.net)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tech Business -->
                    <div class="bg-white rounded-lg shadow">
                        <div class="bg-purple-600 text-white p-4 rounded-t-lg">
                            <h4 class="text-lg font-semibold">💻 Tech Business</h4>
                        </div>
                        <div class="p-4">
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Consulting Income</span>
                                    <span class="font-semibold text-green-600">${this.formatCurrency(techBusiness.income)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Business Expenses</span>
                                    <span class="font-semibold text-red-600">${this.formatCurrency(techBusiness.expenses)}</span>
                                </div>
                                <div class="flex justify-between pt-2 border-t">
                                    <span class="font-semibold">Net Income</span>
                                    <span class="font-bold text-lg ${techBusiness.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(techBusiness.net)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Personal -->
                    <div class="bg-white rounded-lg shadow">
                        <div class="bg-gray-600 text-white p-4 rounded-t-lg">
                            <h4 class="text-lg font-semibold">👤 Personal</h4>
                        </div>
                        <div class="p-4">
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Personal Income</span>
                                    <span class="font-semibold text-green-600">${this.formatCurrency(personal.income)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Personal Expenses</span>
                                    <span class="font-semibold text-red-600">${this.formatCurrency(personal.expenses)}</span>
                                </div>
                                <div class="flex justify-between pt-2 border-t">
                                    <span class="font-semibold">Net Income</span>
                                    <span class="font-bold text-lg ${personal.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(personal.net)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Property Performance Table -->
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold">Property Performance</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${Object.entries(propertyPerformance).map(([property, data]) => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${property}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${this.formatCurrency(data.expected)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right ${data.income > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}">${this.formatCurrency(data.income)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">${this.formatCurrency(data.expenses)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}">${this.formatCurrency(data.net)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            ${data.received ? 
                                                '<span class="text-green-600">✓ Collected</span>' : 
                                                '<span class="text-red-600 font-semibold">⚠ Missing</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Rent Collection Summary -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Rent Collection Status</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p class="text-sm text-gray-600">Expected Monthly</p>
                            <p class="text-xl font-bold">${this.formatCurrency(rentStatus.expected)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Collected</p>
                            <p class="text-xl font-bold text-green-600">${this.formatCurrency(rentStatus.received)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Outstanding</p>
                            <p class="text-xl font-bold text-red-600">${this.formatCurrency(rentStatus.missing)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Collection Rate</p>
                            <p class="text-xl font-bold">${rentStatus.collectionRate.toFixed(1)}%</p>
                        </div>
                    </div>
                    ${rentStatus.missingProperties.length > 0 ? `
                        <div class="mt-4 pt-4 border-t">
                            <p class="text-sm font-semibold text-red-600 mb-2">Missing Rent From:</p>
                            <div class="flex flex-wrap gap-2">
                                ${rentStatus.missingProperties.map(prop => 
                                    `<span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">${prop}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : '<p class="text-green-600 text-sm mt-4">✓ All properties have paid rent!</p>'}
                </div>
            </div>
        `;
    }

    attachEventListeners(container) {
        // Add any interactive elements here if needed
    }
}