/**
 * Utility functions for cleaning and normalizing Plot Numbers and Khata Numbers
 * across Customer and Land Acquisition modules.
 */

/**
 * Remove redundant user-typed prefixes like 'Plot', 'Plot No.', 'Plot:', etc.
 * @param {string} val 
 * @returns {string} Cleaned plot number (e.g. 'LA-902')
 */
function cleanPlotNumber(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^(plot\s*(no\.?|number|#|:|-)?\s*)/i, '')
    .trim();
}

/**
 * Remove redundant user-typed prefixes like 'Khata', 'Khata No.', 'Khata:', etc.
 * @param {string} val 
 * @returns {string} Cleaned khata number (e.g. 'KH-6602/2026')
 */
function cleanKhataNumber(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^(khata\s*(no\.?|number|#|:|-)?\s*)/i, '')
    .trim();
}

/**
 * Normalize alphanumeric characters for deep duplicate matching.
 * Strips all spaces, hyphens, slashes, punctuation, and prefixes.
 * Example: 'Plot LA-902' -> 'LA902', 'LA-902' -> 'LA902'
 * Example: 'Khata: KH-6602/2026' -> 'KH66022026', 'KH-6602/2026' -> 'KH66022026'
 * @param {string} val 
 * @returns {string} Normalized uppercase alphanumeric token
 */
function normalizeForComparison(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/^(plot\s*(no\.?|number|#|:|-)?\s*)/i, '')
    .replace(/^(khata\s*(no\.?|number|#|:|-)?\s*)/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

module.exports = {
  cleanPlotNumber,
  cleanKhataNumber,
  normalizeForComparison
};
