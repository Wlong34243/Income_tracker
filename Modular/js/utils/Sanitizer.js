/**
 * Sanitizes a string by leveraging the browser's built-in parser.
 * It assigns the string to the textContent of a temporary DOM element,
 * which safely encodes any special HTML characters, and then reads
 * the result back from innerHTML. This is a robust method to prevent XSS.
 * @param {string | null | undefined} str The string to sanitize.
 * @returns {string} The sanitized string.
 */
export function sanitizeHTML(str) {
  if (str === null || str === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
