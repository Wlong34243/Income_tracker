// js/import/DuplicateDetector.js
export class DuplicateDetector {
    constructor(dataService) {
        this.dataService = dataService;
    }

    async findDuplicateTransactions(transactionsToCheck) {
        const duplicates = [];
        const unique = [];

        // Get existing transactions for comparison
        const existingTransactions = await this.dataService.loadTransactions();

        for (const trans of transactionsToCheck) {
            // Create a date range for comparison (±1 day)
            const dateMin = new Date(trans.date);
            const dateMax = new Date(trans.date);
            dateMin.setDate(dateMin.getDate() - 1);
            dateMax.setDate(dateMax.getDate() + 1);

            // Check existing transactions
            const isDuplicate = existingTransactions.some(existing => {
                const existingDate = new Date(existing.date.seconds ? existing.date.seconds * 1000 : existing.date);
                return (
                    existing.description.toLowerCase() === trans.description.toLowerCase() &&
                    Math.abs(existing.amount - trans.amount) < 0.01 &&
                    existingDate >= dateMin &&
                    existingDate <= dateMax
                );
            });

            if (isDuplicate) {
                duplicates.push(trans);
            } else {
                unique.push(trans);
            }
        }

        return { duplicates, unique };
    }
}
