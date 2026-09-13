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

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Formats a date value cleanly into Indian Standard Time (IST - Asia/Kolkata)
 * Prevents timezone offset day-shifting (e.g. 01/09 rolling back to 31/08).
 * @param {string|Date|number} val - Date, ISO string, or timestamp
 * @param {object} options - { format = 'dd/mm/yyyy' | 'dd-mmm-yyyy' | 'yyyy-mm-dd' | 'full' }
 * @returns {string} Formatted date
 */
export const formatDate = (val, { format = 'dd/mm/yyyy' } = {}) => {
  if (!val) return '—';

  try {
    // If it's a string starting with YYYY-MM-DD (e.g. ISO string or date string)
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [yearStr, monthStr, dayStr] = val.slice(0, 10).split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      const dd = day < 10 ? `0${day}` : `${day}`;
      const mm = month < 10 ? `0${month}` : `${month}`;

      if (format === 'dd/mm/yyyy') return `${dd}/${mm}/${year}`;
      if (format === 'dd-mmm-yyyy') return `${dd} ${MONTH_NAMES_SHORT[month - 1]} ${year}`;
      if (format === 'yyyy-mm-dd') return `${year}-${mm}-${dd}`;
      if (format === 'full') return `${dd} ${MONTH_NAMES_FULL[month - 1]} ${year}`;
    }

    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';

    if (format === 'dd-mmm-yyyy') {
      const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).formatToParts(d);
      const day = parts.find(p => p.type === 'day')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';
      return `${day} ${month} ${year}`;
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch (err) {
    console.error('formatDate error:', err);
    return '—';
  }
};

/**
 * Formats time in Indian Standard Time (IST - Asia/Kolkata)
 * @param {string|Date|number} val
 * @param {object} options - { showSeconds = false }
 * @returns {string} e.g. "06:30 PM"
 */
export const formatTime = (val, { showSeconds = false } = {}) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: true
    }).format(d).toUpperCase();
  } catch {
    return '—';
  }
};

/**
 * Formats both Date and Time in Indian Standard Time (IST - Asia/Kolkata)
 * @param {string|Date|number} val
 * @param {object} options - { format = 'dd/mm/yyyy' | 'dd-mmm-yyyy', showSeconds = false }
 * @returns {string} e.g. "01/09/2026, 06:30 PM"
 */
export const formatDateTime = (val, { format = 'dd/mm/yyyy', showSeconds = false } = {}) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    const dateStr = formatDate(val, { format });
    const timeStr = formatTime(val, { showSeconds });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return '—';
  }
};

/**
 * Returns today's date in YYYY-MM-DD format formatted in Indian Standard Time (IST)
 * for use as default value in HTML <input type="date">
 * @param {Date|string} [val]
 * @returns {string} e.g. "2026-09-13"
 */
export const toISTDateInputString = (val = new Date()) => {
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Packages a calendar date string (YYYY-MM-DD) into an ISO string anchored at noon UTC (12:00:00.000Z)
 * This guarantees that across ANY timezone in the world (-12 to +14), the date stays on the exact same calendar day!
 * @param {string} dateString - "YYYY-MM-DD"
 * @param {string} [timeString="12:00:00"]
 * @returns {string} ISO Date String
 */
export const createSafePaymentDateISO = (dateString, timeString = '12:00:00') => {
  if (!dateString) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
    return `${dateString.trim()}T${timeString}.000Z`;
  }
  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return new Date().toISOString();
};

