// Main Integration File - Refactored
// File: js/integration/CategoryIntegration.js

import { CategoryManager } from '../categorization/CategoryManager.js';
import { EnhancedTransactionUI } from '../ui/EnhancedTransactionUI.js';
import { CategoryAwareCSVImporter } from '../import/CategoryAwareCSVImporter.js';

export class CategoryIntegration {
    constructor(dataService, appConfig, appController) {
        this.dataService = dataService;
        this.appConfig = appConfig;
        this.appController = appController;

        this.categoryManager = null;
        this.enhancedTransactionUI = null;
        this.categoryAwareCSVImporter = null;
    }

    async initialize() {
        // Initialize services
        this.categoryManager = new CategoryManager(this.dataService, this.appConfig);
        await this.categoryManager.init();

        // Per user request, instantiate with a services object
        this.enhancedTransactionUI = new EnhancedTransactionUI({
            dataService: this.dataService,
            categoryManager: this.categoryManager,
            appController: this.appController,
            appConfig: this.appConfig
        });

        this.categoryAwareCSVImporter = new CategoryAwareCSVImporter(
            this.dataService,
            this.categoryManager
        );

        console.log('Category Integration initialized successfully');

        // Return the instantiated services so the main app can use them
        return {
            categoryManager: this.categoryManager,
            enhancedTransactionUI: this.enhancedTransactionUI,
            csvImporter: this.categoryAwareCSVImporter,
        };
    }
}
