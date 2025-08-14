export class BulkActions {
   static async categorizeMultiple(transactions, category, subcategory, entity, dataService) {
       const batch = [];
       for (const tx of transactions) {
           batch.push({
               id: tx.id,
               category,
               subcategory,
               entity
           });
       }
       // Update all at once
       return await dataService.updateTransactionBatch(batch);
   }
}
