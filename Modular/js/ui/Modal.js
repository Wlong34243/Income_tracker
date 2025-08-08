// js/ui/Modal.js
// Modal and UI Panel Management System

export class Modal {
    constructor(app) {
        this.app = app; // Reference to the main app to access data
        this.currentModal = null;
        this.currentEditor = null;
        this.initialize();
    }

    initialize() {
        // Close modals on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.close(backdrop.parentElement.id);
                }
            });
        });
    }

    show(modalId, config = {}) {
        this.closeAll(); // Close any existing modal or panel
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('Modal not found:', modalId);
            return;
        }

        modal.classList.remove('hidden');
        this.currentModal = modalId;

        // Populate dynamic content if needed
        if (modalId === 'transactionModal') {
            this.populateSelect('transactionAccount', this.app.accounts.map(a => ({ value: a.id, text: a.name })));
            document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
        }
    }

    showEditor(editorId, data = null) {
        this.closeAll();
        const editor = document.getElementById(editorId);
        if (!editor) return;

        editor.classList.remove('hidden');
        this.currentEditor = editorId;

        if (editorId === 'transactionEditor' && data) {
            // Pre-fill the editor form with transaction data
            document.getElementById('editTransactionId').value = data.id;
            document.getElementById('originalDescription').textContent = data.description;
            document.getElementById('editCategory').value = data.category || '';
            document.getElementById('editProperty').value = data.property || '';
            document.getElementById('editNotes').value = data.notes || '';
        }
    }

    close(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
            const form = element.querySelector('form');
            if (form) form.reset();
        }
        if (id === this.currentModal) this.currentModal = null;
        if (id === this.currentEditor) this.currentEditor = null;
    }

    closeAll() {
        if (this.currentModal) this.close(this.currentModal);
        if (this.currentEditor) this.close(this.currentEditor);
    }

    populateSelect(elementId, options) {
        const select = document.getElementById(elementId);
        if (!select) return;
        
        // Clear existing options except the first one (placeholder)
        while (select.options.length > 1) {
            select.remove(1);
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            select.appendChild(opt);
        });
    }
}