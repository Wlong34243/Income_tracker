// js/import/BulkImporter.js
export class BulkImporter {
    constructor(dataService) {
        this.dataService = dataService;
    }

    async bulkImportTransactions(transactions) {
        const total = transactions.length;
        let processed = 0;
        const results = { success: 0, failed: 0, skipped: 0 };

        // Process in batches to avoid overwhelming Firestore
        const batchSize = 50;
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);

            await Promise.all(batch.map(async (trans) => {
                try {
                    // Skip if no account selected
                    if (!trans.accountId) {
                        results.skipped++;
                        return;
                    }

                    // Get account entity
                    const account = accounts.find(a => a.id === trans.accountId);

                    await addDoc(collection(db, 'transactions'), {
                        description: trans.description,
                        amount: trans.amount,
                        type: trans.type,
                        date: trans.date,
                        accountId: trans.accountId,
                        category: trans.category,
                        entity: account?.entity || trans.entity,
                        userId: currentUser.uid,
                        status: 'imported',
                        createdAt: serverTimestamp(),
                        importedFrom: trans.sourceFile,
                        importDate: serverTimestamp()
                    });

                    results.success++;
                } catch (error) {
                    console.error('Failed to import transaction:', error);
                    results.failed++;
                }

                processed++;
                this.updateImportProgress((processed / total) * 100, `Importing... ${processed}/${total}`);
            }));
        }

        return results;
    }

    updateImportProgress(percent, message) {
        // Emit progress event or call callback
        if (this.onProgress) {
            this.onProgress(percent, message);
        }
    }
}
