// Generate realistic test data for development and testing

export class TestDataGenerator {
    constructor(dataService) {
        this.dataService = dataService;

        // Realistic data templates
        this.tenants = [
            { name: 'jack sevilla', property: '5th ST E', rent: 1800 },
            { name: 'araceli ponce', property: '5th ST E', rent: 1800 },
            { name: 'lucy cepeda', property: '2024 50th', rent: 1337.50 },
            { name: 'jesus cruz', property: '2024 50th', rent: 1337.50 },
            { name: 'angel de la cruz', property: 'Las Palmas', rent: 1428 },
            { name: 'pablo joaquin', property: '37th Ave E', rent: 2891 },
            { name: 'wendy cordova', property: '2nd St W', rent: 1460 },
            { name: 'geron vile', property: '2nd St W', rent: 1460 },
            { name: 'michelle ruth', property: '1112 36th St W', rent: 1950 },
            { name: 'steven malloy', property: '1112 36th St W', rent: 1950 },
            { name: 'claribel castillomero', property: '59th Ave E', rent: 2775 },
            { name: 'belem amaro', property: '59th Ave E', rent: 500 }
        ];

        this.propertyExpenses = [
            'Home Depot - maintenance supplies',
            'Lowes - plumbing repair',
            'Ace Hardware - tools',
            'ABC Plumbing - service call',
            'Electric Company - repairs',
            'Property Management Fee',
            'Lawn Service',
            'HVAC Maintenance',
            'Pest Control Service',
            'Property Insurance Premium'
        ];

        this.personalExpenses = [
            'Publix - groceries',
            'Walmart - household items',
            'Amazon - online shopping',
            'Restaurant - dining out',
            'Gas Station - fuel',
            'Netflix subscription',
            'Verizon - phone bill',
            'Vyve - internet',
            'Frontier - cable',
            'Geico - auto insurance'
        ];
    }

    // Generate a month of rent payments
    async generateRentPayments(year = 2025, month = 7) {
        const transactions = [];

        for (const tenant of this.tenants) {
            // Most pay on time (1st-5th)
            const dayOfMonth = Math.random() > 0.8 ?
                Math.floor(Math.random() * 10) + 6 : // Late (6th-15th)
                Math.floor(Math.random() * 5) + 1;   // On time (1st-5th)

            const date = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

            transactions.push({
                date,
                description: `Zelle from ${tenant.name.toUpperCase()}`,
                amount: tenant.rent,
                accountId: '0111',
                category: 'Real Estate Income',
                subcategory: tenant.property,
                entity: 'Real Estate',
                type: 'Income'
            });
        }

        return transactions;
    }

    // Generate Tech Business income
    async generateTechIncome(year = 2025, months = [4, 5, 6, 7]) {
        const transactions = [];

        for (const month of months) {
            // 1-2 payments per month
            const numPayments = Math.random() > 0.5 ? 2 : 1;

            for (let i = 0; i < numPayments; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const amount = 12000 + Math.floor(Math.random() * 4000); // $12k-16k

                transactions.push({
                    date,
                    description: 'PACKERTHOMAS AUDIT PAYMENT',
                    amount,
                    accountId: '7991',
                    category: 'Tech Business Income',
                    subcategory: 'Consulting',
                    entity: 'Tech Business',
                    type: 'Income'
                });
            }
        }

        return transactions;
    }

    // Generate property expenses
    async generatePropertyExpenses(year = 2025, month = 7) {
        const transactions = [];
        const numExpenses = 8 + Math.floor(Math.random() * 7); // 8-15 expenses

        for (let i = 0; i < numExpenses; i++) {
            const day = Math.floor(Math.random() * 28) + 1;
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const description = this.propertyExpenses[Math.floor(Math.random() * this.propertyExpenses.length)];
            const amount = -(100 + Math.floor(Math.random() * 900)); // -$100 to -$1000

            transactions.push({
                date,
                description,
                amount,
                accountId: '8529',
                category: 'Property Maintenance',
                subcategory: 'Repairs',
                entity: 'Real Estate',
                type: 'Expense'
            });
        }

        return transactions;
    }

    // Generate personal expenses
    async generatePersonalExpenses(year = 2025, month = 7) {
        const transactions = [];
        const numExpenses = 15 + Math.floor(Math.random() * 15); // 15-30 expenses

        for (let i = 0; i < numExpenses; i++) {
            const day = Math.floor(Math.random() * 28) + 1;
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const description = this.personalExpenses[Math.floor(Math.random() * this.personalExpenses.length)];
            const amount = -(20 + Math.floor(Math.random() * 480)); // -$20 to -$500
            const accountId = Math.random() > 0.5 ? '2433' : '8529'; // Split between accounts

            transactions.push({
                date,
                description,
                amount,
                accountId,
                category: 'Personal Expenses',
                subcategory: 'Shopping',
                entity: 'Personal',
                type: 'Expense'
            });
        }

        return transactions;
    }

