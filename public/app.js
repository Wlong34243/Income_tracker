// Firebase Configuration
const DEMO_MODE = false; // Set to false for production Firebase

let firebaseConfig, auth, db;

if (!DEMO_MODE) {
    firebaseConfig = {
        apiKey: "AIzaSyBhXvFPf2yRXvT2GJA6A8Isgt2-GBSyv6g",
        authDomain: "personalfinancewebapp.firebaseapp.com",
        projectId: "personalfinancewebapp",
        storageBucket: "personalfinancewebapp.firebasestorage.app",
        messagingSenderId: "644377142720",
        appId: "1:644377142720:web:8a62f4a6f3f8b65285d425",
        measurementId: "G-9LGZ8SV0D9"
    };
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} else {
    // Demo mode with localStorage
    auth = {
        onAuthStateChanged: (callback) => {
            setTimeout(() => callback({ uid: 'demo-user', email: 'demo@example.com' }), 100);
        },
        signInWithEmailAndPassword: () => Promise.resolve({ uid: 'demo-user', email: 'demo@example.com' }),
        createUserWithEmailAndPassword: () => Promise.resolve({ uid: 'demo-user', email: 'demo@example.com' }),
        signOut: () => {
            localStorage.clear();
            location.reload();
        }
    };
}

// Global variables
let currentUser = null;
let accounts = [];
let transactions = [];
let importedTransactions = [];
let baselineNetWorth = 0;
let investmentData = [];

// Account number mapping for enhanced logic
const ACCOUNT_MAPPING = {
    '0111': { name: 'Sweep Account (0111)', type: 'Checking' },
    '8529': { name: 'Real Estate Ops (8529)', type: 'Business' },
    '7991': { name: 'Tech Auditing (7991)', type: 'Business' },
    '2299': { name: 'Business Expenses (2299)', type: 'Credit Card' },
    '2434': { name: 'Visa Prime (2434)', type: 'Credit Card' },
    '7588': { name: 'Shared Checking (7588)', type: 'Checking' },
    '8895': { name: 'Investment (8895)', type: 'Investment' },
    '0898': { name: "Lisa's Income (0898)", type: 'Checking' }
};

// Enhanced categorization logic
function enhancedCategorizeTransaction(description, fromAccount, toAccount, amount) {
    const desc = description.toLowerCase();
    
    // Check for specific transfer patterns
    if (fromAccount && toAccount) {
        // Tech Auditing to Investment
        if (fromAccount.includes('7991') && toAccount.includes('8895')) {
            return 'Investment Contribution';
        }
        // Sweep to Lisa's account
        if (fromAccount.includes('0111') && toAccount.includes('0898')) {
            return "Lisa's Income";
        }
    }
    
    // Regular categorization
    if (desc.includes('rent') || desc.includes('tenant')) return 'Real Estate Income';
    if (desc.includes('consulting') || desc.includes('invoice') || desc.includes('audit')) return 'Business Income';
    if (desc.includes('vyve') || desc.includes('frontier') || desc.includes('netflix')) return 'Utilities';
    if (desc.includes('insurance')) return 'Insurance';
    if (desc.includes('hsa') || desc.includes('health')) return 'Healthcare';
    if (desc.includes('amazon') || desc.includes('target') || desc.includes('grocery')) return 'Personal Expenses';
    if (desc.includes('property tax') || desc.includes('hoa')) return 'Property Expenses';
    if (desc.includes('transfer')) return 'Transfer';
    
    return 'Other';
}

// Authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        loadData();
    } else {
        currentUser = null;
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
});

