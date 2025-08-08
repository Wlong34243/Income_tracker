// js/analytics/RealEstateAnalytics.js
// Real Estate Specific Analytics

export class RealEstateAnalytics {
    constructor(dataService) {
        this.dataService = dataService;
    }
    
    calculatePropertyPerformance(transactions) {
        // Property-level analysis for your real estate business
        const properties = new Map();
        
        transactions
            .filter(t => t.entity === 'Real Estate')
            .forEach(trans => {
                const propertyId = this.extractPropertyFromDescription(trans.description) || 'general';
                
                if (!properties.has(propertyId)) {
                    properties.set(propertyId, {
                        income: 0,
                        expenses: 0,
                        transactions: 0
                    });
                }
                
                const property = properties.get(propertyId);
                property.transactions++;
                
                if (trans.type === 'Income') {
                    property.income += trans.amount;
                } else if (trans.type === 'Expense') {
                    property.expenses += Math.abs(trans.amount);
                }
            });
        
        // Calculate net income for each property
        const results = [];
        properties.forEach((data, propertyId) => {
            results.push({
                property: propertyId,
                ...data,
                net: data.income - data.expenses,
                margin: data.income > 0 ? (data.income - data.expenses) / data.income * 100 : 0
            });
        });
        
        return results.sort((a, b) => b.net - a.net);
    }
    
    extractPropertyFromDescription(description) {
        // Extract property identifier from transaction description
        const desc = description.toLowerCase();
        
        // Look for common patterns in your rent descriptions
        const patterns = [
            /(\d{4}\s*\w+\s*(st|ave|dr|ln|rd))/i,
            /(unit\s*\d+)/i,
            /(property\s*[a-z0-9]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = desc.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }
}