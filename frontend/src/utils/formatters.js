/**
 * Indian Rupee & Number Formatting Utilities (Lakhs / Crores standard - en-IN)
 */

/**
 * Formats a number or string into Indian Rupee format (e.g. ₹1,01,51,690.00, ₹9,50,000, -₹20,000.00)
 * @param {number|string} val - Number or numeric string
 * @param {object} options - { showDecimals = false }
 * @returns {string} Formatted Indian Rupee string
 */
export const formatINR = (val, { showDecimals = false } = {}) => {
  if (val === null || val === undefined || val === '') {
    return showDecimals ? '₹0.00' : '₹0';
  }
  const num = parseFloat(val);
  if (isNaN(num)) {
    return showDecimals ? '₹0.00' : '₹0';
  }
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  });
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
};

/**
 * Formats a number or string into Indian numbering format without currency symbol (e.g. 1,01,51,690.00)
 * @param {number|string} val - Number or numeric string
 * @param {object} options - { showDecimals = false }
 * @returns {string} Formatted number string
 */
export const formatNumberINR = (val, { showDecimals = false } = {}) => {
  if (val === null || val === undefined || val === '') {
    return showDecimals ? '0.00' : '0';
  }
  const num = parseFloat(val);
  if (isNaN(num)) {
    return showDecimals ? '0.00' : '0';
  }
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  });
  return isNegative ? `-${formatted}` : formatted;
};
