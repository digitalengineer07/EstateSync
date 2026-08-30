/**
 * Indian Rupee & Number Formatting Utilities (Lakhs / Crores standard)
 */

export const formatINR = (val, { showDecimals = false } = {}) => {
  const num = parseFloat(val) || 0;
  if (showDecimals) {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatNumberINR = (val, { showDecimals = false } = {}) => {
  const num = parseFloat(val) || 0;
  if (showDecimals) {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('en-IN');
};
