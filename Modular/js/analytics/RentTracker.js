export class RentTracker {
    constructor(dataService, categoryManager) {
        this.dataService = dataService;
        this.categoryManager = categoryManager;

        // Expected rents based on user's properties
        this.expectedRents = [
            { tenant: 'jack sevilla', property: '5th ST E', amount: 1500, dueDay: 1 },
            { tenant: 'araceli ponce', property: '5th ST E', amount: 1500, dueDay: 1 },
            { tenant: 'lucy cepeda', property: '2024 50th', amount: 1400, dueDay: 1 },
            { tenant: 'jesus cruz', property: '2024 50th', amount: 1400, dueDay: 1 },
            { tenant: 'angel de la cruz', property: 'Las Palmas', amount: 1250, dueDay: 1 },
            { tenant: 'pablo joaquin', property: '37th Ave E', amount: 1350, dueDay: 1 },
            { tenant: 'wendy cordova', property: '2nd St W', amount: 1450, dueDay: 1 },
            { tenant: 'geron vile', property: '2nd St W', amount: 1450, dueDay: 1 },
            { tenant: 'michelle ruth', property: '1112 36th St W', amount: 1600, dueDay: 1 },
            { tenant: 'steven malloy', property: '1112 36th St W', amount: 1600, dueDay: 1 },
            { tenant: 'claribel castillomero', property: '59th Ave E', amount: 1550, dueDay: 1 },
            { tenant: 'belem amaro', property: '59th Ave E', amount: 1550, dueDay: 1 }
        ];
    }

    async checkCurrentMonthStatus() {
        const transactions = await this.dataService.loadTransactions(200);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const today = new Date().getDate();

        const monthlyRents = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth &&
                   date.getFullYear() === currentYear &&
                   t.category === 'Real Estate Income' &&
                   t.subcategory === 'Rent';
        });

        const status = {
            expected: this.expectedRents,
            received: [],
            missing: [],
            late: [],
            onTime: []
        };

        // Check each expected rent
        this.expectedRents.forEach(expected => {
            const received = monthlyRents.find(t => {
                const desc = t.description.toLowerCase();
                return desc.includes(expected.tenant.toLowerCase()) ||
                       (t.amount === expected.amount && t.property === expected.property);
            });

            if (received) {
                const receivedDay = new Date(received.date).getDate();
                const rentInfo = {
                    ...expected,
                    receivedDate: received.date,
                    receivedDay,
                    transactionId: received.id
                };

                status.received.push(rentInfo);

                if (receivedDay <= expected.dueDay + 5) {
                    status.onTime.push(rentInfo);
                } else {
                    status.late.push(rentInfo);
                }
            } else if (today > expected.dueDay + 5) {
                status.missing.push(expected);
            }
        });

        // Calculate totals
        status.totalExpected = status.expected.reduce((sum, r) => sum + r.amount, 0);
        status.totalReceived = status.received.reduce((sum, r) => sum + r.amount, 0);
        status.totalMissing = status.missing.reduce((sum, r) => sum + r.amount, 0);
        status.collectionRate = (status.totalReceived / status.totalExpected * 100).toFixed(1);

        return status;
    }

    async sendRentReminder(tenant) {
        // Create a note/task for follow-up
        const reminder = {
            date: new Date().toISOString().split('T')[0],
            description: `REMINDER: Follow up with ${tenant.tenant} - Rent Due`,
            amount: 0,
            category: 'Note',
            subcategory: 'Rent Reminder',
            entity: 'Real Estate',
            property: tenant.property,
            accountId: '0111'
        };

        await this.dataService.saveTransaction(reminder);
        return `Reminder created for ${tenant.tenant}`;
    }
}
