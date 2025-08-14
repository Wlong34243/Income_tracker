// Main Integration File - Refactored
// File: js/integration/CategoryIntegration.js

import { CategoryManager } from '../categorization/CategoryManager.js';
import { EnhancedTransactionUI } from '../ui/EnhancedTransactionUI.js';
import { CategoryAwareCSVImporter } from '../import/CategoryAwareCSVImporter.js';
import { AppConfig } from '../config/AppConfig.js'; // Assuming path to AppConfig

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

        if (this.isInitialized) return;

        try {
            // Initialize Category Manager
            this.categoryManager = new CategoryManager();
            await this.categoryManager.init();

            // Initialize Enhanced Transaction UI
            this.enhancedTransactionUI = new EnhancedTransactionUI({
                dataService: this.app.dataService,
                categoryManager: this.categoryManager,
                appController: this.app,
                appConfig: this.app.config || AppConfig // Import AppConfig if needed
            });

            // Initialize Category-Aware CSV Importer
            this.categoryAwareCSVImporter = new CategoryAwareCSVImporter(
                this.app.dataService,
                this.categoryManager
            );

            // Integrate with existing app components
            this.integrateWithExistingComponents();

            // Add new UI elements
            this.addCategoryManagementUI();

            // Set up event listeners
            this.setupGlobalEventListeners();

            // Make instances globally available for inline event handlers
            window.categoryIntegration = this;

            this.isInitialized = true;
            console.log('✅ Category Integration initialized successfully');

            // Return the created services so they can be injected into other modules
            return {
                categoryManager: this.categoryManager,
                enhancedTransactionUI: this.enhancedTransactionUI,
                csvImporter: this.categoryAwareCSVImporter
            };

        } catch (error) {
            console.error('❌ Failed to initialize Category Integration:', error);
            throw error;
        }
    }

    integrateWithExistingComponents() {
        // This check is important because the app object is passed in and may not have all properties yet
        if (!this.app) return;

        // Replace existing CSV importer
        if (this.app.csvImporter) {
            this.app.csvImporter = this.categoryAwareCSVImporter;
        }

        // Enhance existing transaction UI
        if (this.app.ui) {
            this.app.ui.categoryManager = this.categoryManager;
            this.app.ui.openCategoryManager = () => this.showCategoryManagementModal();
        }

        // Integrate with analytics
        if (this.app.analytics) {
            this.app.analytics.categoryManager = this.categoryManager;
        }
    }

    addCategoryManagementUI() {
        this.addCategoryManagementButton();
        this.createCategoryManagementModal();
        this.enhanceTransactionEditor();
    }

    addCategoryManagementButton() {
        const headerButtons = document.querySelector('.flex.items-center.space-x-4');
        if (headerButtons && !document.getElementById('categoryManagementBtn')) {
            const button = document.createElement('button');
            button.id = 'categoryManagementBtn';
            button.className = 'text-gray-600 hover:text-gray-900 transition-colors duration-200';
            button.innerHTML = `
                <div class="flex items-center space-x-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    <span class="hidden sm:inline">Categories</span>
                </div>
            `;
            button.title = 'Manage Categories (Ctrl+Shift+C)';
            button.onclick = () => this.showCategoryManagementModal();
            headerButtons.appendChild(button);
        }
    }

    createCategoryManagementModal() {
        if (document.getElementById('categoryManagementModal')) return;
        const modalHTML = `
            <div id="categoryManagementModal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
                    <div class="flex-grow flex overflow-hidden">
                        <!-- Sidebar -->
                        <div class="w-64 bg-gray-50 border-r overflow-y-auto p-4 space-y-2">
                             <h2 class="text-lg font-semibold px-3 pb-2 border-b">Category Management</h2>
                             <button onclick="categoryIntegration.showCategorySection('overview', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">📊 Overview</button>
                             <button onclick="categoryIntegration.showCategorySection('categories', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">🏷️ All Categories</button>
                             <button onclick="categoryIntegration.showCategorySection('add', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">➕ Add Category</button>
                             <button onclick="categoryIntegration.showCategorySection('rules', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">⚡ Auto-Tag Rules</button>
                             <button onclick="categoryIntegration.showCategorySection('import-export', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">📥 Import/Export</button>
                             <button onclick="categoryIntegration.showCategorySection('test', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">🧪 Test Categorization</button>
                        </div>

                        <!-- Main Content -->
                        <div class="flex-1 flex flex-col overflow-hidden">
                            <div class="p-6 border-b flex justify-between items-center">
                                <h3 id="categoryModalTitle" class="text-xl font-semibold">Category Overview</h3>
                                <button onclick="categoryIntegration.closeCategoryManagementModal()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            <div id="categoryModalContent" class="flex-grow overflow-y-auto p-6">
                                <!-- Content will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    enhanceTransactionEditor() {
        // This part needs to be adapted based on how the transaction editor is created.
        // For now, we assume it exists in the DOM at initialization.
        const editor = document.getElementById('transactionEditor');
        if (editor) {
            this.addCategoryFieldsToEditor(editor);
        }
    }

    addCategoryFieldsToEditor(editor) {
        const form = editor.querySelector('form');
        if (!form || form.querySelector('#editTransactionCategory')) return;

        const categoryHTML = `
            <div class="mb-4">
                <label for="editTransactionCategory" class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select id="editTransactionCategory" name="category" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <!-- Options will be populated dynamically -->
                </select>
            </div>
        `;
        const amountField = form.querySelector('input[type="number"]');
        if (amountField && amountField.parentElement) {
            amountField.parentElement.insertAdjacentHTML('afterend', categoryHTML);
        } else {
            form.insertAdjacentHTML('beforeend', categoryHTML);
        }
    }

    setupGlobalEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.showCategoryManagementModal();
            }
        });
    }

    showCategoryManagementModal() {
        document.getElementById('categoryManagementModal').classList.remove('hidden');
        this.showCategorySection('overview', document.querySelector('.category-section-btn'));
    }

    closeCategoryManagementModal() {
        document.getElementById('categoryManagementModal').classList.add('hidden');
    }

    showCategorySection(section, element) {
        document.querySelectorAll('.category-section-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-800', 'font-semibold');
        });
        if (element) {
            element.classList.add('bg-blue-100', 'text-blue-800', 'font-semibold');
        }

        const title = document.getElementById('categoryModalTitle');
        const content = document.getElementById('categoryModalContent');
        content.innerHTML = '<div class="text-center p-8 text-gray-500">Loading...</div>'; // Loading state

        switch (section) {
            case 'overview':
                title.textContent = 'Category Overview';
                this.showCategoryOverview(content);
                break;
            case 'categories':
                title.textContent = 'All Categories';
                this.showAllCategories(content);
                break;
            case 'add':
                title.textContent = 'Add New Category';
                this.showAddCategoryForm(content);
                break;
            case 'test':
                title.textContent = 'Test Categorization';
                this.showTestCategorization(content);
                break;
            case 'import-export':
                title.textContent = 'Import/Export Categories';
                this.showImportExport(content);
                break;
            default:
                content.innerHTML = `<div class="text-center p-8 text-red-500">Section not implemented: ${section}</div>`;
        }
    }

    showCategoryOverview(container) {
        // Implementation for overview section
        container.innerHTML = `<p>Category overview will be displayed here.</p>`;
    }

    showAllCategories(container) {
        // Implementation for showing all categories
        container.innerHTML = `<p>A table of all categories will be displayed here.</p>`;
    }

    showAddCategoryForm(container) {
        // Implementation for the add category form
        container.innerHTML = `<p>A form to add a new category will be displayed here.</p>`;
    }

    showTestCategorization(container) {
        // Implementation for testing categorization
        container.innerHTML = `<p>A form to test categorization rules will be displayed here.</p>`;
    }

    showImportExport(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Export Section -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-3">Export Categories</h4>
                    <p class="text-sm text-gray-600 mb-4">
                        Export your categories for backup or sharing with others.
                    </p>
                    <button onclick="categoryIntegration.exportCategories()"
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Export as JSON
                    </button>
                </div>

                <!-- Import Section -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-3">Import Categories</h4>
                    <p class="text-sm text-gray-600 mb-4">
                        Import categories from a JSON file. This will add to your existing categories.
                    </p>
                    <div class="flex items-center space-x-4">
                        <input type="file" id="importCategoriesFile" accept=".json"
                               class="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        <button onclick="categoryIntegration.importCategories()"
                                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                            Import
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    exportCategories() {
        this.categoryManager.exportCategories();
    }

    importCategories() {
        const fileInput = document.getElementById('importCategoriesFile');
        if (fileInput.files.length > 0) {
            this.categoryManager.importCategories(fileInput.files[0]);
        } else {
            alert('Please select a file to import.');
        }

    }
}
