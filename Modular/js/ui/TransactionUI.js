// js/ui/TransactionUI.js
// Manages all transaction-related modals and UI panels.

import { AppConfig } from '../config/AppConfig.js';

export class TransactionUI {
    constructor(dataService, app) { // Ensure constructor accepts dataService and app
        this.dataService = dataService;
        this.app = app; // Reference to the main app instance for refreshing data
        this.initialize();
    }

    initialize() {
        this.populateAllDropdowns();
        this.attachEventListeners();
        this.attachTransactionListeners(); // Call the new method to attach listeners for edit/delete
        // Set today's date as default on transaction modal open, not on init
        // document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0]; 
    }

    populateAllDropdowns() {
        // Populate account dropdowns from AppConfig
        // Ensure AppConfig.ACCOUNT_MAPPING exists and is structured correctly
        const accounts = Object.entries(AppConfig.ACCOUNT_MAPPING || {}).map(([id, data]) => ({ id, name: `${id} - ${data.name}` }));
        this.populateSelectWithOptions('transactionAccount', accounts);
        this.populateSelectWithOptions('transferAccount', accounts);
        this.populateSelectWithOptions('balanceAccount', accounts);

        // Populate category dropdowns from AppConfig
        // Ensure AppConfig.CATEGORIES exists and is structured correctly
        const categories = Object.keys(AppConfig.CATEGORIES || {});
        this.populateSelectWithOptions('transactionCategory', categories.map(c => ({ id: c, name: c })));
        this.populateSelectWithOptions('editCategory', categories.map(c => ({ id: c, name: c })));

        // Populate property dropdowns
        // Ensure AppConfig.PROPERTY_MAPPINGS exists or provide a default list
        const properties = Object.keys(AppConfig.PROPERTY_MAPPINGS || {}); // Use AppConfig for properties too
        if (properties.length === 0) { // Fallback if AppConfig.PROPERTY_MAPPINGS is empty
            const defaultProperties = ["5th St", "50th St", "37th St", "2nd St", "36th St", "59th St", "Las Palmas", "9th Street", "61st Street"];
            this.populateSelectWithOptions('transactionProperty', defaultProperties.map(p => ({ id: p, name: p })));
            this.populateSelectWithOptions('editProperty', defaultProperties.map(p => ({ id: p, name: p })));
        } else {
            this.populateSelectWithOptions('transactionProperty', properties.map(p => ({ id: p, name: p })));
            this.populateSelectWithOptions('editProperty', properties.map(p => ({ id: p, name: p })));
        }
    }

    populateSelectWithOptions(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Save the first option (placeholder) if it exists, then clear
        const firstOption = select.options.length > 0 ? select.options[0] : null;
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        } else {
            // Add a default placeholder if none exists
            const defaultPlaceholder = document.createElement('option');
            defaultPlaceholder.value = "";
            defaultPlaceholder.textContent = `Select ${selectId.replace('transaction', '').replace('edit', '').replace('balance', '').replace('transfer', '')}`;
            select.appendChild(defaultPlaceholder);
        }