    // Generate recurring transfers
    async generateTransfers(year = 2025, months = [4, 5, 6, 7]) {
        const transactions = [];

        for (const month of months) {
            // Monthly investment transfer
            const investmentDate = `${year}-${String(month).padStart(2, '0')}-15`;
            transactions.push({
                date: investmentDate,
                description: 'Transfer to Self-Directed ...8895',
                amount: -1250,
                accountId: '8529',
                category: 'Transfer',
                subcategory: 'Investment',
                entity: 'Transfer',
                type: 'Transfer'
            });

            transactions.push({
                date: investmentDate,
                description: 'Transfer from RE Ops ...8529',
                amount: 1250,
                accountId: '8895',
                category: 'Transfer',
                subcategory: 'Investment',
                entity: 'Transfer',
                type: 'Transfer'
            });

            // Lisa's income transfer
            const lisaDate = `${year}-${String(month).padStart(2, '0')}-20`;
            transactions.push({
                date: lisaDate,
                description: 'Online Transfer to Chk ...0898 transaction#: 5678',
                amount: -1500,
                accountId: '0111',
                category: 'Personal Income',
                subcategory: "Lisa's Income",
                entity: 'Personal',
                type: 'Transfer'
            });

            transactions.push({
                date: lisaDate,
                description: 'Online Transfer from Chk ...0111 transaction#: 5678',
                amount: 1500,
                accountId: '0898',
                category: 'Personal Income',
                subcategory: "Lisa's Income",
                entity: 'Personal',
                type: 'Transfer'
            });

            // Health insurance from shared account
            const healthDate = `${year}-${String(month).padStart(2, '0')}-01`;
            transactions.push({
                date: healthDate,
                description: 'Health Insurance Premium',
                amount: -1367,
                accountId: '7588',
                category: 'Insurance',
                subcategory: 'Health',
                entity: 'Personal',
                type: 'Expense'
            });

            // HSA contribution
            transactions.push({
                date: healthDate,
                description: 'HSA Contribution',
                amount: -750,
                accountId: '7588',
                category: 'Healthcare',
                subcategory: 'HSA',
                entity: 'Personal',
                type: 'Expense'
            });
        }

        return transactions;
    }

    // Generate complete test dataset
    async generateCompleteDataset() {
        console.log('🎲 Generating test data...');

        const allTransactions = [];

        // Generate 4 months of data (April-July 2025)
        for (const month of [4, 5, 6, 7]) {
            const rentPayments = await this.generateRentPayments(2025, month);
            const propertyExpenses = await this.generatePropertyExpenses(2025, month);
            const personalExpenses = await this.generatePersonalExpenses(2025, month);

            allTransactions.push(...rentPayments, ...propertyExpenses, ...personalExpenses);
        }

        // Add Tech income and transfers for all months
        const techIncome = await this.generateTechIncome(2025, [4, 5, 6, 7]);
        const transfers = await this.generateTransfers(2025, [4, 5, 6, 7]);

        allTransactions.push(...techIncome, ...transfers);

        // Sort by date
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`✅ Generated ${allTransactions.length} test transactions`);

        return allTransactions;
    }

    // Save test data to Firestore
    async saveTestData() {
        const confirmation = confirm(
            '⚠️ This will add test data to your database.\n\n' +
            'The test data includes:\n' +
            '• 4 months of rent payments\n' +
            '• Tech business income\n' +
            '• Property expenses\n' +
            '• Personal expenses\n' +
            '• Regular transfers\n\n' +
            'Continue?'
        );

        if (!confirmation) return;

        const transactions = await this.generateCompleteDataset();

        let saved = 0;
        for (const transaction of transactions) {
            try {
                await this.dataService.saveTransaction(transaction);
                saved++;
            } catch (error) {
                console.error('Failed to save transaction:', error);
            }
        }

        console.log(`✅ Saved ${saved} test transactions to database`);
        return saved;
    }

    // Generate CSV file for testing import
    generateTestCSV(accountId = '0111') {
        const transactions = [];
        const month = 7; // July

        // Add some rent payments for CSV
        for (const tenant of this.tenants.slice(0, 5)) {
            const day = Math.floor(Math.random() * 5) + 1;
            transactions.push({
                'Posting Date': `07/${String(day).padStart(2, '0')}/2025`,
                'Description': `Zelle from ${tenant.name.toUpperCase()}`,
                'Amount': tenant.rent.toString(),
                'Type': 'ACCT_XFER',
                'Balance': '50000'
            });
        }

        // Add some expenses
        for (let i = 0; i < 5; i++) {
            const day = Math.floor(Math.random() * 28) + 1;
            const expense = this.propertyExpenses[i];
            const amount = -(100 + Math.floor(Math.random() * 400));

            transactions.push({
                'Posting Date': `07/${String(day).padStart(2, '0')}/2025`,
                'Description': expense,
                'Amount': amount.toString(),
                'Type': 'DEBIT',
                'Balance': '45000'
            });
        }

        // Convert to CSV
        const headers = ['Posting Date', 'Description', 'Amount', 'Type', 'Balance'];
        const csvContent = [
            headers.join(','),
            ...transactions.map(t => headers.map(h => t[h]).join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Chase${accountId}_Test_Data.csv`;
        a.click();

        console.log(`✅ Generated test CSV with ${transactions.length} transactions`);
    }
}

// Add to window for easy access in console
window.TestData = TestDataGenerator;