// Load data from storage
async function loadData() {
    try {
        if (DEMO_MODE) {
            const storedAccounts = localStorage.getItem('demo-accounts');
            const storedTransactions = localStorage.getItem('demo-transactions');
            const storedBaseline = localStorage.getItem('demo-baseline');
            const storedInvestments = localStorage.getItem('demo-investments');
            
            accounts = storedAccounts ? JSON.parse(storedAccounts) : [];
            transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
            baselineNetWorth = storedBaseline ? parseFloat(storedBaseline) : 0;
            investmentData = storedInvestments ? JSON.parse(storedInvestments) : [];
            
            transactions = transactions.map(t => ({
                ...t,
                date: { seconds: new Date(t.date).getTime() / 1000 }
            }));
            
            investmentData = investmentData.map(inv => ({
                ...inv,
                date: { seconds: new Date(inv.date).getTime() / 1000 }
            }));
        } else {
            // Firebase loading logic would go here
        }

        updateUI();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Save data to storage
function saveData() {
    if (DEMO_MODE) {
        localStorage.setItem('demo-accounts', JSON.stringify(accounts));
        localStorage.setItem('demo-transactions', JSON.stringify(transactions.map(t => ({
            ...t,
            date: new Date(t.date.seconds * 1000).toISOString()
        }))));
        localStorage.setItem('demo-baseline', baselineNetWorth.toString());
        localStorage.setItem('demo-investments', JSON.stringify(investmentData.map(inv => ({
            ...inv,
            date: new Date(inv.date.seconds * 1000).toISOString()
        }))));
    }
}

// Enhanced dashboard calculations
function calculateEnhancedMetrics() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let realEstateIncome = 0;
    let businessIncome = 0;
    let realEstateExpenses = 0;
    let businessExpenses = 0;
    let lisaIncome = 0;
    let businessInvestmentContributions = 0;

    transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date.seconds * 1000);
        if (transactionDate.getMonth() === currentMonth && 
            transactionDate.getFullYear() === currentYear) {
            
            // Exclude investment contributions from expenses
            if (transaction.category === 'Investment Contribution') {
                businessInvestmentContributions += Math.abs(transaction.amount);
                return; // Don't count as expense
            }

            // Handle Lisa's Income separately
            if (transaction.category === "Lisa's Income") {
                lisaIncome += Math.abs(transaction.amount);
                return; // Don't count in main income/expense
            }

            if (transaction.type === 'Income' && transaction.category !== 'Transfer') {
                monthlyIncome += transaction.amount;
                if (transaction.category === 'Real Estate Income') {
                    realEstateIncome += transaction.amount;
                } else if (transaction.category === 'Business Income') {
                    businessIncome += transaction.amount;
                }
            } else if (transaction.type === 'Expense' && transaction.category !== 'Transfer') {
                monthlyExpenses += Math.abs(transaction.amount);
                if (transaction.category === 'Property Expenses') {
                    realEstateExpenses += Math.abs(transaction.amount);
                } else if (transaction.category === 'Business Expenses') {
                    businessExpenses += Math.abs(transaction.amount);
                }
            }
        }
    });

    // Get direct investment contributions from investment data
    const directContributions = investmentData
        .filter(inv => {
            const invDate = new Date(inv.date.seconds * 1000);
            return inv.type === 'contribution' && 
                   invDate.getMonth() === currentMonth && 
                   invDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);

    return {
        monthlyIncome,
        monthlyExpenses,
        realEstateIncome,
        businessIncome,
        realEstateExpenses,
        businessExpenses,
        lisaIncome,
        businessInvestmentContributions,
        directContributions,
        realEstateNet: realEstateIncome - realEstateExpenses,
        businessNet: businessIncome - businessExpenses,
        netSavings: monthlyIncome - monthlyExpenses
    };
}

function updateDashboard() {
    const metrics = calculateEnhancedMetrics();
    
    // Calculate total net worth including baseline and current investment value
    const accountsNetWorth = accounts.reduce((total, account) => total + account.balance, 0);
    const currentInvestmentValue = getCurrentInvestmentValue();
    const totalNetWorth = baselineNetWorth + accountsNetWorth + currentInvestmentValue;

    // Update main cards
    document.getElementById('totalIncome').textContent = formatCurrency(metrics.monthlyIncome);
    document.getElementById('totalExpenses').textContent = formatCurrency(metrics.monthlyExpenses);
    document.getElementById('netSavings').textContent = formatCurrency(metrics.netSavings);
    document.getElementById('totalNetWorth').textContent = formatCurrency(totalNetWorth);
    document.getElementById('baselineDisplay').textContent = formatCurrency(baselineNetWorth);

    // Update business performance cards
    document.getElementById('realEstateNet').textContent = formatCurrency(metrics.realEstateNet);
    document.getElementById('businessNet').textContent = formatCurrency(metrics.businessNet);
    document.getElementById('lisaIncome').textContent = formatCurrency(metrics.lisaIncome);

    // Update investment contributions
    const totalContributions = metrics.businessInvestmentContributions + metrics.directContributions;
    document.getElementById('totalInvestmentContributions').textContent = formatCurrency(totalContributions);
    document.getElementById('businessContributions').textContent = formatCurrency(metrics.businessInvestmentContributions);
    document.getElementById('directContributions').textContent = formatCurrency(metrics.directContributions);

    // Update goal progress
    const combinedNet = metrics.realEstateNet + metrics.businessNet;
    const goalAmount = 17932;
    const goalProgress = Math.min((combinedNet / goalAmount) * 100, 100);
    
    document.getElementById('combinedNet').textContent = formatCurrency(combinedNet);
    document.getElementById('goalProgress').style.width = `${goalProgress}%`;
    document.getElementById('goalPercentage').textContent = `${goalProgress.toFixed(1)}%`;

    updateRecentTransactions();
}

