// Enhanced Transaction Editor - Integration with Category Manager (Refactored)
// File: js/ui/EnhancedTransactionUI.js

import { sanitizeHTML } from '../utils/Sanitizer.js';

export class EnhancedTransactionUI {
    constructor(services) {
        this.services = services; // { dataService, categoryManager, appController, appConfig }
        this.app = services.appController; // for callbacks
        this.categoryManager = services.categoryManager;
        this.dataService = services.dataService;

        this.currentTransaction = null;
        this.properties = this.loadProperties();
        this.elements = {}; // To store DOM elements
    }

    // This method is called by UIManager to inject the main editor panel
    renderEditPanel(container) {
        const editorHTML = `
            <div id="transactionEditor" class="hidden fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 overflow-y-auto slide-in">
                <div class="sticky top-0 bg-white border-b p-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900">Edit Transaction</h3>
                        <button id="closeEditorBtn" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>
                <form id="editTransactionForm" class="p-4 space-y-4">
                    <input type="hidden" id="editTransactionId">
                    <!-- Form content will be populated dynamically -->
                </form>
            </div>
        `;
        container.innerHTML = editorHTML;
        this.elements.editorPanel = document.getElementById('transactionEditor');
        this.elements.editorForm = document.getElementById('editTransactionForm');

        document.getElementById('closeEditorBtn').addEventListener('click', () => this.closeEditPanel());
        this.elements.editorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpdateTransaction();
        });
    }

    // This method is called by UIManager to inject the add modal
    renderAddModal(container) {
        const modalHTML = `
            <div id="addTransactionModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div class="flex items-center justify-between p-4 border-b">
                            <h3 class="text-lg font-semibold text-gray-900">Add Transaction</h3>
                            <button id="closeAddModalBtn" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form id="addTransactionForm" class="p-4 space-y-4">
                            <!-- Form content here -->
                        </form>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = modalHTML;
        this.elements.addModal = document.getElementById('addTransactionModal');
        this.elements.addForm = document.getElementById('addTransactionForm');

        document.getElementById('closeAddModalBtn').addEventListener('click', () => this.closeAddModal());
        this.elements.addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddNewTransaction();
        });
    }

    openAddModal(accounts) {
        this.populateAddForm(accounts);
        this.elements.addModal.classList.remove('hidden');
    }

    closeAddModal() {
        this.elements.addModal.classList.add('hidden');
    }

    populateAddForm(accounts) {
        this.elements.addForm.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium">Date</label><input type="date" name="date" required class="w-full p-2 border rounded"></div>
                <div><label class="block text-sm font-medium">Amount</label><input type="number" name="amount" step="0.01" required placeholder="0.00" class="w-full p-2 border rounded"></div>
            </div>
            <div><label class="block text-sm font-medium">Description</label><input type="text" name="description" required class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm font-medium">Account</label><select name="accountId" required class="w-full p-2 border rounded"></select></div>
            <div class="flex justify-end space-x-2">
                <button type="button" id="cancelAddBtn" class="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
            </div>
        `;

        const accountSelect = this.elements.addForm.querySelector('select[name="accountId"]');
        accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = acc.name;
            accountSelect.appendChild(option);
        });

        this.elements.addForm.querySelector('#cancelAddBtn').addEventListener('click', () => this.closeAddModal());
        this.elements.addForm.querySelector('input[name="date"]').value = new Date().toISOString().split('T')[0];
    }

    async handleAddNewTransaction() {
        const form = this.elements.addForm;
        const data = {
            date: form.date.value,
            amount: parseFloat(form.amount.value),
            description: form.description.value,
            accountId: form.accountId.value,
        };

        // Auto-categorize before saving
        const categoryData = this.categoryManager.categorizeTransaction(data);
        const finalData = { ...data, ...categoryData };

        await this.app.addTransaction(finalData);
        this.closeAddModal();
    }


    openEditPanel(transaction) {
        this.currentTransaction = transaction;
        this.populateEditForm(transaction);
        this.elements.editorPanel.classList.remove('hidden');
    }

    closeEditPanel() {
        this.elements.editorPanel.classList.add('hidden');
        this.currentTransaction = null;
    }

    populateEditForm(transaction) {
        const form = this.elements.editorForm;
        const safeDescription = sanitizeHTML(transaction.description);

        form.innerHTML = `
            <input type="hidden" name="id" value="${transaction.id}">
            <div class="bg-gray-100 p-2 rounded"><strong>Original:</strong> ${safeDescription}</div>
            <div><label class="block text-sm">Date</label><input type="date" name="date" value="${transaction.date}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm">Description</label><input type="text" name="description" value="${safeDescription}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm">Amount</label><input type="number" name="amount" value="${transaction.amount}" class="w-full p-2 border rounded"></div>
            <div><label class="block text-sm">Category</label><select name="categoryId" class="w-full p-2 border rounded"></select></div>
            <div class="flex justify-end space-x-2">
                <button type="button" id="cancelEditBtn" class="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
        `;

        this.populateCategoryDropdown(form.querySelector('select[name="categoryId"]'), transaction);
        form.querySelector('#cancelEditBtn').addEventListener('click', () => this.closeEditPanel());
    }

    populateCategoryDropdown(select, transaction) {
        select.innerHTML = '<option value="">Select Category...</option>';
        const groupedCategories = this.categoryManager.getCategoriesForDropdown();

        Object.entries(groupedCategories).forEach(([categoryName, subcategories]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoryName;

            subcategories.forEach(subcat => {
                const option = document.createElement('option');
                option.value = subcat.id;
                option.textContent = subcat.subcategory;
                option.dataset.category = subcat.category;
                option.dataset.entity = subcat.entity;

                if (transaction.category === subcat.category && transaction.subcategory === subcat.subcategory) {
                    option.selected = true;
                }
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        });
    }

    async handleUpdateTransaction() {
        const form = this.elements.editorForm;
        const categorySelect = form.querySelector('select[name="categoryId"]');
        const selectedOption = categorySelect.selectedOptions[0];

        const data = {
            id: form.id.value,
            date: form.date.value,
            description: form.description.value,
            amount: parseFloat(form.amount.value),
            category: selectedOption.dataset.category,
            subcategory: selectedOption.textContent,
            entity: selectedOption.dataset.entity,
        };

        await this.app.updateTransaction(data);
        this.closeEditPanel();
    }

    loadProperties() {
        const stored = localStorage.getItem('property_list');
        return stored ? JSON.parse(stored) : [];
    }
}
