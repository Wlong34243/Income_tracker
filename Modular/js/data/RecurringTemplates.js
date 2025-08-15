export class RecurringTemplates {
    constructor(dataService) {
        this.dataService = dataService;
        this.templates = this.loadTemplates();
    }

    loadTemplates() {
        const stored = localStorage.getItem('recurring_templates');
        if (stored) return JSON.parse(stored);

        // Default templates based on user's known recurring transactions
        return [
            {
                id: 'lisa_income',
                description: 'Michael Katzen - Deposit',
                amount: 1500,
                accountId: '0111',
                category: 'Personal Income',
                subcategory: "Lisa's Monthly Income",
                entity: 'Personal',
                dayOfMonth: 1
            },
            {
                id: 'investment_transfer',
                description: 'Transfer to Self-Directed Investment',
                amount: -1250,
                accountId: '8529',
                category: 'Transfer',
                subcategory: 'Investment',
                entity: 'Investment',
                dayOfMonth: 5
            },
            {
                id: 'health_insurance',
                description: 'Health Insurance Premium',
                amount: -1367,
                accountId: '7588',
                category: 'Insurance',
                subcategory: 'Health Insurance',
                entity: 'Personal',
                dayOfMonth: 1
            },
            {
                id: 'hsa_contribution',
                description: 'HSA Contribution',
                amount: -750,
                accountId: '7588',
                category: 'Healthcare',
                subcategory: 'HSA',
                entity: 'Personal',
                dayOfMonth: 15
            },
            {
                id: 'rocket_mortgage_rental',
                description: 'Rocket Mortgage - Rental Property',
                amount: -1038.11,
                accountId: '8529',
                category: 'Mortgage',
                subcategory: 'Rental Property',
                entity: 'Real Estate',
                dayOfMonth: 6
            },
            {
                id: 'shellpoint_mortgage',
                description: 'Shellpoint Mortgage',
                amount: -825.60,
                accountId: '8529',
                category: 'Mortgage',
                subcategory: 'Rental Property',
                entity: 'Real Estate',
                dayOfMonth: 1
            }
        ];
    }

    async quickAddTransaction(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const transaction = {
            ...template,
            date: new Date().toISOString().split('T')[0],
            id: undefined // Remove template ID
        };

        return await this.dataService.saveTransaction(transaction);
    }

    getUpcomingInNext7Days() {
        const today = new Date();
        const upcoming = [];

        this.templates.forEach(template => {
            const dueDate = new Date(today.getFullYear(), today.getMonth(), template.dayOfMonth);
            if (dueDate < today) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }

            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            if (daysUntil <= 7) {
                upcoming.push({
                    ...template,
                    dueDate: dueDate.toLocaleDateString(),
                    daysUntil
                });
            }
        });

        return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    }
}
