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
            window.categoryIntegration = this;

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
    }

    addCategoryManagementButton() {
        const headerButtons = document.querySelector('.flex.items-center.space-x-4');
        if (headerButtons && !document.getElementById('categoryManagementBtn')) {
            const button = document.createElement('button');
            button.id = 'categoryManagementBtn';
            button.className = 'text-gray-600 hover:text-gray-900 transition-colors duration-200';
            button.innerHTML = `
                <div class="flex items-center space-x-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"></path></svg>
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
                <div class="bg-white rounded-lg w-full max-w-6xl" style="height: 90vh;">
                    <div class="flex h-full">
                        <!-- Sidebar -->
                        <div class="w-64 bg-gray-50 border-r overflow-y-auto">
                            <div class="p-4 border-b"><h2 class="text-lg font-semibold">Category Management</h2></div>
                            <div class="p-4">
                                <button onclick="window.categoryIntegration.showCategorySection('overview', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">📊 Overview</button>
                                <button onclick="window.categoryIntegration.showCategorySection('categories', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">🏷️ All Categories</button>
                                <button onclick="window.categoryIntegration.showCategorySection('add', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">➕ Add Category</button>
                                <button onclick="window.categoryIntegration.showCategorySection('rules', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">⚡ Auto-Tag Rules</button>
                                <button onclick="window.categoryIntegration.showCategorySection('import-export', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 mb-2 category-section-btn">📥 Import/Export</button>
                                <button onclick="window.categoryIntegration.showCategorySection('test', this)" class="w-full text-left px-3 py-2 rounded hover:bg-gray-200 category-section-btn">🧪 Test Categorization</button>
                            </div>
                        </div>
                        <!-- Main Content -->
                        <div class="flex-1 overflow-y-auto">
                            <div class="p-6">
                                <div class="flex justify-between items-center mb-6">
                                    <h3 id="categoryModalTitle" class="text-xl font-semibold">Category Overview</h3>
                                    <button onclick="window.categoryIntegration.closeCategoryManagementModal()" class="text-gray-400 hover:text-gray-600">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                                <div id="categoryModalContent"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    showCategoryManagementModal() {
        document.getElementById('categoryManagementModal').classList.remove('hidden');
        this.showCategorySection('overview', document.querySelector('.category-section-btn'));
    }

    closeCategoryManagementModal() {
        document.getElementById('categoryManagementModal').classList.add('hidden');
    }

    showCategorySection(section, element) {
        document.querySelectorAll('.category-section-btn').forEach(btn => btn.classList.remove('bg-blue-100', 'text-blue-800'));
        element.classList.add('bg-blue-100', 'text-blue-800');
        const title = document.getElementById('categoryModalTitle');
        const content = document.getElementById('categoryModalContent');
        switch (section) {
            case 'overview': title.textContent = 'Category Overview'; this.showCategoryOverview(content); break;
            case 'categories': title.textContent = 'All Categories'; this.showAllCategories(content); break;
            case 'add': title.textContent = 'Add New Category'; this.showAddCategoryForm(content); break;
            case 'rules': title.textContent = 'Auto-Tag Rules'; this.showAutoTagRules(content); break;
            case 'import-export': title.textContent = 'Import/Export Categories'; this.showImportExport(content); break;
            case 'test': title.textContent = 'Test Categorization'; this.showTestCategorization(content); break;
        }
    }

    showCategoryOverview(container) {
        const stats = this.getCategoryStats();
        container.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg"><div class="text-2xl font-bold text-blue-600">${stats.total}</div><div class="text-sm text-blue-800">Total Categories</div></div>
                    <div class="bg-green-50 p-4 rounded-lg"><div class="text-2xl font-bold text-green-600">${stats.withKeywords}</div><div class="text-sm text-green-800">With Auto-Tags</div></div>
                    <div class="bg-purple-50 p-4 rounded-lg"><div class="text-2xl font-bold text-purple-600">${stats.realEstate}</div><div class="text-sm text-purple-800">Real Estate</div></div>
                    <div class="bg-orange-50 p-4 rounded-lg"><div class="text-2xl font-bold text-orange-600">${stats.business}</div><div class="text-sm text-orange-800">Tech Business</div></div>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Category Breakdown</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">${Object.entries(stats.byCategory).map(([category, count]) => `<div class="flex justify-between items-center p-3 bg-gray-50 rounded"><span>${category}</span><span class="font-semibold">${count}</span></div>`).join('')}</div>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Quick Actions</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="window.categoryIntegration.showCategorySection('add', document.querySelector('.category-section-btn:nth-child(3)'))" class="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 text-left"><div class="font-medium">Add New Category</div><div class="text-sm text-gray-600">Create custom categories</div></button>
                        <button onclick="window.categoryIntegration.showCategorySection('test', document.querySelector('.category-section-btn:last-child'))" class="p-4 bg-green-50 rounded-lg hover:bg-green-100 text-left"><div class="font-medium">Test Categorization</div><div class="text-sm text-gray-600">See how transactions are categorized</div></button>
                    </div>
                </div>
            </div>`;
    }

    getCategoryStats() {
        const categories = this.categoryManager.categories;
        return {
            total: categories.length,
            withKeywords: categories.filter(c => c.autoTagKeywords?.length > 0).length,
            realEstate: categories.filter(c => c.entity === 'Real Estate').length,
            business: categories.filter(c => c.entity === 'Tech Business').length,
            byCategory: categories.reduce((acc, cat) => {
                acc[cat.category] = (acc[cat.category] || 0) + 1;
                return acc;
            }, {})
        };
    }

    showAllCategories(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex space-x-4 mb-4">
                    <select id="categoryEntityFilter" onchange="window.categoryIntegration.filterCategories()" class="p-2 border rounded"><option value="">All Entities</option><option value="Real Estate">Real Estate</option><option value="Tech Business">Tech Business</option><option value="Personal">Personal</option></select>
                    <input type="text" id="categorySearchFilter" placeholder="Search categories..." oninput="window.categoryIntegration.filterCategories()" class="flex-1 p-2 border rounded">
                </div>
                <div class="overflow-x-auto"><table class="w-full border-collapse border"><thead><tr class="bg-gray-50"><th class="border p-2 text-left">Category</th><th class="border p-2 text-left">Subcategory</th><th class="border p-2 text-left">Entity</th><th class="border p-2 text-left">Keywords</th><th class="border p-2 text-left">Tax</th><th class="border p-2 text-left">Actions</th></tr></thead><tbody id="categoriesTableBody">${this.renderCategoriesTable(this.categoryManager.categories)}</tbody></table></div>
            </div>`;
    }

    renderCategoriesTable(categories) {
        return categories.map(cat => `
            <tr class="hover:bg-gray-50">
                <td class="border p-2">${cat.category}</td><td class="border p-2">${cat.subcategory}</td>
                <td class="border p-2"><span class="px-2 py-1 text-xs rounded ${this.getEntityBadgeColor(cat.entity)}">${cat.entity}</span></td>
                <td class="border p-2 text-sm">${cat.autoTagKeywords?.join(', ') || '-'}</td>
                <td class="border p-2"><span class="px-2 py-1 text-xs rounded ${this.getTaxBadgeColor(cat.taxCategory)}">${cat.taxCategory}</span></td>
                <td class="border p-2"><button onclick="window.categoryIntegration.editCategory('${cat.id}')" class="text-blue-600 hover:underline mr-2">Edit</button><button onclick="window.categoryIntegration.deleteCategory('${cat.id}')" class="text-red-600 hover:underline">Delete</button></td>
            </tr>`).join('');
    }

    filterCategories() {
        const entity = document.getElementById('categoryEntityFilter').value;
        const search = document.getElementById('categorySearchFilter').value.toLowerCase();
        const filtered = this.categoryManager.categories.filter(cat =>
            (entity ? cat.entity === entity : true) &&
            (search ? cat.category.toLowerCase().includes(search) || cat.subcategory.toLowerCase().includes(search) : true)
        );
        document.getElementById('categoriesTableBody').innerHTML = this.renderCategoriesTable(filtered);
    }

    getEntityBadgeColor(entity) {
        const colors = { 'Real Estate': 'bg-green-100 text-green-800', 'Tech Business': 'bg-blue-100 text-blue-800', 'Personal': 'bg-purple-100 text-purple-800', 'All': 'bg-gray-100 text-gray-800' };
        return colors[entity] || 'bg-gray-100';
    }

    getTaxBadgeColor(taxCategory) {
        const colors = { 'Schedule_E': 'bg-green-100 text-green-800', 'Schedule_C': 'bg-blue-100 text-blue-800', 'Schedule_D': 'bg-purple-100 text-purple-800', 'Personal': 'bg-gray-100 text-gray-800', 'Exclude': 'bg-red-100 text-red-800' };
        return colors[taxCategory] || 'bg-gray-100';
    }

    showAddCategoryForm(container, categoryToEdit = null) {
        const isEditing = !!categoryToEdit;
        container.innerHTML = `
            <form id="addCategoryForm" class="space-y-4">
                <input type="hidden" id="editCategoryId" value="${isEditing ? categoryToEdit.id : ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Category</label><input type="text" id="newCategoryName" value="${isEditing ? categoryToEdit.category : ''}" class="w-full p-2 border rounded" required></div>
                    <div><label class="block text-sm font-medium mb-1">Subcategory</label><input type="text" id="newSubcategoryName" value="${isEditing ? categoryToEdit.subcategory : ''}" class="w-full p-2 border rounded" required></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Entity</label><select id="newCategoryEntity" class="w-full p-2 border rounded">${['Real Estate', 'Tech Business', 'Personal', 'All'].map(e => `<option value="${e}" ${isEditing && e === categoryToEdit.entity ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Tax Category</label><select id="newCategoryTax" class="w-full p-2 border rounded">${['Schedule_E', 'Schedule_C', 'Schedule_D', 'Personal', 'Exclude'].map(t => `<option value="${t}" ${isEditing && t === categoryToEdit.taxCategory ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                </div>
                <div><label class="block text-sm font-medium mb-1">Auto-Tag Keywords</label><input type="text" id="newCategoryKeywords" value="${isEditing ? categoryToEdit.autoTagKeywords?.join(', ') : ''}" placeholder="comma-separated" class="w-full p-2 border rounded"></div>
                <div><label class="block text-sm font-medium mb-1">Description</label><textarea id="newCategoryDescription" rows="2" class="w-full p-2 border rounded">${isEditing ? categoryToEdit.description || '' : ''}</textarea></div>
                <div class="flex space-x-2"><button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">${isEditing ? 'Save Changes' : 'Add Category'}</button><button type="button" onclick="window.categoryIntegration.showCategorySection('categories', document.querySelector('.category-section-btn:nth-child(2)'))" class="px-4 py-2 bg-gray-200 rounded">Cancel</button></div>
            </form>`;
        document.getElementById('addCategoryForm').onsubmit = (e) => {
            e.preventDefault();
            this.handleSaveCategory(isEditing);
        };
    }

    handleSaveCategory(isEditing) {
        const id = document.getElementById('editCategoryId').value;
        const categoryData = {
            category: document.getElementById('newCategoryName').value,
            subcategory: document.getElementById('newSubcategoryName').value,
            entity: document.getElementById('newCategoryEntity').value,
            taxCategory: document.getElementById('newCategoryTax').value,
            autoTagKeywords: document.getElementById('newCategoryKeywords').value.split(',').map(k => k.trim()).filter(Boolean),
            description: document.getElementById('newCategoryDescription').value
        };
        try {
            if (isEditing) {
                this.categoryManager.updateCategory(id, categoryData);
            } else {
                this.categoryManager.addCategory(categoryData);
            }
            this.app.showNotification(`Category ${isEditing ? 'updated' : 'added'}!`, 'success');
            this.showCategorySection('categories', document.querySelector('.category-section-btn:nth-child(2)'));
        } catch (error) {
            this.app.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    editCategory(id) {
        const category = this.categoryManager.categories.find(c => c.id === id);
        if (category) {
            this.showAddCategoryForm(document.getElementById('categoryModalContent'), category);
            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        }
    }

    deleteCategory(id) {
        if (confirm('Are you sure you want to delete this category?')) {
            this.categoryManager.deleteCategory(id);
            this.app.showNotification('Category deleted!', 'success');
            this.filterCategories();
        }
    }

    showAutoTagRules(container) {
        container.innerHTML = `<div>Auto-tag rules are managed within each category's settings. Edit a category to update its keywords.</div>`;
    }

    showImportExport(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="border rounded p-4"><h4 class="font-semibold mb-2">Export Categories</h4><p class="text-sm text-gray-600 mb-3">Backup your categories to a JSON file.</p><button onclick="window.categoryIntegration.exportCategories()" class="px-4 py-2 bg-blue-600 text-white rounded">Export JSON</button></div>
                <div class="border rounded p-4"><h4 class="font-semibold mb-2">Import Categories</h4><p class="text-sm text-gray-600 mb-3">Import from a JSON file. This will overwrite existing categories.</p><input type="file" id="importCategoriesFile" accept=".json"><button onclick="window.categoryIntegration.importCategories()" class="px-4 py-2 bg-green-600 text-white rounded ml-2">Import</button></div>
            </div>`;
    }

    exportCategories() {
        this.categoryManager.exportCategories();
    }

    importCategories() {
        const fileInput = document.getElementById('importCategoriesFile');
        if (fileInput.files.length > 0) {
            this.categoryManager.importCategories(fileInput.files[0])
                .then(count => {
                    this.app.showNotification(`${count} categories imported successfully!`, 'success');
                    this.showCategorySection('categories', document.querySelector('.category-section-btn:nth-child(2)'));
                })
                .catch(err => this.app.showNotification(`Import failed: ${err.message}`, 'error'));
        } else {
            this.app.showNotification('Please select a file to import.', 'error');
        }
    }

    showTestCategorization(container) {
        container.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Description</label><input type="text" id="testDescription" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium mb-1">Amount</label><input type="number" id="testAmount" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium mb-1">Account</label><select id="testAccount" class="w-full p-2 border rounded">${Object.entries(this.app.accounts).map(([id, acc]) => `<option value="${id}">${acc.name}</option>`).join('')}</select></div>
                </div>
                <button onclick="window.categoryIntegration.runTestCategorization()" class="px-4 py-2 bg-purple-600 text-white rounded">Test</button>
                <div id="testResults" class="mt-4"></div>
            </div>`;
    }

    runTestCategorization() {
        const result = this.categoryManager.categorizeTransaction({
            description: document.getElementById('testDescription').value,
            amount: parseFloat(document.getElementById('testAmount').value || 0),
            accountId: document.getElementById('testAccount').value
        });
        const confidence = (result.confidence * 100).toFixed(0);
        document.getElementById('testResults').innerHTML = `<div class="p-3 bg-gray-50 rounded"><strong>Result:</strong> ${result.category} / ${result.subcategory} <br><strong>Confidence:</strong> ${confidence}% <br><strong>Method:</strong> ${result.method}</div>`;
    }
}
