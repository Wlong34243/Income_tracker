// js/config/AppConfig.js
// Application Configuration and Constants

export class AppConfig {
    static DEMO_MODE = true; // Set to false for production

    static FIREBASE_CONFIG = {
        apiKey: "AIzaSyB7KeIMurnxmp0qys3NxrCTec-XE1Fw_js",
        authDomain: "incometracker-9c4b5.firebaseapp.com",
        databaseURL: "https://incometracker-9c4b5-default-rtdb.firebaseio.com",
        projectId: "incometracker-9c4b5",
        storageBucket: "incometracker-9c4b5.appspot.com", // Use .appspot.com for storageBucket
        messagingSenderId: "497963901083",
        appId: "1:497963901083:web:e1e1db6719014fcb11e63e",
        measurementId: "G-MWS2E9YVE7"
    };
    // ...rest of your config...

    
    // Your specific account mapping
    static ACCOUNT_MAPPING = {
        '0111': { 
            name: 'Sweep Account (0111)', 
            type: 'Checking', 
            entity: 'Real Estate',
            description: 'Primary rent collection account'
        },
        '8529': { 
            name: 'Real Estate Ops (8529)', 
            type: 'Business', 
            entity: 'Real Estate',
            description: 'Real estate operating expenses'
        },
        '7991': { 
            name: 'Tech Auditing (7991)', 
            type: 'Business', 
            entity: 'Tech Business',
            description: 'Tech consulting income'
        },
        '2299': { 
            name: 'Business Expenses (2299)', 
            type: 'Credit Card', 
            entity: 'Tech Business',
            description: 'Tech business expenses'
        },
        '2433': { 
            name: 'Visa Prime (2433)', 
            type: 'Credit Card', 
            entity: 'Personal',
            description: 'Personal credit card'
        },
        '7588': { 
            name: 'Shared Checking (7588)', 
            type: 'Checking', 
            entity: 'Personal',
            description: 'Health insurance, HSA, shared expenses'
        },
        '8895': { 
            name: 'Self-Directed Investment (8895)', 
            type: 'Investment', 
            entity: 'Investment',
            description: 'Self-directed investment account'
        },
        '0898': { 
            name: "Lisa's Income (0898)", 
            type: 'Checking', 
            entity: 'Personal',
            description: "Lisa's real estate income transfers"
        },
        '119': { 
            name: 'Schwab Brokerage (119)', 
            type: 'Investment', 
            entity: 'Investment',
            description: 'Schwab brokerage investment account'
        }
    };

    // Property mappings based on your tenant-mappings.js
    static PROPERTY_MAPPINGS = {
        '5th Street': ['jack sevilla', 'araceli ponce'],
        '50th Street': ['lucy cepeda', 'jesus cruz'],
        'Las Palmas': ['angel de la cruz'],
        '37th Street': ['pablo joaquin'],
        '2nd Street': ['wendy cordova', 'geron vile'],
        '36th Street': ['michelle ruth', 'steven malloy'],
        '59th Street': ['claribel castillomero', 'belem amaro'],
        '61st Street': [],
        '9th Street': []
    };
    
    // Also ensure you have these category lists
    static INCOME_CATEGORIES = [
        'Rental Income',
        'Business Income',
        'Tech Business Income',
        'Real Estate Income',
        'Investment Income',
        'Other Income'
    ];
    
    static EXPENSE_CATEGORIES = [
        'Mortgage',
        'Property Tax',
        'Insurance',
        'Maintenance',
        'Utilities',
        'Business Expenses',
        'Property Expenses',
        'Healthcare',
        'Entertainment',
        'Credit Card Payment',
        'Other Expenses'
    ];
    
    // Enhanced categorization for your business
    static CATEGORIES = {
        'Real Estate Income': { 
            type: 'income', 
            entity: 'Real Estate',
            patterns: [/rent/i, /tenant/i, /property.*income/i]
        },
        'Tech Business Income': { 
            type: 'income', 
            entity: 'Tech Business',
            patterns: [/consulting/i, /audit/i, /invoice/i, /tech.*income/i]
        },
        'Property Expenses': { 
            type: 'expense', 
            entity: 'Real Estate',
            patterns: [/property.*tax/i, /hoa/i, /repair/i, /maintenance/i, /landscaping/i]
        },
        'Business Expenses': { 
            type: 'expense', 
            entity: 'Tech Business',
            patterns: [/office/i, /software/i, /travel/i, /equipment/i]
        },
        'Utilities': { 
            type: 'expense', 
            entity: 'Personal',
            patterns: [/vyve/i, /frontier/i, /netflix/i, /phone/i, /internet/i]
        },
        'Insurance': { 
            type: 'expense', 
            entity: 'Personal',
            patterns: [/insurance/i, /health.*plan/i, /car.*insurance/i]
        },
        'Healthcare': { 
            type: 'expense', 
            entity: 'Personal',
            patterns: [/hsa/i, /medical/i, /pharmacy/i, /doctor/i]
        },
        'Investment Transfer': { 
            type: 'transfer', 
            entity: 'Investment',
            patterns: [/transfer.*investment/i, /schwab/i, /brokerage/i]
        },
        'Internal Transfer': { 
            type: 'transfer', 
            entity: 'Internal',
            patterns: [/transfer/i, /xfer/i]
        }
    };
    
    // Your financial goals
    static GOALS = {
        monthlyNet: 17932, // Your target from documents
        realEstateMonthlyNet: 17000, // ~25k income - 8k expenses
        techBusinessMonthlyNet: 13000, // Tech income after expenses
        monthlyInvestmentContribution: 1250, // To account 8895
        emergencyFund: 50000
    };
}
