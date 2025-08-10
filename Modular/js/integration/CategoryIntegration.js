// Main Integration File - Enhanced Categorization System
// File: js/integration/CategoryIntegration.js

import { CategoryManager } from '../categorization/CategoryManager.js';
import { EnhancedTransactionUI } from '../ui/EnhancedTransactionUI.js';
import { CategoryAwareCSVImporter } from '../import/CategoryAwareCSVImporter.js';

export class CategoryIntegration {
    constructor(app) {
        this.app = app;
        this.categoryManager = null;
        this.enhancedTransactionUI = null;
        this.categoryAwareCSVImporter = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize Category Manager
            this.categoryManager = new CategoryManager();
            await this.categoryManager.init();

            // Initialize Enhanced Transaction UI
            this.enhancedTransactionUI = new EnhancedTransactionUI(
                this.app.dataService,
                this.app,
                this.categoryManager
            );

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

            // Make instances globally available
            window.categoryManager = this.categoryManager;
            window.enhancedTransactionUI = this.enhancedTransactionUI;
            window.csvImporter = this.categoryAwareCSVImporter;

            this.isInitialized = true;
            console.log('Category Integration initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Category Integration:', error);
            throw error;
        }
    }

    integrateWithExistingComponents() {
        // Replace existing CSV importer
        if (this.app.csvImporter) {
            // Migrate any existing functionality
            this.categoryAwareCSVImporter.app = this.app;
            this.app.csvImporter = this.categoryAwareCSVImporter;
        }

        // Enhance existing transaction UI
        if (this.app.ui) {
            // Add category management methods to existing UI
            this.app.ui.categoryManager = this.categoryManager;
            this.app.ui.openCategoryManager = () => this.showCategoryManagementModal();
        }

        // Integrate with analytics
        if (this.app.analytics) {
            this.app.analytics.categoryManager = this.categoryManager;
        }
    }

    addCategoryManagementUI() {
        // Add Category Management button to header
        this.addCategoryManagementButton();

        // Add category management modal
        this.createCategoryManagementModal();

        // Enhance transaction editor with categorization
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
            button.title = 'Manage Categories';
            button.onclick = () => this.showCategoryManagementModal();

            headerButtons.appendChild(button);
        }
    }

    createCategoryManagementModal() {
        const modalHTML = `
            <div id="categoryManagementModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg w-full max-w-6xl max-h-90vh overflow-hidden">
                    <div class="flex h-full">
                        <!-- Sidebar -->
                        <div class="w-64 bg-gray-50 border-r overflow-y-auto">
                            <div class="p-4 border-b">
                                <h2 class="text-lg font-semibold">Category Management</h2>
                            </div>
                            <div class="p-4">
                                <button onclick="categoryIntegration.showCategorySection('overview')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">
                                    📊 Overview
                                </button>
                                <button onclick="categoryIntegration.showCategorySection('categories')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">
                                    🏷️ All Categories
                                </button>
                                <button onclick="categoryIntegration.showCategorySection('add')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">
                                    ➕ Add Category
                                </button>
                                <button onclick="categoryIntegration.showCategorySection('rules')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">
                                    ⚡ Auto-Tag Rules
                                </button>
                                <button onclick="categoryIntegration.showCategorySection('import-export')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">
                                    📥 Import/Export
                                </button>
                                <button onclick="categoryIntegration.showCategorySection('test')"
                                        class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">
                                    🧪 Test Categorization
                                </button>
                            </div>
                        </div>

                        <!-- Main Content -->
                        <div class="flex-1 overflow-y-auto">
                            <div class="p-6">
                                <div class="flex justify-between items-center mb-6">
                                    <h3 id="categoryModalTitle" class="text-xl font-semibold">Category Overview</h3>
                                    <button onclick="categoryIntegration.closeCategoryManagementModal()"
                                            class="text-gray-400 hover:text-gray-600">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>

                                <div id="categoryModalContent">
                                    <!-- Content will be populated dynamically -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    enhanceTransactionEditor() {
        // Find existing transaction editor and enhance it
        const existingEditor = document.getElementById('transactionEditor');
        if (existingEditor) {
            // Add category management fields
            this.addCategoryFieldsToEditor(existingEditor);
        }

        // Also enhance the transaction modal if it exists
        const transactionModal = document.getElementById('transactionModal');
        if (transactionModal) {
            this.addCategoryFieldsToModal(transactionModal);
        }
    }

    addCategoryFieldsToEditor(editor) {
        // Find the form inside the editor
        const form = editor.querySelector('form');
        if (!form) return;

        // Look for existing category field
        let categoryField = form.querySelector('#editTransactionCategory');
        if (!categoryField) {
            // Create enhanced category field
            const categoryHTML = `
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select id="editTransactionCategory" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Category...</option>
                    </select>
                    <div class="mt-1">
                        <button type="button" onclick="categoryIntegration.showQuickCategoryAdd()"
                                class="text-sm text-blue-600 hover:text-blue-800">
                            + Add New Category
                        </button>
                    </div>
                </div>

                <div id="editPropertyDiv" class="mb-4 hidden">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Property</label>
                    <select id="editTransactionProperty" class="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="">Select Property...</option>
                    </select>
                    <div class="mt-1">
                        <button type="button" onclick="categoryIntegration.showAddProperty()"
                                class="text-sm text-blue-600 hover:text-blue-800">
                            + Add New Property
                        </button>
                    </div>
                </div>

                <div id="confidenceIndicator" class="mb-4 hidden">
                    <!-- Confidence information will be shown here -->
                </div>

                <div id="taxCategoryIndicator" class="mb-4 hidden">
                    <!-- Tax category information will be shown here -->
                </div>
            `;

            // Insert after amount field or at the end
            const amountField = form.querySelector('input[type="number"]');
            if (amountField && amountField.parentNode) {
                amountField.parentNode.insertAdjacentHTML('afterend', categoryHTML);
            } else {
                form.insertAdjacentHTML('beforeend', categoryHTML);
            }
        }
    }

    addCategoryFieldsToModal(modal) {
        // Similar to addCategoryFieldsToEditor but for the modal
        const form = modal.querySelector('form');
        if (!form) return;

        // Add category dropdown if it doesn't exist
        let categorySelect = form.querySelector('#transactionCategory');
        if (!categorySelect) {
            const categoryHTML = `
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select id="transactionCategory" name="category" required
                            class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Category...</option>
                    </select>
                    <button type="button" onclick="categoryIntegration.showQuickCategoryAdd()"
                            class="mt-1 text-sm text-blue-600 hover:text-blue-800">
                        + Add New Category
                    </button>
                </div>

                <div id="propertyDiv" class="mb-4 hidden">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Property</label>
                    <select id="transactionProperty" name="property"
                            class="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="">Select Property...</option>
                    </select>
                </div>
            `;

            // Insert before submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.parentNode.insertAdjacentHTML('beforebegin', categoryHTML);
            }
        }
    }

    setupGlobalEventListeners() {
        // Listen for category changes
        document.addEventListener('change', (e) => {
            if (e.target.id === 'editTransactionCategory' || e.target.id === 'transactionCategory') {
                this.handleCategoryChange(e);
            }
        });

        // Listen for form submissions to auto-categorize
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'transactionForm' || e.target.closest('#transactionModal')) {
                this.handleTransactionSubmit(e);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.showCategoryManagementModal();
            }
        });
    }

    handleCategoryChange(e) {
        if (this.enhancedTransactionUI) {
            this.enhancedTransactionUI.handleCategoryChange(e);
        }
    }

    handleTransactionSubmit(e) {
        // Auto-categorize if no category selected
        const form = e.target;
        const categorySelect = form.querySelector('select[name="category"], #transactionCategory, #editTransactionCategory');

        if (categorySelect && !categorySelect.value) {
            // Try to auto-categorize
            const description = form.querySelector('input[name="description"], #transactionDescription')?.value;
            const amount = parseFloat(form.querySelector('input[name="amount"], #transactionAmount')?.value || 0);
            const accountId = form.querySelector('select[name="account"], #transactionAccount')?.value;

            if (description && accountId) {
                const suggestion = this.categoryManager.categorizeTransaction({
                    description,
                    amount,
                    accountId
                });

                if (suggestion.confidence > 0.6) {
                    // Find the matching option
                    const options = categorySelect.querySelectorAll('option');
                    for (const option of options) {
                        if (option.dataset.category === suggestion.category &&
                            option.textContent === suggestion.subcategory) {
                            categorySelect.value = option.value;
                            this.handleCategoryChange({ target: categorySelect });
                            break;
                        }
                    }
                }
            }
        }
    }

    // Category Management Modal Methods
    showCategoryManagementModal() {
        document.getElementById('categoryManagementModal').classList.remove('hidden');
        this.showCategorySection('overview');
    }

    closeCategoryManagementModal() {
        document.getElementById('categoryManagementModal').classList.add('hidden');
    }

    showCategorySection(section) {
        // Update active button
        document.querySelectorAll('.category-section-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-800');
        });
        event.target.classList.add('bg-blue-100', 'text-blue-800');

        // Update title and content
        const title = document.getElementById('categoryModalTitle');
        const content = document.getElementById('categoryModalContent');

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
            case 'rules':
                title.textContent = 'Auto-Tag Rules';
                this.showAutoTagRules(content);
                break;
            case 'import-export':
                title.textContent = 'Import/Export Categories';
                this.showImportExport(content);
                break;
            case 'test':
                title.textContent = 'Test Categorization';
                this.showTestCategorization(content);
                break;
        }
    }

    showCategoryOverview(container) {
        const stats = this.getCategoryStats();

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Statistics Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
                        <div class="text-sm text-blue-800">Total Categories</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${stats.withKeywords}</div>
                        <div class="text-sm text-green-800">With Auto-Tags</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-purple-600">${stats.realEstate}</div>
                        <div class="text-sm text-purple-800">Real Estate</div>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-orange-600">${stats.business}</div>
                        <div class="text-sm text-orange-800">Tech Business</div>
                    </div>
                </div>

                <!-- Category Breakdown -->
                <div>
                    <h4 class="font-semibold mb-3">Category Breakdown</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        ${Object.entries(stats.byCategory).map(([category, count]) => `
                            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span>${category}</span>
                                <span class="font-semibold">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Recent Activity -->
                <div>
                    <h4 class="font-semibold mb-3">Quick Actions</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="categoryIntegration.showCategorySection('add')"
                                class="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 text-left">
                            <div class="font-medium">Add New Category</div>
                            <div class="text-sm text-gray-600">Create custom categories for your transactions</div>
                        </button>
                        <button onclick="categoryIntegration.showCategorySection('test')"
                                class="p-4 bg-green-50 rounded-lg hover:bg-green-100 text-left">
                            <div class="font-medium">Test Categorization</div>
                            <div class="text-sm text-gray-600">See how your transactions would be categorized</div>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryStats() {
        const categories = this.categoryManager.categories;
        const stats = {
            total: categories.length,
            withKeywords: categories.filter(c => c.autoTagKeywords && c.autoTagKeywords.length > 0).length,
            realEstate: categories.filter(c => c.entity === 'Real Estate').length,
            business: categories.filter(c => c.entity === 'Tech Business').length,
            byCategory: {}
        };

        categories.forEach(cat => {
            stats.byCategory[cat.category] = (stats.byCategory[cat.category] || 0) + 1;
        });

        return stats;
    }

    showAllCategories(container) {
        const categories = this.categoryManager.categories;

        container.innerHTML = `
            <div class="space-y-4">
                <!-- Filters -->
                <div class="flex space-x-4 mb-4">
                    <select id="categoryEntityFilter" onchange="categoryIntegration.filterCategories()"
                            class="p-2 border rounded">
                        <option value="">All Entities</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Tech Business">Tech Business</option>
                        <option value="Personal">Personal</option>
                        <option value="All">All</option>
                    </select>
                    <input type="text" id="categorySearchFilter" placeholder="Search categories..."
                           onchange="categoryIntegration.filterCategories()"
                           class="flex-1 p-2 border rounded">
                </div>

                <!-- Categories Table -->
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="border border-gray-300 px-4 py-2 text-left">Category</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Subcategory</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Entity</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Keywords</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Tax</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="categoriesTableBody">
                            ${this.renderCategoriesTable(categories)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderCategoriesTable(categories) {
        return categories.map((cat, index) => `
            <tr class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-2">${cat.category}</td>
                <td class="border border-gray-300 px-4 py-2">${cat.subcategory}</td>
                <td class="border border-gray-300 px-4 py-2">
                    <span class="px-2 py-1 text-xs rounded ${this.getEntityBadgeColor(cat.entity)}">
                        ${cat.entity}
                    </span>
                </td>
                <td class="border border-gray-300 px-4 py-2 text-sm">
                    ${cat.autoTagKeywords ? cat.autoTagKeywords.join(', ') : '-'}
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <span class="px-2 py-1 text-xs rounded ${this.getTaxBadgeColor(cat.taxCategory)}">
                        ${cat.taxCategory}
                    </span>
                </td>
                <td class="border border-gray-300 px-4 py-2">
                    <button onclick="categoryIntegration.editCategory('${cat.id}')"
                            class="text-blue-600 hover:text-blue-800 mr-2 text-sm">Edit</button>
                    <button onclick="categoryIntegration.deleteCategory('${cat.id}')"
                            class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    getEntityBadgeColor(entity) {
        const colors = {
            'Real Estate': 'bg-green-100 text-green-800',
            'Tech Business': 'bg-blue-100 text-blue-800',
            'Personal': 'bg-purple-100 text-purple-800',
            'All': 'bg-gray-100 text-gray-800'
        };
        return colors[entity] || 'bg-gray-100 text-gray-800';
    }

    getTaxBadgeColor(taxCategory) {
        const colors = {
            'Schedule_E': 'bg-green-100 text-green-800',
            'Schedule_C': 'bg-blue-100 text-blue-800',
            'Schedule_D': 'bg-purple-100 text-purple-800',
            'Personal': 'bg-gray-100 text-gray-800',
            'Exclude': 'bg-red-100 text-red-800'
        };
        return colors[taxCategory] || 'bg-gray-100 text-gray-800';
    }

    showAddCategoryForm(container) {
        container.innerHTML = `
            <form id="addCategoryForm" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Category</label>
                        <input type="text" id="newCategoryName" placeholder="e.g., Utilities, Maintenance"
                               class="w-full p-2 border rounded" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Subcategory</label>
                        <input type="text" id="newSubcategoryName" placeholder="e.g., Electric, Plumbing"
                               class="w-full p-2 border rounded" required>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Entity</label>
                        <select id="newCategoryEntity" class="w-full p-2 border rounded" required>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Tech Business">Tech Business</option>
                            <option value="Personal">Personal</option>
                            <option value="All">All</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Tax Category</label>
                        <select id="newCategoryTax" class="w-full p-2 border rounded" required>
                            <option value="Schedule_E">Schedule E (Real Estate)</option>
                            <option value="Schedule_C">Schedule C (Business)</option>
                            <option value="Schedule_D">Schedule D (Investment)</option>
                            <option value="Personal">Personal</option>
                            <option value="Exclude">Exclude (Transfers)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2">Auto-Tag Keywords</label>
                    <input type="text" id="newCategoryKeywords"
                           placeholder="keyword1, keyword2, keyword3 (comma separated)"
                           class="w-full p-2 border rounded">
                    <p class="text-sm text-gray-600 mt-1">
                        These keywords will automatically categorize transactions containing them
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="newCategoryDescription" rows="2"
                              placeholder="Brief description of this category"
                              class="w-full p-2 border rounded"></textarea>
                </div>

                <div class="flex space-x-4">
                    <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Add Category
                    </button>
                    <button type="button" onclick="categoryIntegration.clearAddCategoryForm()"
                            class="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                        Clear Form
                    </button>
                </div>
            </form>
        `;

        // Add form submit listener
        document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategory();
        });
    }

    handleAddCategory() {
        const formData = {
            category: document.getElementById('newCategoryName').value,
            subcategory: document.getElementById('newSubcategoryName').value,
            entity: document.getElementById('newCategoryEntity').value,
            taxCategory: document.getElementById('newCategoryTax').value,
            autoTagKeywords: document.getElementById('newCategoryKeywords').value
                .split(',').map(k => k.trim()).filter(k => k),
            description: document.getElementById('newCategoryDescription').value
        };

        try {
            const newCategory = this.categoryManager.addCategory(formData);

            if (this.app.showNotification) {
                this.app.showNotification('Category added successfully!', 'success');
            }

            this.clearAddCategoryForm();

            // Refresh current view if showing all categories
            const content = document.getElementById('categoryModalContent');
            if (content && document.getElementById('categoriesTableBody')) {
                this.showAllCategories(content);
            }

        } catch (error) {
            if (this.app.showNotification) {
                this.app.showNotification('Failed to add category: ' + error.message, 'error');
            }
        }
    }

    clearAddCategoryForm() {
        document.getElementById('addCategoryForm').reset();
    }

    showTestCategorization(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Transaction Description</label>
                        <input type="text" id="testDescription"
                               placeholder="e.g., VYVE INTERNET MONTHLY SERVICE"
                               class="w-full p-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Amount</label>
                        <input type="number" id="testAmount" step="0.01"
                               placeholder="e.g., -89.99"
                               class="w-full p-2 border rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Account</label>
                        <select id="testAccount" class="w-full p-2 border rounded">
                            <option value="0111">0111 - Sweep Account</option>
                            <option value="8529">8529 - Real Estate Operating</option>
                            <option value="7991">7991 - Tech Auditing Income</option>
                            <option value="2299">2299 - Tech Auditing Expenses</option>
                            <option value="7588">7588 - Shared Checking</option>
                            <option value="2433">2433 - Visa Prime</option>
                            <option value="8895">8895 - Investment Account</option>
                            <option value="119">119 - Schwab Investment</option>
                        </select>
                    </div>
                </div>

                <div class="flex space-x-4">
                    <button onclick="categoryIntegration.testCategorization()"
                            class="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                        Test Categorization
                    </button>
                    <button onclick="categoryIntegration.clearTestForm()"
                            class="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                        Clear
                    </button>
                </div>

                <div id="testResults" class="hidden">
                    <!-- Results will be shown here -->
                </div>
            </div>
        `;
    }

    testCategorization() {
        const description = document.getElementById('testDescription').value;
        const amount = parseFloat(document.getElementById('testAmount').value) || 0;
        const accountId = document.getElementById('testAccount').value;

        if (!description || !accountId) {
            if (this.app.showNotification) {
                this.app.showNotification('Please fill in description and account.', 'error');
            }
            return;
        }

        const result = this.categoryManager.categorizeTransaction({
            description,
            amount,
            accountId
        });

        const resultsDiv = document.getElementById('testResults');
        resultsDiv.classList.remove('hidden');

        const confidence = (result.confidence * 100).toFixed(0);
        const confidenceColor = result.confidence >= 0.8 ? 'green' : result.confidence >= 0.6 ? 'yellow' : 'red';

        resultsDiv.innerHTML = `
            <div class="border rounded-lg p-4 bg-${confidenceColor}-50 border-${confidenceColor}-200">
                <h4 class="font-semibold mb-3 text-${confidenceColor}-800">Categorization Result</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <strong class="block text-sm">Category:</strong>
                        <span>${result.category || 'None'}</span>
                    </div>
                    <div>
                        <strong class="block text-sm">Subcategory:</strong>
                        <span>${result.subcategory || 'None'}</span>
                    </div>
                    <div>
                        <strong class="block text-sm">Entity:</strong>
                        <span>${result.entity || 'None'}</span>
                    </div>
                    <div>
                        <strong class="block text-sm">Tax Category:</strong>
                        <span>${result.taxCategory || 'None'}</span>
                    </div>
                    <div>
                        <strong class="block text-sm">Confidence:</strong>
                        <span class="font-semibold">${confidence}%</span>
                    </div>
                    <div>
                        <strong class="block text-sm">Method:</strong>
                        <span>${result.method || 'Unknown'}</span>
                    </div>
                </div>
                ${result.reasoning ? `
                    <div class="text-sm text-${confidenceColor}-700">
                        <strong>Reasoning:</strong> ${result.reasoning}
                    </div>
                ` : ''}
            </div>
        `;
    }

    clearTestForm() {
        document.getElementById('testDescription').value = '';
        document.getElementById('testAmount').value = '';
        document.getElementById('testAccount').value = '8529';
        document.getElementById('testResults').classList.add('hidden');
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
                               class="file:mr-4 file:py-2 file:px
