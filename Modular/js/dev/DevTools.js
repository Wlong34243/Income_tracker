export class DevTools {
    constructor(app) {
        this.app = app;
        this.isDev = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';

        if (this.isDev) {
            this.initDevMode();
        }
    }

    initDevMode() {
        // Add dev banner
        this.addDevBanner();

        // Enhanced console commands
        this.registerConsoleCommands();

        // Add keyboard shortcuts
        this.addKeyboardShortcuts();

        // Auto-save to localStorage for quick recovery
        this.enableAutoSave();

        console.log('%c🔧 DEV MODE ENABLED', 'background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px;');
        console.log('Available commands: help(), status(), fix(), test(), reset()');
    }

    addDevBanner() {
        const banner = document.createElement('div');
        banner.id = 'dev-banner';
        banner.innerHTML = `
            <div style="background: linear-gradient(90deg, #4CAF50, #45a049); color: white; padding: 8px; text-align: center; font-size: 12px; position: fixed; top: 0; left: 0; right: 0; z-index: 9999;">
                🔧 DEV MODE |
                <button onclick="devTools.runHealthCheck()" style="background: white; color: #4CAF50; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; margin: 0 5px;">Health Check</button>
                <button onclick="devTools.fixAll()" style="background: white; color: #4CAF50; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; margin: 0 5px;">Fix All Issues</button>
                <button onclick="devTools.showStats()" style="background: white; color: #4CAF50; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; margin: 0 5px;">Stats</button>
                <button onclick="devTools.exportDebugLog()" style="background: white; color: #4CAF50; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; margin: 0 5px;">Export Log</button>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
        document.body.style.paddingTop = '40px';
    }

    registerConsoleCommands() {
        // Help command
        window.help = () => {
            console.log('%c📚 Available Commands:', 'font-weight: bold; color: #2196F3;');
            console.table({
                'status()': 'Check system status and data integrity',
                'fix()': 'Run all data fixes',
                'fix.dates()': 'Fix date formats',
                'fix.tech()': 'Fix Tech Business transactions',
                'fix.lisa()': 'Fix Lisa income transactions',
                'fix.categories()': 'Re-categorize all transactions',
                'test()': 'Run test transactions',
                'test.import()': 'Test CSV import with sample data',
                'reset()': 'Reset to clean state (with confirmation)',
                'stats()': 'Show detailed statistics',
                'backup()': 'Create backup of all data',
                'restore()': 'Restore from backup'
            });
        };

        // Status command
        window.status = async () => {
            console.group('📊 System Status');

            // User info
            console.log('👤 User:', this.app.authService?.currentUser?.email || 'Not logged in');

            // Data counts
            const transactions = await this.app.dataService.loadTransactions(1000);
            const accounts = await this.app.dataService.loadAccounts();

            console.log('📈 Data Summary:');
            console.log(`  - Accounts: ${accounts.length}`);
            console.log(`  - Transactions: ${transactions.length}`);

            // Issues check
            const issues = this.checkForIssues(transactions);
            if (issues.length > 0) {
                console.warn('⚠️ Issues Found:', issues.length);
                console.table(issues);
            } else {
                console.log('✅ No issues found');
            }

            // By account breakdown
            const byAccount = {};
            transactions.forEach(t => {
                if (!byAccount[t.accountId]) {
                    byAccount[t.accountId] = { count: 0, total: 0, uncategorized: 0 };
                }
                byAccount[t.accountId].count++;
                byAccount[t.accountId].total += t.amount;
                if (!t.category || t.category === 'Uncategorized') {
                    byAccount[t.accountId].uncategorized++;
                }
            });

            console.log('💰 By Account:');
            console.table(byAccount);

            // By entity breakdown
            const byEntity = {};
            transactions.forEach(t => {
                const entity = t.entity || 'Unknown';
                if (!byEntity[entity]) {
                    byEntity[entity] = { count: 0, income: 0, expenses: 0 };
                }
                byEntity[entity].count++;
                if (t.amount > 0) {
                    byEntity[entity].income += t.amount;
                } else {
                    byEntity[entity].expenses += Math.abs(t.amount);
                }
            });

            console.log('🏢 By Entity:');
            console.table(byEntity);

            console.groupEnd();
        };

        // Fix commands
        window.fix = async () => {
            console.log('🔧 Running all fixes...');
            await this.fixAll();
        };

        window.fix.dates = async () => {
            console.log('📅 Fixing date formats...');
            await this.fixDateFormats();
        };

        window.fix.tech = async () => {
            console.log('💻 Fixing Tech Business transactions...');
            await this.fixTechBusinessTransactions();
        };

        window.fix.lisa = async () => {
            console.log('👤 Fixing Lisa income transactions...');
            await this.fixLisaIncomeTransactions();
        };

        window.fix.categories = async () => {
            console.log('🏷️ Re-categorizing all transactions...');
            await this.recategorizeAll();
        };

        // Test commands
        window.test = () => {
            console.log('🧪 Running tests...');
            this.runTests();
        };

        window.test.import = () => {
            console.log('📥 Testing CSV import...');
            this.testCsvImport();
        };

        // Stats command
        window.stats = () => {
            this.showStats();
        };

        // Backup/Restore
        window.backup = () => {
            this.createBackup();
        };

        window.restore = () => {
            this.restoreFromBackup();
        };

        // Reset command
        window.reset = () => {
            if (confirm('⚠️ This will delete all local data. Are you sure?')) {
                if (confirm('⚠️ FINAL WARNING: This cannot be undone. Continue?')) {
                    localStorage.clear();
                    location.reload();
                }
            }
        };
    }

    checkForIssues(transactions) {
        const issues = [];

        transactions.forEach(t => {
            // Check for invalid dates
            if (!t.date || t.date === 'Invalid Date' || t.date.includes('/')) {
                issues.push({
                    type: 'Invalid Date',
                    transaction: t.description,
                    date: t.date,
                    amount: t.amount
                });
            }

            // Check for missing categories
            if (!t.category || t.category === 'Uncategorized') {
                issues.push({
                    type: 'Uncategorized',
                    transaction: t.description,
                    date: t.date,
                    amount: t.amount
                });
            }

            // Check for Tech Business in wrong account
            if (t.description?.toLowerCase().includes('packerthomas') && t.accountId !== '7991') {
                issues.push({
                    type: 'Misassigned Tech',
                    transaction: t.description,
                    account: t.accountId,
                    amount: t.amount
                });
            }

            // Check for Lisa income miscategorized
            if (t.description?.toLowerCase().includes('to chk ...0898') &&
                t.category === 'Real Estate Income') {
                issues.push({
                    type: 'Miscategorized Lisa Income',
                    transaction: t.description,
                    category: t.category,
                    amount: t.amount
                });
            }
        });

        return issues;
    }

    async fixAll() {
        const fixes = [];

        // Fix dates
        const datesFixes = await this.fixDateFormats();
        fixes.push(`Fixed ${datesFixes} date formats`);

        // Fix Tech Business
        const techFixes = await this.fixTechBusinessTransactions();
        fixes.push(`Fixed ${techFixes} Tech Business transactions`);

        // Fix Lisa income
        const lisaFixes = await this.fixLisaIncomeTransactions();
        fixes.push(`Fixed ${lisaFixes} Lisa income transactions`);

        // Re-categorize uncategorized
        const categoryFixes = await this.recategorizeAll();
        fixes.push(`Categorized ${categoryFixes} transactions`);

        console.log('✅ All fixes complete:');
        fixes.forEach(fix => console.log(`  - ${fix}`));

        // Reload the app
        await this.app.loadDataAndRender();
        this.app.uiManager.showNotification('All fixes applied successfully', 'success');
    }

    async fixDateFormats() {
        const transactions = await this.app.dataService.loadTransactions(1000);
        let fixed = 0;

        for (const t of transactions) {
            if (t.date && t.date.includes('/')) {
                const [month, day, year] = t.date.split('/');
                const fullYear = year.length === 2 ? '20' + year : year;
                const newDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

                await this.app.dataService.updateTransaction(t.id, { date: newDate });
                fixed++;
            }
        }

        return fixed;
    }

    async fixTechBusinessTransactions() {
        const transactions = await this.app.dataService.loadTransactions(1000);
        let fixed = 0;

        for (const t of transactions) {
            const desc = t.description?.toLowerCase() || '';
            const isTechBusiness = (
                desc.includes('packerthomas') ||
                desc.includes('packer thomas') ||
                (desc.includes('deposit') && t.amount > 10000 && t.accountId === '7991')
            );

            if (isTechBusiness && (t.accountId !== '7991' || t.entity !== 'Tech Business')) {
                await this.app.dataService.updateTransaction(t.id, {
                    accountId: '7991',
                    category: 'Tech Business Income',
                    subcategory: 'Consulting',
                    entity: 'Tech Business'
                });
                fixed++;
            }
        }

        return fixed;
    }

    async fixLisaIncomeTransactions() {
        const transactions = await this.app.dataService.loadTransactions(1000);
        let fixed = 0;

        for (const t of transactions) {
            const desc = t.description?.toLowerCase() || '';

            // Fix Lisa's income transfers
            if ((desc.includes('to chk ...0898') || desc.includes('to chk ...0005')) &&
                desc.includes('from chk ...0111')) {

                if (t.category !== 'Personal Income') {
                    await this.app.dataService.updateTransaction(t.id, {
                        category: 'Personal Income',
                        subcategory: "Lisa's Income",
                        entity: 'Personal'
                    });
                    fixed++;
                }
            }

            // Fix Michael Katzen payments
            if (desc.includes('michael katzen') && t.category !== 'Personal Income') {
                await this.app.dataService.updateTransaction(t.id, {
                    category: 'Personal Income',
                    subcategory: 'Legal Settlement',
                    entity: 'Personal'
                });
                fixed++;
            }
        }

        return fixed;
    }

    async recategorizeAll() {
        const transactions = await this.app.dataService.loadTransactions(1000);
        let categorized = 0;

        for (const t of transactions) {
            if (!t.category || t.category === 'Uncategorized') {
                const suggestion = this.app.categoryIntegration.categoryManager.categorizeTransaction(t);

                if (suggestion.category && suggestion.category !== 'Uncategorized') {
                    await this.app.dataService.updateTransaction(t.id, suggestion);
                    categorized++;
                }
            }
        }

        return categorized;
    }

    async runHealthCheck() {
        console.group('🏥 Health Check');

        const checks = {
            'Firebase Connected': !!this.app.dataService.db,
            'User Authenticated': !!this.app.authService.currentUser,
            'Accounts Loaded': this.app.accounts?.length > 0,
            'Transactions Loaded': this.app.transactions?.length > 0,
            'Category Manager': !!this.app.categoryIntegration?.categoryManager,
            'CSV Importer': !!this.app.categoryIntegration?.csvImporter,
            'Dashboard Rendered': !!document.querySelector('#dashboard-container')?.children.length
        };

        console.table(checks);

        const issues = this.checkForIssues(this.app.transactions || []);
        if (issues.length > 0) {
            console.warn(`Found ${issues.length} data issues. Run fix() to resolve.`);
        }

        console.groupEnd();

        // Show notification
        const failedChecks = Object.entries(checks).filter(([_, v]) => !v);
        if (failedChecks.length === 0 && issues.length === 0) {
            this.app.uiManager.showNotification('✅ All systems healthy!', 'success');
        } else {
            this.app.uiManager.showNotification(`⚠️ ${failedChecks.length} system issues, ${issues.length} data issues`, 'warning');
        }
    }

    async showStats() {
        const transactions = await this.app.dataService.loadTransactions(1000);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Monthly stats
        const monthlyStats = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    income: 0,
                    expenses: 0,
                    count: 0
                };
            }

            monthlyStats[monthKey].count++;
            if (t.amount > 0) {
                monthlyStats[monthKey].income += t.amount;
            } else {
                monthlyStats[monthKey].expenses += Math.abs(t.amount);
            }
        });

        console.group('📊 Financial Statistics');
        console.log('Monthly Summary:');
        console.table(monthlyStats);

        // Property performance
        const propertyStats = {};
        transactions
            .filter(t => t.category === 'Real Estate Income')
            .forEach(t => {
                const property = t.subcategory || 'Unknown';
                if (!propertyStats[property]) {
                    propertyStats[property] = { count: 0, total: 0 };
                }
                propertyStats[property].count++;
                propertyStats[property].total += t.amount;
            });

        console.log('Property Performance:');
        console.table(propertyStats);

        console.groupEnd();
    }

    async createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            accounts: await this.app.dataService.loadAccounts(),
            transactions: await this.app.dataService.loadTransactions(10000)
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        console.log('✅ Backup created successfully');
        this.app.uiManager.showNotification('Backup downloaded', 'success');
    }

    async restoreFromBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            const text = await file.text();
            const backup = JSON.parse(text);

            if (confirm(`Restore backup from ${backup.timestamp}? This will overwrite current data.`)) {
                // This would need to be implemented based on your data service
                console.log('Restore functionality needs to be implemented');
                this.app.uiManager.showNotification('Restore feature coming soon', 'info');
            }
        };

        input.click();
    }

    exportDebugLog() {
        const log = {
            timestamp: new Date().toISOString(),
            user: this.app.authService?.currentUser?.email,
            issues: this.checkForIssues(this.app.transactions || []),
            stats: {
                accounts: this.app.accounts?.length || 0,
                transactions: this.app.transactions?.length || 0
            }
        };

        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-log-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + D for dev panel
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDevPanel();
            }

            // Ctrl/Cmd + Shift + H for health check
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.runHealthCheck();
            }

            // Ctrl/Cmd + Shift + F for fix all
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.fixAll();
            }
        });
    }

    toggleDevPanel() {
        let panel = document.getElementById('dev-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'dev-panel';
            panel.style.cssText = `
                position: fixed;
                right: 0;
                top: 40px;
                bottom: 0;
                width: 400px;
                background: white;
                box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                z-index: 9998;
                padding: 20px;
                overflow-y: auto;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            panel.innerHTML = `
                <h2 style="margin-top: 0;">Dev Panel</h2>
                <div id="dev-panel-content"></div>
            `;
            document.body.appendChild(panel);
        }

        const isVisible = panel.style.transform === 'translateX(0%)';
        panel.style.transform = isVisible ? 'translateX(100%)' : 'translateX(0%)';

        if (!isVisible) {
            this.updateDevPanel();
        }
    }

    updateDevPanel() {
        const content = document.getElementById('dev-panel-content');
        if (!content) return;

        const issues = this.checkForIssues(this.app.transactions || []);

        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>Quick Actions</h3>
                <button onclick="devTools.fixAll()" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Fix All Issues</button>
                <button onclick="devTools.runHealthCheck()" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Health Check</button>
                <button onclick="devTools.createBackup()" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #FF9800; color: white; border: none; border-radius: 5px; cursor: pointer;">Create Backup</button>
            </div>

            <div style="margin-bottom: 20px;">
                <h3>Issues (${issues.length})</h3>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                    ${issues.length === 0 ? '<p style="color: green;">✅ No issues found</p>' :
                      issues.slice(0, 10).map(i => `
                        <div style="margin-bottom: 10px; padding: 5px; background: #f5f5f5; border-radius: 3px;">
                            <strong>${i.type}</strong><br>
                            ${i.transaction || i.date || 'N/A'}<br>
                            <small>Amount: $${Math.abs(i.amount).toFixed(2)}</small>
                        </div>
                      `).join('')}
                    ${issues.length > 10 ? `<p style="text-align: center; color: #666;">...and ${issues.length - 10} more</p>` : ''}
                </div>
            </div>

            <div>
                <h3>Keyboard Shortcuts</h3>
                <ul style="list-style: none; padding: 0;">
                    <li>⌘+Shift+D - Toggle Dev Panel</li>
                    <li>⌘+Shift+H - Health Check</li>
                    <li>⌘+Shift+F - Fix All Issues</li>
                </ul>
            </div>
        `;
    }

    enableAutoSave() {
        // Save state every 30 seconds
        setInterval(() => {
            if (this.app.transactions && this.app.transactions.length > 0) {
                localStorage.setItem('finance_tracker_autosave', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    transactionCount: this.app.transactions.length,
                    lastTransaction: this.app.transactions[0]
                }));
            }
        }, 30000);
    }
}

// Auto-initialize if in dev mode
if (window.app) {
    window.devTools = new DevTools(window.app);
}