        // Add new options
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.id;
            option.textContent = opt.name;
            select.appendChild(option);
        });
    }

    attachEventListeners() {
        document.getElementById('transactionForm')?.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.getElementById('accountBalanceForm')?.addEventListener('submit', (e) => this.handleAccountBalanceSubmit(e));
        document.getElementById('editTransactionForm')?.addEventListener('submit', (e) => this.handleEditTransactionSubmit(e));
        document.getElementById('transactionCategory')?.addEventListener('change', (e) => this.handleCategoryChange(e));
        document.getElementById('isTransfer')?.addEventListener('change', () => this.toggleTransferAccount());

        // Close modals on backdrop click - moved from Modal.js to TransactionUI.js
        // If Modal.js handles this, remove this block to avoid duplication
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    // Find the parent modal element and hide it
                    const modalElement = backdrop.closest('.fixed.inset-0');
                    if (modalElement) {
                        modalElement.classList.add('hidden');
                        // Optionally reset form if it's a form modal
                        const form = modalElement.querySelector('form');
                        if (form) form.reset();
                    }
                }
            });
        });
    }

    // Add this method to TransactionUI class
    attachTransactionListeners() {
        // Use event delegation for dynamically added buttons
        document.addEventListener('click', async (e) => {
            // Edit button handler
            if (e.target.classList.contains('edit-transaction-btn')) {
                const transactionId = e.target.dataset.transactionId;
                // Fetch the full transaction object before opening the editor
                const transaction = await this.dataService.getTransactionById(transactionId);
                if (transaction) {
                    this.openTransactionEditor(transaction);
                } else {
                    this.app.showNotification('Could not find transaction data.', 'error');
                }
            }
            
            // Delete button handler
            if (e.target.classList.contains('delete-transaction-btn')) {
                const transactionId = e.target.dataset.transactionId;
                this.deleteTransaction(transactionId);
            }
        });
    }

    async handleTransactionSubmit(e) {
        e.preventDefault();
        try {
            const formData = {
                date: new Date(document.getElementById('transactionDate').value).toISOString(),
                amount: parseFloat(document.getElementById('transactionAmount').value),
                description: document.getElementById('transactionDescription').value,
                accountId: document.getElementById('transactionAccount').value,
                category: document.getElementById('transactionCategory').value,
                property: document.getElementById('transactionProperty').value || null,
                notes: '' // Add notes field if you have one
            };

            // Handle transfer logic
            const isTransfer = document.getElementById('isTransfer').checked;
            const transferAccount = document.getElementById('transferAccount').value;

            if (isTransfer && transferAccount) {
                // Outgoing transaction (negative amount)
                await this.dataService.saveTransaction({
                    ...formData,
                    amount: -Math.abs(formData.amount), // Ensure negative for outgoing
                    type: 'Transfer',
                    // entity: this.app.getEntityForAccount(formData.accountId) // Assuming app has this helper
                });

                // Incoming transaction (positive amount)
                await this.dataService.saveTransaction({
                    ...formData,
                    accountId: transferAccount,
                    amount: Math.abs(formData.amount), // Ensure positive for incoming
                    description: `Transfer from ${formData.accountId}: ${formData.description}`,
                    type: 'Transfer',
                    // entity: this.app.getEntityForAccount(transferAccount) // Assuming app has this helper
                });
            } else {
                // Regular transaction
                await this.dataService.saveTransaction({
                    ...formData,
                    type: formData.amount > 0 ? 'Income' : 'Expense', // Determine type based on amount
                    // entity: this.app.getEntityForAccount(formData.accountId) // Assuming app has this helper
                });
            }

            this.app.showNotification('Transaction added successfully!', 'success');
            this.closeTransactionModal();
            // Assuming app has a method to refresh all data and views
            if (this.app.refreshDataAndViews) {
                this.app.refreshDataAndViews(); 
            } else {
                console.warn("App does not have 'refreshDataAndViews' method. UI might not update.");
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            this.app.showNotification('Failed to add transaction.', 'error');
        }
    }

    async handleAccountBalanceSubmit(e) {
        e.preventDefault();
        try {
            const accountId = document.getElementById('balanceAccount').value;
            const newBalance = parseFloat(document.getElementById('currentBalance').value);
            await this.dataService.updateAccountBalance(accountId, newBalance);
            this.app.showNotification('Account balance updated!', 'success');
            this.closeAccountModal();
            if (this.app.refreshDataAndViews) {
                this.app.refreshDataAndViews();
            } else {
                console.warn("App does not have 'refreshDataAndViews' method. UI might not update.");
            }
        } catch (error) {
            console.error('Error updating balance:', error);
            this.app.showNotification('Failed to update balance.', 'error');
        }
    }

    async handleEditTransactionSubmit(e) {
        e.preventDefault();
        try {
            const transactionId = document.getElementById('editTransactionId').value;
            const updates = {
                category: document.getElementById('editCategory').value,
                property: document.getElementById('editProperty').value || null,
                notes: document.getElementById('editNotes').value || ''
            };
            await this.dataService.updateTransaction(transactionId, updates);
            this.app.showNotification('Transaction updated successfully!', 'success');
            this.closeTransactionEditor();
            if (this.app.refreshDataAndViews) {
                this.app.refreshDataAndViews();
            } else {
                console.warn("App does not have 'refreshDataAndViews' method. UI might not update.");
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            this.app.showNotification('Failed to update transaction.', 'error');
        }
    }

    handleCategoryChange(e) {
        const isRealEstate = ['Real Estate Income', 'Property Expenses', 'Mortgage', 'Property Tax', 'Maintenance'].includes(e.target.value);
        document.getElementById('propertyDiv').classList.toggle('hidden', !isRealEstate);
        // If it's a transfer, ensure the transfer checkbox is checked and category is "Internal Transfer"
        if (e.target.value === 'Internal Transfer') {
            document.getElementById('isTransfer').checked = true;
            this.toggleTransferAccount();
        } else {
            document.getElementById('isTransfer').checked = false;
            this.toggleTransferAccount();
        }
    }

    toggleTransferAccount() {
        const isTransfer = document.getElementById('isTransfer').checked;
        document.getElementById('transferAccountDiv').classList.toggle('hidden', !isTransfer);
        if (isTransfer) {
            document.getElementById('transactionCategory').value = 'Internal Transfer';
        } else {
            // Reset category if it was set to 'Internal Transfer' and checkbox is unchecked
            if (document.getElementById('transactionCategory').value === 'Internal Transfer') {
                document.getElementById('transactionCategory').value = ''; // Or a default non-transfer category
            }
        }
    }

    // Modal control methods - these are now part of the class
    openTransactionModal() {
        document.getElementById('transactionModal').classList.remove('hidden');
        // Set today's date when opening the modal
        document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
        // Ensure dropdowns are populated when modal opens, in case data changed
        this.populateSelectWithOptions('transactionAccount', Object.entries(AppConfig.ACCOUNT_MAPPING || {}).map(([id, data]) => ({ id, name: `${id} - ${data.name}` })));
        this.populateSelectWithOptions('transactionCategory', Object.keys(AppConfig.CATEGORIES || {}).map(c => ({ id: c, name: c })));
        this.populateSelectWithOptions('transactionProperty', Object.keys(AppConfig.PROPERTY_MAPPINGS || {}).map(p => ({ id: p, name: p })));
        // Reset transfer fields
        document.getElementById('isTransfer').checked = false;
        this.toggleTransferAccount();
        document.getElementById('propertyDiv').classList.add('hidden'); // Hide property by default
    }

    closeTransactionModal() {
        document.getElementById('transactionModal').classList.add('hidden');
        document.getElementById('transactionForm').reset();
    }

    openAccountModal() {
        document.getElementById('accountBalanceModal').classList.remove('hidden');
         // Ensure dropdowns are populated when modal opens
        this.populateSelectWithOptions('balanceAccount', Object.entries(AppConfig.ACCOUNT_MAPPING || {}).map(([id, data]) => ({ id, name: `${id} - ${data.name}` })));
    }

    closeAccountModal() {
        document.getElementById('accountBalanceModal').classList.add('hidden');
        document.getElementById('accountBalanceForm').reset();
    }

    async openTransactionEditor(transaction) {
        document.getElementById('transactionEditor').classList.remove('hidden');
        if (transaction) {
            document.getElementById('editTransactionId').value = transaction.id;
            document.getElementById('originalDescription').textContent = transaction.description;
            this.populateSelectWithOptions('editCategory', Object.keys(AppConfig.CATEGORIES || {}).map(c => ({ id: c, name: c })));
            document.getElementById('editCategory').value = transaction.category || '';
            this.populateSelectWithOptions('editProperty', Object.keys(AppConfig.PROPERTY_MAPPINGS || {}).map(p => ({ id: p, name: p })));
            document.getElementById('editProperty').value = transaction.property || '';
            document.getElementById('editNotes').value = transaction.notes || '';
            
            // Show/hide property field based on category for editor
            const isRealEstate = ['Real Estate Income', 'Property Expenses', 'Mortgage', 'Property Tax', 'Maintenance'].includes(transaction.category);
            document.getElementById('editPropertyDiv').classList.toggle('hidden', !isRealEstate);
        }
    }

    closeTransactionEditor() {
        document.getElementById('transactionEditor').classList.add('hidden');
        document.getElementById('editTransactionForm').reset();
    }

    // Update the renderTransactionRow method to include data attributes
    renderTransactionRow(transaction) {
        return `
            <tr>
                <td class="px-6 py-4">${new Date(transaction.date).toLocaleDateString()}</td>
                <td class="px-6 py-4">${transaction.description}</td>
                <td class="px-6 py-4">${transaction.category}</td>
                <td class="px-6 py-4">${transaction.amount}</td>
                <td class="px-6 py-4">
                    <button class="edit-transaction-btn text-blue-600 hover:text-blue-800" 
                            data-transaction-id="${transaction.id}">
                        Edit
                    </button>
                    <button class="delete-transaction-btn text-red-600 hover:text-red-800 ml-2" 
                            data-transaction-id="${transaction.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }

    // Add delete transaction method
    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }
        
        try {
            await this.dataService.deleteTransaction(transactionId);
            this.app.showNotification('Transaction deleted', 'success');
            await this.app.refreshDataAndViews();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.app.showNotification('Failed to delete transaction', 'error');
        }
    }
}