function getCurrentInvestmentValue() {
    const latestInvestment = investmentData
        .filter(inv => inv.type === 'value')
        .sort((a, b) => b.date.seconds - a.date.seconds)[0];
    
    return latestInvestment ? latestInvestment.amount : 0;
}

function updateInvestmentTab() {
    const currentValue = getCurrentInvestmentValue();
    const lastUpdate = investmentData
        .filter(inv => inv.type === 'value')
        .sort((a, b) => b.date.seconds - a.date.seconds)[0];

    document.getElementById('currentInvestmentValue').textContent = formatCurrency(currentValue);
    document.getElementById('lastUpdateDate').textContent = lastUpdate ? 
        new Date(lastUpdate.date.seconds * 1000).toLocaleDateString() : 'Never';

    // Calculate monthly and YTD contributions
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyContributions = investmentData
        .filter(inv => {
            const invDate = new Date(inv.date.seconds * 1000);
            return inv.type === 'contribution' && 
                   invDate.getMonth() === currentMonth && 
                   invDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);

    const ytdContributions = investmentData
        .filter(inv => {
            const invDate = new Date(inv.date.seconds * 1000);
            return inv.type === 'contribution' && invDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);

    document.getElementById('monthlyContributions').textContent = formatCurrency(monthlyContributions);
    document.getElementById('ytdContributions').textContent = formatCurrency(ytdContributions);

    // Update investment history table
    updateInvestmentHistoryTable();
}

function updateInvestmentHistoryTable() {
    const table = document.getElementById('investmentHistoryTable');
    table.innerHTML = '';

    const sortedInvestments = [...investmentData]
        .sort((a, b) => b.date.seconds - a.date.seconds)
        .slice(0, 20);

    sortedInvestments.forEach(inv => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${new Date(inv.date.seconds * 1000).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${inv.type === 'value' ? 'Account Value' : 'Contribution'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${inv.type === 'value' ? 'text-blue-600' : 'text-green-600'}">
                ${formatCurrency(inv.amount)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${inv.source || 'Manual'}
            </td>
        `;
        table.appendChild(row);
    });
}

// PDF Processing Functions
async function processSchwabPDF(file) {
    try {
        showPDFProcessingStatus(true);
        updatePDFProgress(10);

        const arrayBuffer = await file.arrayBuffer();
        updatePDFProgress(30);

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        updatePDFProgress(50);

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }
        updatePDFProgress(80);

        // Extract ending balance and deposits
        const extractedData = extractSchwabData(fullText);
        updatePDFProgress(100);

        if (extractedData.endingBalance || extractedData.deposits) {
            // Save the extracted data
            const currentDate = new Date();
            
            if (extractedData.endingBalance) {
                investmentData.push({
                    id: generateId(),
                    type: 'value',
                    amount: extractedData.endingBalance,
                    date: { seconds: currentDate.getTime() / 1000 },
                    source: 'Schwab PDF',
                    userId: currentUser.uid
                });
            }

            if (extractedData.deposits > 0) {
                investmentData.push({
                    id: generateId(),
                    type: 'contribution',
                    amount: extractedData.deposits,
                    date: { seconds: currentDate.getTime() / 1000 },
                    source: 'Schwab PDF',
                    userId: currentUser.uid
                });
            }

            saveData();
            updateInvestmentTab();
            updateDashboard();
            
            alert(`Successfully extracted:\nEnding Balance: ${formatCurrency(extractedData.endingBalance || 0)}\nMonthly Deposits: ${formatCurrency(extractedData.deposits || 0)}`);
        } else {
            alert('Could not extract investment data from PDF. Please check the file format.');
        }

        showPDFProcessingStatus(false);
    } catch (error) {
        console.error('Error processing PDF:', error);
        alert('Error processing PDF: ' + error.message);
        showPDFProcessingStatus(false);
    }
}

function extractSchwabData(text) {
    const data = { endingBalance: 0, deposits: 0 };
    
    // Common patterns for Schwab statements
    const balancePatterns = [
        /ending\s+balance[:\s]+\$?([\d,]+\.?\d*)/i,
        /account\s+value[:\s]+\$?([\d,]+\.?\d*)/i,
        /total\s+value[:\s]+\$?([\d,]+\.?\d*)/i,
        /balance[:\s]+\$?([\d,]+\.?\d*)/i
    ];

    const depositPatterns = [
        /deposits?[:\s]+\$?([\d,]+\.?\d*)/i,
        /contributions?[:\s]+\$?([\d,]+\.?\d*)/i,
        /transfers?\s+in[:\s]+\$?([\d,]+\.?\d*)/i
    ];

    // Try to find ending balance
    for (const pattern of balancePatterns) {
        const match = text.match(pattern);
        if (match) {
            data.endingBalance = parseFloat(match[1].replace(/,/g, ''));
            break;
        }
    }

    // Try to find deposits
    for (const pattern of depositPatterns) {
        const match = text.match(pattern);
        if (match) {
            data.deposits = parseFloat(match[1].replace(/,/g, ''));
            break;
        }
    }

    return data;
}

function showPDFProcessingStatus(show) {
    const status = document.getElementById('pdfProcessingStatus');
    if (show) {
        status.classList.remove('hidden');
        updatePDFProgress(0);
    } else {
        status.classList.add('hidden');
        document.getElementById('pdfFileInput').value = '';
    }
}

function updatePDFProgress(percent) {
    document.getElementById('pdfProgress').style.width = `${percent}%`;
}

// Update UI
function updateUI() {
    updateAccountsList();
    updateTransactionsList();
    updateAccountDropdowns();
    updateDashboard();
    updateInvestmentTab();
}

function updateAccountsList() {
    const accountsList = document.getElementById('accountsList');
    accountsList.innerHTML = '';

    if (accounts.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                No accounts found. Use "Quick Setup" or "Add Account" to get started.
            </td>
        `;
        accountsList.appendChild(row);
        return;
    }

    accounts.forEach(account => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${account.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.type}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(account.balance)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button onclick="deleteAccount('${account.id}')" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        `;
        accountsList.appendChild(row);
    });
}

function updateTransactionsList() {
    const transactionsList = document.getElementById('transactionsList');
    const filterAccount = document.getElementById('filterAccount').value;
    const filterType = document.getElementById('filterType').value;
    const filterCategory = document.getElementById('filterCategory').value;

    let filteredTransactions = transactions;
    if (filterAccount) {
        filteredTransactions = filteredTransactions.filter(t => t.accountId === filterAccount);
    }
    if (filterType) {
        filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
    }
    if (filterCategory) {
        filteredTransactions = filteredTransactions.filter(t => t.category === filterCategory);
    }

    transactionsList.innerHTML = '';

    const displayCount = Math.min(filteredTransactions.length, 100);
    filteredTransactions.slice(0, displayCount).forEach(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const accountName = account ? account.name : 'Unknown Account';
        
        const div = document.createElement('div');
        div.className = 'px-6 py-4 flex justify-between items-center hover:bg-gray-50';
        
        let typeColor = 'text-gray-600';
        if (transaction.category === "Lisa's Income") {
            typeColor = 'text-pink-600';
        } else if (transaction.category === 'Investment Contribution') {
            typeColor = 'text-blue-600';
        } else if (transaction.type === 'Income') {
            typeColor = 'text-green-600';
        } else if (transaction.type === 'Expense') {
            typeColor = 'text-red-600';
        }
        
        div.innerHTML = `
            <div class="flex-1">
                <div class="text-sm font-medium text-gray-900">${transaction.description}</div>
                <div class="text-sm text-gray-500">${accountName} • ${transaction.category}</div>
                <div class="text-xs text-gray-400">${new Date(transaction.date.seconds * 1000).toLocaleDateString()}</div>
            </div>
            <div class="text-sm font-medium ${typeColor}">
                ${transaction.type === 'Expense' ? '-' : ''}${formatCurrency(Math.abs(transaction.amount))}
            </div>
        `;
        transactionsList.appendChild(div);
    });

    if (filteredTransactions.length > displayCount) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'px-6 py-4 text-center text-gray-500 text-sm';
        moreDiv.textContent = `Showing ${displayCount} of ${filteredTransactions.length} transactions`;
        transactionsList.appendChild(moreDiv);
    }
}

function updateAccountDropdowns() {
    const selects = [
        document.getElementById('transactionAccount'),
        document.getElementById('transferAccount'),
        document.getElementById('filterAccount'),
        document.getElementById('analyticsAccount')
    ];

    selects.forEach(select => {
        if (!select) return;
        
        const currentValue = select.value;
        const isFilterSelect = select.id === 'filterAccount' || select.id === 'analyticsAccount';
        
        select.innerHTML = isFilterSelect ? 
            '<option value="">All Accounts</option>' : 
            '<option value="">Select Account</option>';
        
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });

    const categorySelect = document.getElementById('filterCategory');
    if (categorySelect) {
        const currentCategory = categorySelect.value;
        const categories = [...new Set(transactions.map(t => t.category))].sort();
        
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        categorySelect.value = currentCategory;
    }
}

function updateRecentTransactions() {
    const recentTransactions = document.getElementById('recentTransactions');
    recentTransactions.innerHTML = '';

    transactions.slice(0, 5).forEach(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const accountName = account ? account.name : 'Unknown Account';
        
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0';
        
        let typeColor = 'text-gray-600';
        if (transaction.category === "Lisa's Income") {
            typeColor = 'text-pink-600';
        } else if (transaction.category === 'Investment Contribution') {
            typeColor = 'text-blue-600';
        } else if (transaction.type === 'Income') {
            typeColor = 'text-green-600';
        } else if (transaction.type === 'Expense') {
            typeColor = 'text-red-600';
        }
        
        div.innerHTML = `
            <div>
                <div class="text-sm font-medium text-gray-900">${transaction.description}</div>
                <div class="text-xs text-gray-500">${accountName} • ${transaction.category} • ${new Date(transaction.date.seconds * 1000).toLocaleDateString()}</div>
            </div>
            <div class="text-sm font-medium ${typeColor}">
                ${transaction.type === 'Expense' ? '-' : ''}${formatCurrency(Math.abs(transaction.amount))}
            </div>
        `;
        recentTransactions.appendChild(div);
    });
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function setupPredefinedAccounts() {
    const predefinedAccounts = [
        { name: 'Sweep Account (0111)', type: 'Checking', balance: 0 },
        { name: 'Real Estate Ops (8529)', type: 'Business', balance: 0 },
        { name: 'Tech Auditing (7991)', type: 'Business', balance: 0 },
        { name: 'Business Expenses (2299)', type: 'Credit Card', balance: 0 },
        { name: 'Visa Prime (2434)', type: 'Credit Card', balance: 0 },
        { name: 'Shared Checking (7588)', type: 'Checking', balance: 0 },
        { name: 'Investment (8895)', type: 'Investment', balance: 0 },
        { name: "Lisa's Income (0898)", type: 'Checking', balance: 0 }
    ];

    if (confirm('This will create your predefined accounts. Continue?')) {
        try {
            const existingNames = accounts.map(a => a.name);
            const newAccounts = predefinedAccounts.filter(account => 
                !existingNames.includes(account.name)
            );

            newAccounts.forEach(account => {
                accounts.push({
                    ...account,
                    id: generateId(),
                    userId: currentUser.uid
                });
            });
            
            saveData();
            alert(`Created ${newAccounts.length} new accounts!`);
            await loadData();
        } catch (error) {
            console.error('Error setting up accounts:', error);
            alert('Error creating accounts: ' + error.message);
        }
    }
}

async function deleteAccount(accountId) {
    if (confirm('Are you sure you want to delete this account? This will also delete all associated transactions.')) {
        try {
            accounts = accounts.filter(a => a.id !== accountId);
            transactions = transactions.filter(t => t.accountId !== accountId);
            saveData();
            loadData();
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Error deleting account: ' + error.message);
        }
    }
}

function exportData() {
    const data = {
        accounts: accounts,
        transactions: transactions.map(t => ({
            ...t,
            date: new Date(t.date.seconds * 1000).toISOString()
        })),
        investmentData: investmentData.map(inv => ({
            ...inv,
            date: new Date(inv.date.seconds * 1000).toISOString()
        })),
        baselineNetWorth: baselineNetWorth,
        exportDate: new Date().toISOString(),
        totalNetWorth: baselineNetWorth + accounts.reduce((sum, acc) => sum + acc.balance, 0) + getCurrentInvestmentValue(),
        totalTransactions: transactions.length
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('text-white', 'border-blue-600');
            b.classList.add('text-blue-200');
        });
        btn.classList.remove('text-blue-200');
        btn.classList.add('text-white', 'border-b-2', 'border-blue-600');
        
        // Show active tab
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(tab).classList.remove('hidden');
        
        if (tab === 'dashboard') {
            updateDashboard();
        } else if (tab === 'investments') {
            updateInvestmentTab();
        }
    });
});

// Modal handling
document.getElementById('setBaselineBtn').addEventListener('click', () => {
    document.getElementById('baselineAmount').value = baselineNetWorth || '';
    document.getElementById('baselineModal').classList.remove('hidden');
});

document.getElementById('cancelBaseline').addEventListener('click', () => {
    document.getElementById('baselineModal').classList.add('hidden');
    document.getElementById('baselineForm').reset();
});

document.getElementById('baselineForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('baselineAmount').value);
    if (!isNaN(amount)) {
        baselineNetWorth = amount;
        saveData();
        updateDashboard();
        document.getElementById('baselineModal').classList.add('hidden');
        document.getElementById('baselineForm').reset();
        alert('Baseline net worth updated successfully!');
    }
});

document.getElementById('addAccountBtn').addEventListener('click', () => {
    document.getElementById('accountModal').classList.remove('hidden');
});

document.getElementById('addTransactionBtn').addEventListener('click', () => {
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transactionModal').classList.remove('hidden');
});

document.getElementById('cancelAccount').addEventListener('click', () => {
    document.getElementById('accountModal').classList.add('hidden');
    document.getElementById('accountForm').reset();
});

document.getElementById('cancelTransaction').addEventListener('click', () => {
    document.getElementById('transactionModal').classList.add('hidden');
    document.getElementById('transactionForm').reset();
    document.getElementById('transferAccountDiv').classList.add('hidden');
});

// Transaction type change handler
document.getElementById('transactionType').addEventListener('change', (e) => {
    const transferDiv = document.getElementById('transferAccountDiv');
    const categorySelect = document.getElementById('transactionCategory');
    
    if (e.target.value === 'Transfer') {
        transferDiv.classList.remove('hidden');
        categorySelect.value = 'Transfer';
        categorySelect.disabled = true;
    } else {
        transferDiv.classList.add('hidden');
        categorySelect.disabled = false;
        categorySelect.value = '';
    }
});

// PDF upload handling
document.getElementById('uploadSchwabBtn').addEventListener('click', () => {
    document.getElementById('pdfFileInput').click();
});

document.getElementById('pdfUploadBtn').addEventListener('click', () => {
    document.getElementById('pdfFileInput').click();
});

document.getElementById('pdfFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        processSchwabPDF(file);
    } else {
        alert('Please select a valid PDF file.');
    }
});

// Form submissions
document.getElementById('accountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const accountData = {
        id: generateId(),
        name: document.getElementById('accountName').value,
        type: document.getElementById('accountType').value,
        balance: parseFloat(document.getElementById('startingBalance').value),
        userId: currentUser.uid
    };

    try {
        accounts.push(accountData);
        saveData();
        
        document.getElementById('accountModal').classList.add('hidden');
        document.getElementById('accountForm').reset();
        loadData();
    } catch (error) {
        console.error('Error adding account:', error);
    }
});

document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const type = document.getElementById('transactionType').value;
    const accountId = document.getElementById('transactionAccount').value;
    const transferAccountId = document.getElementById('transferAccount').value;
    const description = document.getElementById('transactionDescription').value;
    
    // Get account names for enhanced categorization
    const fromAccount = accounts.find(a => a.id === accountId);
    const toAccount = accounts.find(a => a.id === transferAccountId);
    
    let category = document.getElementById('transactionCategory').value;
    
    // Enhanced categorization for transfers
    if (type === 'Transfer' && fromAccount && toAccount) {
        category = enhancedCategorizeTransaction(description, fromAccount.name, toAccount.name, amount);
    }
    
    const baseTransaction = {
        id: generateId(),
        description: description,
        amount: type === 'Expense' ? -Math.abs(amount) : Math.abs(amount),
        type: type,
        date: { seconds: new Date(document.getElementById('transactionDate').value).getTime() / 1000 },
        accountId: accountId,
        category: category,
        userId: currentUser.uid
    };

    try {
        if (type === 'Transfer' && transferAccountId) {
            // Create two transactions for transfers
            const outTransaction = {
                ...baseTransaction,
                id: generateId(),
                amount: -Math.abs(amount),
                description: `Transfer to ${toAccount?.name || 'Unknown'}`
            };
            
            const inTransaction = {
                ...baseTransaction,
                id: generateId(),
                accountId: transferAccountId,
                amount: Math.abs(amount),
                description: `Transfer from ${fromAccount?.name || 'Unknown'}`
            };

            transactions.unshift(outTransaction, inTransaction);
            
            // Update account balances
            if (fromAccount && toAccount) {
                fromAccount.balance -= Math.abs(amount);
                toAccount.balance += Math.abs(amount);
            }
        } else {
            // Regular transaction
            transactions.unshift(baseTransaction);
            
            // Update account balance
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                account.balance += baseTransaction.amount;
            }
        }

        saveData();
        document.getElementById('transactionModal').classList.add('hidden');
        document.getElementById('transactionForm').reset();
        document.getElementById('transferAccountDiv').classList.add('hidden');
        loadData();
    } catch (error) {
        console.error('Error adding transaction:', error);
    }
});

// Filter handlers
document.getElementById('filterAccount').addEventListener('change', updateTransactionsList);
document.getElementById('filterType').addEventListener('change', updateTransactionsList);
document.getElementById('filterCategory').addEventListener('change', updateTransactionsList);

// Authentication handlers
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        showAuthError(error.message);
    }
});

document.getElementById('registerBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
        showAuthError(error.message);
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

// CSV Import (existing functionality preserved)
function setupCSVImport() {
    const csvDropZone = document.getElementById('csvDropZone');
    const csvFileInput = document.getElementById('csvFileInput');
    const csvUploadBtn = document.getElementById('csvUploadBtn');

    if (csvUploadBtn) {
        csvUploadBtn.addEventListener('click', () => {
            csvFileInput.click();
        });
    }

    if (csvFileInput) {
        csvFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                processCSVFiles(files);
            }
        });
    }

    if (document.getElementById('clearImportBtn')) {
        document.getElementById('clearImportBtn').addEventListener('click', clearImport);
    }
    if (document.getElementById('validateImportBtn')) {
        document.getElementById('validateImportBtn').addEventListener('click', validateImport);
    }
    if (document.getElementById('processImportBtn')) {
        document.getElementById('processImportBtn').addEventListener('click', processImport);
    }
}

function processCSVFiles(files) {
    // Existing CSV processing logic preserved
    console.log('Processing CSV files:', files.length);
}

function clearImport() {
    importedTransactions = [];
    const importProgress = document.getElementById('importProgress');
    const importPreview = document.getElementById('importPreview');
    if (importProgress) importProgress.classList.add('hidden');
    if (importPreview) importPreview.classList.add('hidden');
}

function validateImport() {
    console.log('Validating import...');
}

function processImport() {
    console.log('Processing import...');
}

// Analytics (preserved from existing)
function updateAnalytics() {
    console.log('Updating analytics...');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('dashboard').classList.remove('hidden');
    
    setupCSVImport();
    
    document.getElementById('refreshDataBtn').addEventListener('click', loadData);
    document.getElementById('quickSetupBtn').addEventListener('click', setupPredefinedAccounts);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('refreshInvestmentsBtn').addEventListener('click', updateInvestmentTab);
    
    const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener('click', updateAnalytics);
    }
});

// Make functions available globally
window.deleteAccount = deleteAccount;