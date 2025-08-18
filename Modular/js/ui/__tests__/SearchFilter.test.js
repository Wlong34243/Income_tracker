import { SearchFilter } from '../SearchFilter.js';

// Mock DataService
const mockDataService = {
    loadAccounts: async () => [
        { accountId: '1', name: 'Account 1' },
        { accountId: '2', name: 'Account 2' },
    ],
};

const transactions = [
    { id: 1, description: 'Rent payment', amount: -1200, category: 'Real Estate', entity: 'Real Estate', accountId: '1', date: '2023-10-26' },
    { id: 2, description: 'Client payment', amount: 2500, category: 'Tech Business Income', entity: 'Tech Business', accountId: '2', date: '2023-10-25' },
    { id: 3, description: 'Groceries', amount: -75, category: 'Food', entity: 'Personal', accountId: '1', date: '2023-10-24' },
    { id: 4, description: 'Transfer to savings', amount: -500, category: 'Transfer', entity: 'Transfer', accountId: '1', date: '2023-10-23' },
    { id: 5, description: 'Consulting fee', amount: 1500, category: 'Tech Business Income', entity: 'Tech Business', accountId: '2', date: '2023-10-22' },
];

describe('SearchFilter', () => {
    let searchFilter;

    beforeEach(() => {
        searchFilter = new SearchFilter(mockDataService);
    });

    test('should filter by search term "rent"', () => {
        searchFilter.currentFilters.searchTerm = 'rent';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].description).toBe('Rent payment');
    });

    test('should filter by amount ">1000"', () => {
        searchFilter.currentFilters.searchTerm = '>1000';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(2);
        expect(filtered.every(t => t.amount > 1000)).toBe(true);
    });

    test('should filter by amount "<0"', () => {
        searchFilter.currentFilters.searchTerm = '<0';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(3);
        expect(filtered.every(t => t.amount < 0)).toBe(true);
    });

    test('should filter by entity "Tech Business"', () => {
        searchFilter.currentFilters.entity = 'Tech Business';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(2);
        expect(filtered.every(t => t.entity === 'Tech Business')).toBe(true);
    });

    test('should filter by category "Transfer"', () => {
        searchFilter.currentFilters.category = 'Transfer';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].category).toBe('Transfer');
    });

    test('should hide transfers', () => {
        searchFilter.currentFilters.showTransfers = false;
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(4);
        expect(filtered.some(t => t.category === 'Transfer')).toBe(false);
    });

    test('should filter by account', () => {
        searchFilter.currentFilters.account = '1';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(3);
        expect(filtered.every(t => t.accountId === '1')).toBe(true);
    });

    test('should filter by date range', () => {
        searchFilter.currentFilters.dateFrom = '2023-10-24';
        searchFilter.currentFilters.dateTo = '2023-10-25';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(2);
    });

    test('should filter by amount range', () => {
        searchFilter.currentFilters.amountMin = -100;
        searchFilter.currentFilters.amountMax = 0;
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].description).toBe('Groceries');
    });

    test('should combine multiple filters', () => {
        searchFilter.currentFilters.entity = 'Tech Business';
        searchFilter.currentFilters.searchTerm = '>2000';
        const filtered = searchFilter.filterTransactions(transactions);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].description).toBe('Client payment');
    });
});
