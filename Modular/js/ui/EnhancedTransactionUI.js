// Enhanced Transaction Editor - Integration with Category Manager
// File: js/ui/EnhancedTransactionUI.js

export class EnhancedTransactionUI {
    constructor(dataService, app, categoryManager) {
        this.dataService = dataService;
        this.app = app;
        this.categoryManager = categoryManager;
        this.currentTransaction = null;
        this.properties = this.loadProperties();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createCategoryManagementModal();
    }

    loadProperties() {
        // Load property list from localStorage or default
        const stored = localStorage.getItem('property_list');
        if (stored) {
            return JSON.parse(stored);
        }

        // Default properties based on your setup
        return [
            { id: 'prop_5th_st', address: '5th Street Property', nickname: '5th St' },
            { id: 'prop_oak_ave', address: 'Oak Avenue Property', nickname: 'Oak Ave' },
            { id: 'prop_main_st', address: 'Main Street Property', nickname: 'Main St' }
        ];
    }

    setupEventListeners() {
        // Category change handler
        document.addEventListener('change', (e) => {
            if (e.target.id === 'transactionCategory') {
                this.handleCategoryChange(e);
            }
        });

        // Add property button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addPropertyBtn') {
                this.showAddPropertyModal();
            }
            if (e.target.id === 'manageCategoriesBtn') {
                this.showCategoryManagementModal();
            }
        });
    }

    // Enhanced edit transaction method
    editTransaction(transactionData) {
        this.currentTransaction = transactionData;

        // Pre-categorize if not already categorized
        if (!transactionData.category) {
            const suggestion = this.categoryManager.categorizeTransaction(transactionData);
            if (suggestion.confidence > 0.6) {
                transactionData = { ...transactionData, ...suggestion };
            }
        }

        this.populateEditForm(transactionData);
        this.showTransactionEditor();
    }

    populateEditForm(transaction) {
        // Populate basic fields
        document.getElementById('editTransactionId').value = transaction.id || '';
        document.getElementById('editTransactionDate').value = transaction.date || '';
        document.getElementById('editTransactionDescription').value = transaction.description || '';
        document.getElementById('editTransactionAmount').value = transaction.amount || '';

        // Populate account dropdown
        this.populateAccountDropdown('editTransactionAccount', transaction.accountId);

        // Populate category dropdown with grouped categories
        this.populateCategoryDropdown('editTransactionCategory', transaction);

        // Handle entity-specific fields
        this.handleEntitySpecificFields(transaction);

        // Show confidence indicator if available
        this.showConfidenceIndicator(transaction);
    }

    populateAccountDropdown(selectId, selectedValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '';

        Object.entries(window.AppConfig?.ACCOUNT_MAPPING || {}).forEach(([id, data]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${id} - ${data.name}`;
            if (id === selectedValue) option.selected = true;
            select.appendChild(option);
        });
    }

    populateCategoryDropdown(selectId, transaction) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options
        select.innerHTML = '<option value="">Select Category...</option>';

        // Get entity for filtering
        const entity = this.categoryManager.getAccountEntity(transaction.accountId);
        const groupedCategories = this.categoryManager.getCategoriesForDropdown();

        // Add grouped options
        Object.entries(groupedCategories).forEach(([categoryName, subcategories]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoryName;

            subcategories.forEach(subcat => {
                // Filter by entity relevance
                if (subcat.entity === entity || subcat.entity === 'All' || !entity) {
                    const option = document.createElement('option');
                    option.value = subcat.id;
                    option.textContent = subcat.subcategory;
                    option.dataset.category = subcat.category;
                    option.dataset.entity = subcat.entity;
                    option.dataset.taxCategory = subcat.taxCategory;

                    if (transaction.category === subcat.category && transaction.subcategory === subcat.subcategory) {
                        option.selected = true;
                    }

                    optgroup.appendChild(option);
                }
            });

            if (optgroup.children.length > 0) {
                select.appendChild(optgroup);
            }
        });

        // Add "Add New Category" option
        const addNewOption = document.createElement('option');
        addNewOption.value = 'ADD_NEW';
        addNewOption.textContent = '+ Add New Category';
        addNewOption.style.fontStyle = 'italic';
        select.appendChild(addNewOption);
    }

    handleCategoryChange(e) {
        const select = e.target;
        const selectedOption = select.selectedOptions[0];

        if (select.value === 'ADD_NEW') {
            this.showQuickCategoryAdd();
            return;
        }

        if (selectedOption) {
            const categoryData = {
                category: selectedOption.dataset.category,
                subcategory: selectedOption.textContent,
                entity: selectedOption.dataset.entity,
                taxCategory: selectedOption.dataset.taxCategory
            };

            // Update entity-specific fields
            this.handleEntitySpecificFields(categoryData);
        }
    }

    handleEntitySpecificFields(transaction) {
        const isRealEstate = transaction.entity === 'Real Estate';
        const isTransfer = transaction.category === 'Transfers';

        // Show/hide property selector for real estate
        const propertyDiv = document.getElementById('editPropertyDiv');
        if (propertyDiv) {
            propertyDiv.classList.toggle('hidden', !isRealEstate);
            if (isRealEstate) {
                this.populatePropertyDropdown('editTransactionProperty', transaction.property);
            }
        }

        // Show/hide transfer fields
        const transferDiv = document.getElementById('editTransferDiv');
        if (transferDiv) {
            transferDiv.classList.toggle('hidden', !isTransfer);
        }

        // Update tax category indicator
        const taxIndicator = document.getElementById('taxCategoryIndicator');
        if (taxIndicator && transaction.taxCategory) {
            taxIndicator.textContent = `Tax: ${transaction.taxCategory}`;
            taxIndicator.className = `text-xs px-2 py-1 rounded ${this.getTaxCategoryColor(transaction.taxCategory)}`;
        }
    }

    populatePropertyDropdown(selectId, selectedValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Select Property...</option>';

        this.properties.forEach(property => {
            const option = document.createElement('option');
            option.value = property.id;
            option.textContent = property.nickname || property.address;
            if (property.id === selectedValue) option.selected = true;
            select.appendChild(option);
        });

        // Add "Add New Property" option
        const addNewOption = document.createElement('option');
        addNewOption.value = 'ADD_NEW';
        addNewOption.textContent = '+ Add New Property';
        addNewOption.style.fontStyle = 'italic';
        select.appendChild(addNewOption);
    }

    getTaxCategoryColor(taxCategory) {
        const colors = {
            'Schedule_E': 'bg-green-100 text-green-800',
            'Schedule_C': 'bg-blue-100 text-blue-800',
            'Schedule_D': 'bg-purple-100 text-purple-800',
            'Personal': 'bg-gray-100 text-gray-800',
            'Exclude': 'bg-red-100 text-red-800'
        };
        return colors[taxCategory] || 'bg-gray-100 text-gray-800';
    }

    showConfidenceIndicator(transaction) {
        const indicator = document.getElementById('confidenceIndicator');
        if (!indicator || !transaction.confidence) return;

        const confidence = transaction.confidence * 100;
        const color = confidence >= 80 ? 'green' : confidence >= 60 ? 'yellow' : 'red';
        const method = transaction.method || 'manual';

        indicator.innerHTML = `
            <div class="flex items-center space-x-2 text-sm">
                <span class="px-2 py-1 rounded-full bg-${color}-100 text-${color}-800">
                    ${confidence.toFixed(0)}% confident
                </span>
                <span class="text-gray-500">${method}</span>
            </div>
        `;
    }

    showQuickCategoryAdd() {
        const modal = document.getElementById('quickCategoryModal');
        if (!modal) {
            this.createQuickCategoryModal();
        }

        // Pre-fill with current transaction context
        if (this.currentTransaction) {
            const entity = this.categoryManager.getAccountEntity(this.currentTransaction.accountId);
            document.getElementById('quickCategoryEntity').value = entity;

            // Suggest category based on description
            const suggestion = this.suggestCategoryFromDescription(this.currentTransaction.description);
            if (suggestion) {
                document.getElementById('quickCategoryName').value = suggestion.category;
                document.getElementById('quickSubcategoryName').value = suggestion.subcategory;
            }
        }

        document.getElementById('quickCategoryModal').classList.remove('hidden');
    }

    createQuickCategoryModal() {
        const modalHTML = `
            <div id="quickCategoryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 class="text-lg font-semibold mb-4">Add New Category</h3>

                    <form id="quickCategoryForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Category</label>
                            <input type="text" id="quickCategoryName" class="w-full p-2 border rounded"
                                   placeholder="e.g., Utilities, Maintenance" required>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Subcategory</label>
                            <input type="text" id="quickSubcategoryName" class="w-full p-2 border rounded"
                                   placeholder="e.g., Electric, Plumbing" required>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Entity</label>
                            <select id="quickCategoryEntity" class="w-full p-2 border rounded" required>
                                <option value="Real Estate">Real Estate</option>
                                <option value="Tech Business">Tech Business</option>
                                <option value="Personal">Personal</option>
                                <option value="All">All</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Auto-Tag Keywords (comma separated)</label>
                            <input type="text" id="quickCategoryKeywords" class="w-full p-2 border rounded"
                                   placeholder="keyword1, keyword2, keyword3">
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Tax Category</label>
                            <select id="quickCategoryTax" class="w-full p-2 border rounded">
                                <option value="Schedule_E">Schedule E (Real Estate)</option>
                                <option value="Schedule_C">Schedule C (Business)</option>
                                <option value="Personal">Personal</option>
                                <option value="Exclude">Exclude (Transfers)</option>
                            </select>
                        </div>

                        <div class="flex space-x-2 pt-4">
                            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                Add Category
                            </button>
                            <button type="button" onclick="this.closeQuickCategoryModal()"
                                    class="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listener
        document.getElementById('quickCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickCategoryAdd();
        });
    }

    handleQuickCategoryAdd() {
        const formData = {
            category: document.getElementById('quickCategoryName').value,
            subcategory: document.getElementById('quickSubcategoryName').value,
            entity: document.getElementById('quickCategoryEntity').value,
            autoTagKeywords: document.getElementById('quickCategoryKeywords').value
                .split(',').map(k => k.trim()).filter(k => k),
            taxCategory: document.getElementById('quickCategoryTax').value,
            description: `User-created category for ${document.getElementById('quickSubcategoryName').value}`
        };

        const newCategory = this.categoryManager.addCategory(formData);

        // Refresh the category dropdown
        this.populateCategoryDropdown('editTransactionCategory', this.currentTransaction);

        // Select the newly created category
        const select = document.getElementById('editTransactionCategory');
        select.value = newCategory.id;

        // Trigger change event
        this.handleCategoryChange({ target: select });

        this.closeQuickCategoryModal();

        if (this.app.showNotification) {
            this.app.showNotification('Category added successfully!', 'success');
        }
    }

    closeQuickCategoryModal() {
        document.getElementById('quickCategoryModal').classList.add('hidden');
    }

    suggestCategoryFromDescription(description) {
        const desc = description.toLowerCase();

        // Simple keyword-based suggestions
        if (desc.includes('electric') || desc.includes('power')) {
            return { category: 'Utilities', subcategory: 'Electric' };
        }
        if (desc.includes('water') || desc.includes('sewer')) {
            return { category: 'Utilities', subcategory: 'Water/Sewer' };
        }
        if (desc.includes('internet') || desc.includes('cable')) {
            return { category: 'Utilities', subcategory: 'Internet/Cable' };
        }
        if (desc.includes('insurance')) {
            return { category: 'Insurance', subcategory: 'Property Insurance' };
        }
        if (desc.includes('repair') || desc.includes('maintenance')) {
            return { category: 'Maintenance', subcategory: 'General Repairs' };
        }

        return null;
    }

    showAddPropertyModal() {
        const modal = document.getElementById('addPropertyModal');
        if (!modal) {
            this.createAddPropertyModal();
        }
        modal.classList.remove('hidden');
    }

    createAddPropertyModal() {
        const modalHTML = `
            <div id="addPropertyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 class="text-lg font-semibold mb-4">Add New Property</h3>

                    <form id="addPropertyForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Property Address</label>
                            <input type="text" id="propertyAddress" class="w-full p-2 border rounded"
                                   placeholder="e.g., 123 Main Street" required>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Nickname (optional)</label>
                            <input type="text" id="propertyNickname" class="w-full p-2 border rounded"
                                   placeholder="e.g., Main St Property">
                        </div>

                        <div class="flex space-x-2 pt-4">
                            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                Add Property
                            </button>
                            <button type="button" onclick="this.closeAddPropertyModal()"
                                    class="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('addPropertyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddProperty();
        });
    }

    handleAddProperty() {
        const address = document.getElementById('propertyAddress').value;
        const nickname = document.getElementById('propertyNickname').value || address;

        const newProperty = {
            id: 'prop_' + Math.random().toString(36).substr(2, 9),
            address: address,
            nickname: nickname,
            createdAt: new Date().toISOString()
        };

        this.properties.push(newProperty);
        localStorage.setItem('property_list', JSON.stringify(this.properties));

        // Refresh property dropdown
        this.populatePropertyDropdown('editTransactionProperty', newProperty.id);

        this.closeAddPropertyModal();

        if (this.app.showNotification) {
            this.app.showNotification('Property added successfully!', 'success');
        }
    }

    closeAddPropertyModal() {
        document.getElementById('addPropertyModal').classList.add('hidden');
    }

    createCategoryManagementModal() {
        // This would open the full category management interface
        // For now, just show a placeholder
        console.log('Category management modal would open here');
    }

    showCategoryManagementModal() {
        if (this.app.showCategoryManager) {
            this.app.showCategoryManager();
        } else {
            alert('Category management feature coming soon!');
        }
    }

    showTransactionEditor() {
        document.getElementById('transactionEditor').classList.remove('hidden');
    }

    // Enhanced save method with validation
    async saveTransaction() {
        const formData = this.getFormData();

        if (!this.validateTransaction(formData)) {
            return;
        }

        try {
            if (formData.id) {
                await this.dataService.updateTransaction(formData.id, formData);
            } else {
                await this.dataService.saveTransaction(formData);
            }

            this.closeTransactionEditor();

            if (this.app.refreshDataAndViews) {
                await this.app.refreshDataAndViews();
            }

            if (this.app.showNotification) {
                this.app.showNotification('Transaction saved successfully!', 'success');
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            if (this.app.showNotification) {
                this.app.showNotification('Failed to save transaction.', 'error');
            }
        }
    }

    getFormData() {
        const selectedCategory = document.getElementById('editTransactionCategory').selectedOptions[0];

        return {
            id: document.getElementById('editTransactionId').value || null,
            date: document.getElementById('editTransactionDate').value,
            description: document.getElementById('editTransactionDescription').value,
            amount: parseFloat(document.getElementById('editTransactionAmount').value),
            accountId: document.getElementById('editTransactionAccount').value,
            category: selectedCategory?.dataset.category || '',
            subcategory: selectedCategory?.textContent || '',
            entity: selectedCategory?.dataset.entity || '',
            taxCategory: selectedCategory?.dataset.taxCategory || '',
            property: document.getElementById('editTransactionProperty')?.value || '',
            updatedAt: new Date().toISOString()
        };
    }

    validateTransaction(transaction) {
        if (!transaction.date || !transaction.description || !transaction.amount || !transaction.accountId) {
            if (this.app.showNotification) {
                this.app.showNotification('Please fill in all required fields.', 'error');
            }
            return false;
        }

        if (isNaN(transaction.amount)) {
            if (this.app.showNotification) {
                this.app.showNotification('Please enter a valid amount.', 'error');
            }
            return false;
        }

        return true;
    }

    closeTransactionEditor() {
        document.getElementById('transactionEditor').classList.add('hidden');
        this.currentTransaction = null;
    }
}

// Make globally available
window.EnhancedTransactionUI = EnhancedTransactionUI;
