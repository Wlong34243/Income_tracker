// Proposed js/config/income-rules.js
export const incomeRules = [
    { type: 'amount_property', amount: 1400, property: '37th Street', category: 'Real Estate Income - 37th Street' },
    { type: 'amount_property', amount: 1700, property: '61st Street', category: 'Real Estate Income - 61st Street' },
    { type: 'keyword', keyword: 'paypal', contains: 'harbor', amount: 600, category: "Lisa's Personal Income" },
    { type: 'keyword', keyword: 'cashapp', contains: 'harbor', amount: 900, category: "Lisa's Personal Income" },
    { type: 'amount_only', amount: 300, category: "Lisa's Personal Income" },
    { type: 'amount_only', amount: 1250, category: "Lisa's Personal Income" },
];