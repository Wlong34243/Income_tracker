import { sanitizeHTML } from '../Sanitizer.js';

// Per user instructions, the implementation to test against is:
// export function sanitizeHTML(str) {
//   const div = document.createElement('div');
//   div.textContent = str;
//   return div.innerHTML;
// }
// This test is written for that specific implementation.

describe('sanitizeHTML', () => {
  it('should escape < and > characters', () => {
    const input = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(sanitizeHTML(input)).toBe(expected);
  });

  it('should escape & character', () => {
    const input = 'a & b';
    const expected = 'a &amp; b';
    expect(sanitizeHTML(input)).toBe(expected);
  });

  it('should escape " but not \' characters', () => {
    const input = '{"key": \'value\'}';
    // The user-specified implementation using `textContent` escapes double-quotes
    // but does not escape single-quotes, which is standard and safe behavior.
    const expected = '{&quot;key&quot;: \'value\'}';
    expect(sanitizeHTML(input)).toBe(expected);
  });

  it('should handle empty strings', () => {
    expect(sanitizeHTML('')).toBe('');
  });

  it('should handle null and undefined inputs', () => {
    expect(sanitizeHTML(null)).toBe('');
    expect(sanitizeHTML(undefined)).toBe('');
  });

  it('should not alter a string with no special characters', () => {
    const input = 'This is a safe string.';
    expect(sanitizeHTML(input)).toBe(input);
  });
});
