export class QuickActions {
    static render() {
        return `
            <div class="fixed bottom-4 right-4 z-40">
                <div id="quick-actions-menu" class="hidden flex-col gap-2 mb-2">
                    <button onclick="window.app.uiManager.quickAddRent()" class="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700">
                        + Add Rent Payment
                    </button>
                    <button onclick="window.app.uiManager.quickAddExpense()" class="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700">
                        + Add Expense
                    </button>
                    <button onclick="window.app.uiManager.checkRentStatus()" class="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700">
                        Check Rent Status
                    </button>
                </div>
                <button id="quick-actions-toggle" class="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </button>
            </div>
        `;
    }
}
