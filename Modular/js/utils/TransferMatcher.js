export class TransferMatcher {
    static findTransferPairs(transactions) {
        const transfers = [];
        const matchedIndices = new Set();

        transactions.forEach((t1, i) => {
            if (matchedIndices.has(i)) return; // Skip if already matched

            // Look for a matching transfer
            const matchIndex = transactions.findIndex((t2, j) => {
                if (i >= j || matchedIndices.has(j)) return false; // Don't double-match or use already matched

                // Same day or within 1 day
                const daysDiff = Math.abs(new Date(t1.date) - new Date(t2.date)) / (1000 * 60 * 60 * 24);
                if (daysDiff > 1) return false;

                // Opposite amounts (within a small tolerance)
                if (Math.abs(t1.amount + t2.amount) > 0.01) return false;

                // Both should be categorized as transfers already for higher accuracy
                if (t1.category !== 'Transfer' || t2.category !== 'Transfer') {
                    // Looser check if not categorized: description must contain 'transfer'
                    if (!t1.description.toLowerCase().includes('transfer') || !t2.description.toLowerCase().includes('transfer')) {
                        return false;
                    }
                }

                return true;
            });

            if (matchIndex !== -1) {
                const match = transactions[matchIndex];
                const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                t1.transferId = transferId;
                match.transferId = transferId;

                // Mark both as matched
                matchedIndices.add(i);
                matchedIndices.add(matchIndex);

                transfers.push([t1, match]);
            }
        });

        return transfers;
    }
}
