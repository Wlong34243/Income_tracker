# Personal Finance Tracker - Modular

A sophisticated personal finance tracker built with modular architecture for easy maintenance and feature development. Specifically designed for managing Real Estate and Tech Business finances.

## 🎯 Features

### ✅ Current Features
- **Multi-Account Management** - Track your specific accounts (0111, 8529, 7991, 2299, 7588, 8895, 0898, 119)
- **Business Entity Separation** - Real Estate vs Tech Business vs Personal tracking
- **Smart Transaction Categorization** - AI-powered categorization with learning
- **Advanced CSV Import** - Support for multiple Chase CSV formats with duplicate detection
- **Transfer Logic** - Proper handling of internal transfers between accounts
- **Goal Tracking** - Monitor progress toward your $17,932 monthly target
- **Real-time Dashboard** - Live updates of financial metrics

### 🏢 Business-Specific Features
- **Real Estate Analytics** - Track income/expenses from your rental properties
- **Tech Business Metrics** - Monitor consulting income and business expenses
- **Investment Tracking** - Monitor transfers to Schwab (119) and Self-Directed (8895)
- **Shared Expense Management** - Handle HSA, health insurance from account 7588

## 📁 Project Structure

```
finance-tracker/
├── index.html                 # Main application
├── css/styles.css             # Custom styles
├── js/
│   ├── config/
│   │   └── AppConfig.js       # Your account mappings and business rules
│   ├── auth/
│   │   └── AuthService.js     # Firebase/Demo authentication
│   ├── data/
│   │   └── DataService.js     # Data persistence (Firebase/LocalStorage)
│   ├── import/
│   │   ├── CSVImporter.js     # Enhanced CSV processing for Chase formats
│   │   ├── DuplicateDetector.js # Duplicate transaction detection
│   │   └── BulkImporter.js    # Batch import operations
│   ├── analytics/
│   │   ├── AnalyticsEngine.js # Main business intelligence
│   │   └── RealEstateAnalytics.js # Property-specific analytics
│   ├── ui/
│   │   ├── Dashboard.js       # Dashboard with business metrics
│   │   └── Modal.js           # Modal system for forms
│   └── utils/
│       ├── DateUtils.js       # Date parsing for CSV imports
│       ├── CurrencyUtils.js   # Currency formatting
│       └── ValidationUtils.js # Input validation
├── docs/                      # Documentation
└── package.json              # Dependencies
```

## 🚀 Quick Start

### 1. Extract and Setup
```bash
# Navigate to your extracted directory
cd finance-tracker-modular
npm install
```

### 2. Configure
Edit `js/config/AppConfig.js`:
- Set `DEMO_MODE = true` for local testing (uses localStorage)
- Set `DEMO_MODE = false` for Firebase (requires internet)
- Your account mappings are already configured!

### 3. Run
```bash
npm start
# Opens http://localhost:8080
```

## 💼 Your Business Setup

### Account Configuration
Your accounts are pre-configured in `AppConfig.js`:

- **0111** - Sweep Account (Real Estate rent collection)
- **8529** - Real Estate Ops (Operating expenses)  
- **7991** - Tech Auditing (Business income)
- **2299** - Business Expenses (Tech business credit card)
- **7588** - Shared Checking (Health insurance, HSA, home purchase)
- **2433** - Visa Prime (Personal credit card)
- **8895** - Self-Directed Investment
- **0898** - Lisa's Income
- **119** - Schwab Brokerage

### Transfer Patterns
The system recognizes your transfer patterns:
- Real Estate income (0111) → Operations (8529)
- Tech income (7991) → Schwab Investment (119)
- Monthly investment transfer (8529) → Self-Directed (8895): $1,250
- Shared expenses via 7588 (Health: $1,367, HSA: $750)

## 📊 Dashboard Metrics

### Business Performance Cards
- **Real Estate Net** - Monthly income minus expenses
- **Tech Business Net** - Consulting income minus business expenses  
- **Combined Net** - Total business performance
- **Goal Progress** - Progress toward $17,932 monthly target

### Summary Cards
- **Total Income** - All income sources (excluding transfers)
- **Total Expenses** - All expenses (excluding transfers)
- **Net Savings** - Income minus expenses
- **Total Net Worth** - Sum of all account balances

## 📥 CSV Import

### Supported Formats
- Chase Checking/Savings CSV exports
- Chase Credit Card CSV exports
- Auto-detection based on filename (looks for account numbers)

### Import Process
1. Go to "Import Data" tab
2. Drop/select your Chase CSV files
3. System auto-detects accounts and categories
4. Review and import transactions
5. Duplicate detection prevents re-imports

## 💻 Development

### Working on Specific Features
```bash
# CSV Import improvements
cd js/import/
# Modify CSVImporter.js, DuplicateDetector.js

# Business Analytics  
cd js/analytics/
# Extend AnalyticsEngine.js or RealEstateAnalytics.js

# Dashboard enhancements
cd js/ui/
# Modify Dashboard.js
```

### Adding New Features
1. Create module in appropriate directory
2. Import in main application (index.html)
3. Add UI components as needed
4. Update navigation if required

## 🔧 Configuration

### Demo vs Production Mode
```javascript
// In js/config/AppConfig.js
static DEMO_MODE = true;  // Uses localStorage, no internet required
static DEMO_MODE = false; // Uses Firebase, requires internet connection
```

### Adding New Categories
```javascript
// In AppConfig.CATEGORIES
'New Category': { 
    type: 'expense', 
    entity: 'Real Estate',
    patterns: [/pattern1/i, /pattern2/i]
}
```

## 🎯 Goals and Targets

Your financial goals are pre-configured:
- **Monthly Net Target**: $17,932
- **Real Estate Monthly Net**: ~$17,000 (25k income - 8k expenses)
- **Tech Business Monthly Net**: ~$13,000
- **Monthly Investment**: $1,250 to account 8895

## 🔒 Security

- Firebase Authentication for production
- Secure data storage in Firestore
- Input validation and sanitization
- Local demo mode for offline testing

## 📱 Browser Compatibility

- Modern browsers with ES6 module support
- Chrome, Firefox, Safari, Edge
- Mobile responsive design

## 🐛 Troubleshooting

### CSV Import Issues
- Ensure filename contains account number (e.g., "Chase8529_Activity.csv")
- Check that CSV has headers (Description, Amount, Date, etc.)
- Verify file is not empty or corrupted

### Demo Mode vs Firebase
- Demo mode: Data stored in browser localStorage
- Firebase mode: Data stored in cloud, persists across devices
- Switch between modes in AppConfig.js

## 📝 License

MIT License - Feel free to modify and distribute.

---

**Built specifically for Real Estate and Tech Business financial management** 🏠💻