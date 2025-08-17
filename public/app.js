import { AuthService } from '../Modular/js/auth/AuthService.js';
import { DataService } from '../Modular/js/data/DataService.js';
import { UIManager } from '../Modular/js/ui/UIManager.js';
import { AppConfig } from '../Modular/js/config/AppConfig.js';
import { CategoryAwareCSVImporter } from '../Modular/js/import/CategoryAwareCSVImporter.js';
import { EnhancedImportManager } from '../Modular/js/import/EnhancedImportManager.js';
import { CategoryManager } from '../Modular/js/categorization/CategoryManager.js';
import { BusinessAnalytics } from '../Modular/js/analytics/BusinessAnalytics.js';

// Main App class
class FinanceTrackerApp {
    constructor() {
        this.authService = new AuthService(firebase.auth, firebase.firestore);
        this.dataService = new DataService(firebase.auth, firebase.firestore, firebase.firestore);
        this.categoryManager = new CategoryManager();
        this.importer = new CategoryAwareCSVImporter(this.dataService, this.categoryManager);
        this.enhancedImporter = new EnhancedImportManager(this.dataService);
        this.analytics = new BusinessAnalytics(this.dataService);
        this.uiManager = new UIManager(this.authService, this.dataService, this.importer, this.analytics);

        this.init();
    }

    async init() {
        this.uiManager.showLoading();
        this.authService.onAuthStateChanged(async (user) => {
            if (user) {
                this.uiManager.showApp();
                await this.dataService.ensureDefaultAccounts();
                const transactions = await this.dataService.loadTransactions();
                const report = await this.analytics.generateReport(transactions);
                this.uiManager.renderDashboard(report);
            } else {
                this.uiManager.showLogin();
            }
        });
    }

    // Add this method to recover Tech Business transactions
    async recoverTechBusinessData() {
        const transactions = await this.dataService.loadTransactions(1000);
        let fixed = 0;
        
        for (const t of transactions) {
            const desc = (t.description || '').toLowerCase();
            const shouldBeTechBusiness = (
                desc.includes('packerthomas') ||
                desc.includes('packer thomas') ||
                (t.amount > 10000 && desc.includes('deposit') && t.accountId === '7991')
            );
            
            if (shouldBeTechBusiness && t.entity !== 'Tech Business') {
                await this.dataService.updateTransaction(t.id, {
                    category: 'Tech Business Income',
                    subcategory: 'Consulting',
                    entity: 'Tech Business'
                });
                fixed++;
            }
        }
        
        if (fixed > 0) {
            this.uiManager.showNotification(`Fixed ${fixed} Tech Business transactions`, 'success');
            await this.loadDataAndRender();
        }
        return fixed;
    }
}

// Initialize the app
// The firebase configuration would be in a separate file, which I have not seen.
// I will assume it is loaded globally before this script.
if (window.firebase && firebase.apps.length) {
    const app = new FinanceTrackerApp();
    window.app = app;
    // Make it available in console
    window.recoverTech = () => app.recoverTechBusinessData();
} else {
    console.error("Firebase is not initialized. Please ensure your firebase config is loaded.");
    // You could display an error message to the user here
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = `
            <div class="text-center text-red-500">
                <h1 class="text-3xl font-bold">Firebase Configuration Error</h1>
                <p>Could not connect to the backend. Please contact support.</p>
            </div>
        `;
    }
}
