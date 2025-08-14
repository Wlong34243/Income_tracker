export class BusinessAnalytics {
    constructor(transactions) {
        this.transactions = transactions || [];
        // This mapping should ideally come from a config file, but for now,
        // we include it here as per the user's context.
        this.tenantPropertyMap = {
            'jack sevilla': '5th ST E',
            'araceli ponce': '5th ST E',
            'lucy cepeda': '2024 50th',
            'jesus cruz': '2024 50th',
            'angel de la cruz': 'Las Palmas',
            'pablo joaquin': '37th Ave E',
            'wendy cordova': '2nd St W',
            'geron vile': '2nd St W',
            'michelle ruth': '1112 36th St W',
            'steven malloy': '1112 36th St W',
            'claribel castillomero': '59th Ave E',
            'belem amaro': '59th Ave E'
        };
    }

    generateReport() {
        const report = {
            realEstate: { income: 0, expenses: 0, net: 0, transactions: [] },
            techBusiness: { income: 0, expenses: 0, net: 0, transactions: [] },
            personal: { income: 0, expenses: 0, net: 0, transactions: [] },
            combined: { income: 0, expenses: 0, net: 0 },
            propertyPerformance: {},
        };

        for (const t of this.transactions) {
            if (t.category === 'Transfer') continue;

            let entityReport = null;
            switch (t.entity) {
                case 'Real Estate':
                    entityReport = report.realEstate;
                    break;
                case 'Tech Business':
                    entityReport = report.techBusiness;
                    break;
                case 'Personal':
                default:
                    entityReport = report.personal;
                    break;
            }

            entityReport.transactions.push(t);
            if (t.amount > 0) {
                entityReport.income += t.amount;
            } else {
                entityReport.expenses += Math.abs(t.amount);
            }
        }

        // Calculate net income for each entity
        for (const entityKey of ['realEstate', 'techBusiness', 'personal']) {
            const entity = report[entityKey];
            entity.net = entity.income - entity.expenses;
        }

        // Calculate combined totals for businesses
        report.combined.income = report.realEstate.income + report.techBusiness.income;
        report.combined.expenses = report.realEstate.expenses + report.techBusiness.expenses;
        report.combined.net = report.combined.income - report.combined.expenses;

        // ** NEW: Calculate property-level performance **
        report.propertyPerformance = this.calculatePropertyPerformance(report.realEstate.transactions);

        return report;
    }

    identifyProperty(transaction) {
        const descLower = transaction.description.toLowerCase();
        // First, check for an explicit property field on the transaction
        if (transaction.property) return transaction.property;

        // If it's a rent payment, try to identify by tenant name
        if (transaction.subcategory === 'Rent') {
            for (const name in this.tenantPropertyMap) {
                if (descLower.includes(name)) {
                    return this.tenantPropertyMap[name];
                }
            }
        }
        // For other real estate expenses, it's harder without more context.
        // A more advanced system might use rules or AI. For now, we return a default.
        return 'General/Unassigned';
    }

    calculatePropertyPerformance(realEstateTransactions) {
        const properties = {};

        for (const t of realEstateTransactions) {
            const propertyName = this.identifyProperty(t);

            if (!properties[propertyName]) {
                properties[propertyName] = { income: 0, expenses: 0, net: 0, transactionCount: 0 };
            }

            const prop = properties[propertyName];
            prop.transactionCount++;

            if (t.amount > 0) {
                prop.income += t.amount;
            } else {
                prop.expenses += Math.abs(t.amount);
            }
        }

        // Calculate net for each property
        for (const propName in properties) {
            properties[propName].net = properties[propName].income - properties[propName].expenses;
        }

        return properties;
    }
}
