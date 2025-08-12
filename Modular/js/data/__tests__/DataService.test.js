import { jest } from '@jest/globals';
import { DataService } from '../DataService.js';

// Mock the AppConfig dependency, as it's imported directly by DataService
jest.mock('../../config/AppConfig.js', () => ({
  AppConfig: {
    DEMO_MODE: false,
  },
}));

describe('DataService', () => {
  let dataService;
  let mockAuth;
  let mockFirestoreFunctions;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockAuth = {
      currentUser: { uid: 'test-user-id' },
    };

    // Create a mock object for all the firestore functions we need to inject
    mockFirestoreFunctions = {
        getDocs: jest.fn(),
        collection: jest.fn(),
        query: jest.fn(),
        addDoc: jest.fn(),
        doc: jest.fn(),
        updateDoc: jest.fn(),
        serverTimestamp: jest.fn(() => new Date()),
        orderBy: jest.fn(),
        limit: jest.fn(),
        writeBatch: jest.fn(),
    };

    // Firestore db instance is not used by the mocked functions, so it can be null
    dataService = new DataService(mockAuth, null, mockFirestoreFunctions);
  });

  describe('loadAccountsFromFirestore', () => {
    it('should load and return accounts on success', async () => {
      const mockSnapshot = {
        docs: [
          { id: 'acc1', data: () => ({ name: 'Checking', type: 'checking' }) },
          { id: 'acc2', data: () => ({ name: 'Savings', type: 'savings' }) },
        ],
      };
      // Use the mock from our injected object
      mockFirestoreFunctions.getDocs.mockResolvedValue(mockSnapshot);

      const accounts = await dataService.loadAccountsFromFirestore('test-user-id');

      expect(accounts).toHaveLength(2);
      expect(accounts[0].name).toBe('Checking');
      expect(mockFirestoreFunctions.getDocs).toHaveBeenCalledTimes(1);
    });

    it('should throw a user-friendly error on failure', async () => {
      const firestoreError = new Error('Firestore permission denied');
      mockFirestoreFunctions.getDocs.mockRejectedValue(firestoreError);

      await expect(dataService.loadAccountsFromFirestore('test-user-id'))
        .rejects
        .toThrow('Could not load accounts.');
    });
  });

  describe('saveAccountToFirestore', () => {
    it('should save an account and return it with an id', async () => {
        const newAccount = { name: 'New Investment', type: 'investment' };
        const mockDocRef = { id: 'new-id-123' };
        mockFirestoreFunctions.addDoc.mockResolvedValue(mockDocRef);

        const result = await dataService.saveAccountToFirestore('test-user-id', newAccount);

        expect(mockFirestoreFunctions.addDoc).toHaveBeenCalledTimes(1);
        expect(result.id).toBe('new-id-123');
        expect(result.name).toBe('New Investment');
    });

    it('should throw a user-friendly error on failure', async () => {
        const newAccount = { name: 'New Investment', type: 'investment' };
        const firestoreError = new Error('Firestore network error');
        mockFirestoreFunctions.addDoc.mockRejectedValue(firestoreError);

        await expect(dataService.saveAccountToFirestore('test-user-id', newAccount))
            .rejects
            .toThrow('Could not save the account.');
    });
  });
});
