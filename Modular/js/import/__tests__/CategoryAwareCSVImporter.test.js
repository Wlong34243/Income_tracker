import { jest } from '@jest/globals';
import { CategoryAwareCSVImporter } from '../CategoryAwareCSVImporter.js';

// We only need to test the pure functions in this class, so mocks can be simple.
const mockDataService = {};
const mockCategoryManager = {};

describe('CategoryAwareCSVImporter', () => {
  let importer;

  beforeEach(() => {
    importer = new CategoryAwareCSVImporter(mockDataService, mockCategoryManager);
  });

  describe('parseValidDate', () => {
    it('should correctly parse valid MM/DD/YYYY dates', () => {
      expect(importer.parseValidDate('01/15/2024')).toBe('2024-01-15');
    });

    it('should correctly parse valid M/D/YYYY dates', () => {
      expect(importer.parseValidDate('3/5/2023')).toBe('2023-03-05');
    });

    it('should correctly parse valid M/D/YY dates', () => {
        expect(importer.parseValidDate('9/1/23')).toBe('2023-09-01');
    });

    it('should return null for invalid date formats', () => {
      expect(importer.parseValidDate('2024-01-15')).toBeNull();
      expect(importer.parseValidDate('Jan 15, 2024')).toBeNull();
      expect(importer.parseValidDate('15/01/2024')).toBeNull();
    });

    it('should return null for invalid date values', () => {
      expect(importer.parseValidDate('02/30/2024')).toBeNull(); // February doesn't have 30 days
      expect(importer.parseValidDate('13/01/2024')).toBeNull(); // Invalid month
    });

    it('should return null for empty, null, or undefined input', () => {
      expect(importer.parseValidDate('')).toBeNull();
      expect(importer.parseValidDate(null)).toBeNull();
      expect(importer.parseValidDate(undefined)).toBeNull();
    });
  });

  // The sanitize function is now external and tested separately.
  // We can add a test for the normalization function to ensure it uses the sanitizer.
  describe('normalizeTransactionData', () => {
    // This is a more complex test to write, so for "minimal coverage",
    // we'll trust the date validation test above is sufficient for now.
    // A full test suite would mock the dependency on the sanitizer and check
    // that it's called.
  });
});
