// js/ui/ImportSummaryModal.js
export class ImportSummaryModal {

    showImportSummary(results, duplicates) {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = `
            <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold">Import Complete</h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-3 bg-green-50 rounded">
                                <span class="text-green-800">Successfully Imported</span>
                                <span class="font-bold text-green-600">${results.success}</span>
                            </div>
                            ${results.skipped > 0 ? `
                                <div class="flex items-center justify-between p-3 bg-yellow-50 rounded">
                                    <span class="text-yellow-800">Skipped (No Account)</span>
                                    <span class="font-bold text-yellow-600">${results.skipped}</span>
                                </div>
                            ` : ''}
                            ${duplicates.length > 0 ? `
                                <div class="flex items-center justify-between p-3 bg-blue-50 rounded">
                                    <span class="text-blue-800">Duplicates Detected</span>
                                    <span class="font-bold text-blue-600">${duplicates.length}</span>
                                </div>
                            ` : ''}
                            ${results.failed > 0 ? `
                                <div class="flex items-center justify-between p-3 bg-red-50 rounded">
                                    <span class="text-red-800">Failed</span>
                                    <span class="font-bold text-red-600">${results.failed}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${duplicates.length > 0 ? `
                            <div class="mt-4 p-3 bg-gray-50 rounded">
                                <p class="text-sm text-gray-600 mb-2">Duplicate transactions were skipped:</p>
                                <div class="max-h-32 overflow-y-auto text-xs">
                                    ${duplicates.slice(0, 5).map(dup => `
                                        <div class="py-1">${dup.date.toLocaleDateString()} - ${dup.description} - ${this.formatCurrency(dup.amount)}</div>
                                    `).join('')}
                                    ${duplicates.length > 5 ? `<div class="py-1 text-gray-500">... and ${duplicates.length - 5} more</div>` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                        <button onclick="this.closeModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    closeModal() {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = '';
    }
}
