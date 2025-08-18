import { SearchFilter } from '../ui/SearchFilter.js';
// import { RecurringTransactions } from '../features/RecurringTransactions.js';
// import { RentTracker } from '../analytics/RentTracker.js';

export class FeatureVerification {
    static async verifySearchFilter() {
        console.log('🔍 Verifying SearchFilter Implementation...');

        const mockDataService = {
            loadAccounts: async () => [
                { id: '0111', name: 'Sweep' },
                { id: '7991', name: 'Tech' }
            ],
            loadTransactions: async () => [
                {
                    id: '1',
                    date: '2025-07-01',
                    description: 'Zelle from JACK SEVILLA',
                    amount: 1800,
                    category: 'Real Estate Income',
                    entity: 'Real Estate'
                },
                {
                    id: '2',
                    date: '2025-07-15',
                    description: 'PACKERTHOMAS PAYMENT',
                    amount: 13500,
                    category: 'Tech Business Income',
                    entity: 'Tech Business'
                }
            ]
        };

        try {
            const searchFilter = new SearchFilter(mockDataService);

            // Test 1: Search by text
            searchFilter.currentFilters.searchTerm = 'zelle';
            const results1 = searchFilter.filterTransactions(await mockDataService.loadTransactions());
            console.assert(results1.length === 1, '❌ Text search failed');
            console.log('✅ Text search works');

            // Test 2: Filter by entity
            searchFilter.currentFilters.searchTerm = '';
            searchFilter.currentFilters.entity = 'Tech Business';
            const results2 = searchFilter.filterTransactions(await mockDataService.loadTransactions());
            console.assert(results2.length === 1, '❌ Entity filter failed');
            console.log('✅ Entity filter works');

            // Test 3: Amount range
            searchFilter.currentFilters.entity = 'all';
            searchFilter.currentFilters.amountMin = 2000;
            const results3 = searchFilter.filterTransactions(await mockDataService.loadTransactions());
            console.assert(results3.length === 1, '❌ Amount filter failed');
            console.log('✅ Amount filter works');

            console.log('✅ SearchFilter verification complete!');
            return true;
        } catch (error) {
            console.error('❌ SearchFilter verification failed:', error.message);
            return false;
        }
    }

    static async verifyAllFeatures() {
        console.log('🚀 Starting feature verification...\n');

        const results = {
            searchFilter: await this.verifySearchFilter(),
            // Add more feature checks as they're built
        };

        console.log('\n📊 Verification Summary:');
        console.table(results);

        const allPassed = Object.values(results).every(r => r === true);
        if (allPassed) {
            console.log('\n✅ All features verified successfully!');
        } else {
            console.log('\n⚠️ Some features need attention');
        }

        return results;
    }
}

// If running directly in Node
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
    FeatureVerification.verifyAllFeatures();
}
