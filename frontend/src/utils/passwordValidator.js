/**
 * Frontend Password Validator
 * Ensures passwords adhere to the 8-character rule and rejects weak/commonly used passwords.
 */

export const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  'password1234',
  'password1',
  'password01',
  'pass1234',
  'pass@123',
  'password@123',
  'admin123',
  'admin@123',
  'admin1234',
  'administrator',
  '12345678',
  '123456789',
  '1234567890',
  '01234567',
  '87654321',
  '987654321',
  'qwerty123',
  'qwertyuiop',
  'asdfghjk',
  'zxcvbnm1',
  'welcome1',
  'welcome123',
  'welcome@123',
  'estatesync',
  'estatesync123',
  'estatesync@123',
  'estate123',
  'realestate',
  'realestate123',
  'iloveyou',
  'iloveyou123',
  'letmein123',
  'monkey123',
  'sunshine',
  'princess',
  'football',
  'master123',
  'dragon123',
  'testing123',
  'test1234',
  'changeme',
  'changeme123',
  'default123',
  'secret123',
  'login123',
  'devoxa123',
  'devoxatech',
]);

/**
 * Validates password strength on the client side
 *
 * @param {string} password
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password cannot exceed 128 characters.' };
  }

  const normalized = password.toLowerCase().trim();

  if (COMMON_WEAK_PASSWORDS.has(normalized)) {
    return {
      isValid: false,
      error: 'This password is too common or easily guessable. Please choose a stronger password.',
    };
  }

  const commonRoots = ['password', 'admin', 'qwerty', 'welcome', 'estatesync', 'letmein'];
  for (const root of commonRoots) {
    if (normalized === root || (normalized.startsWith(root) && normalized.length <= root.length + 3)) {
      return {
        isValid: false,
        error: `Password contains the easily guessable word "${root}". Please choose a more complex phrase.`,
      };
    }
  }

  if (/^(.)\1+$/.test(password)) {
    return {
      isValid: false,
      error: 'Password cannot consist of a single repeated character.',
    };
  }

  if (/^\d+$/.test(password)) {
    return {
      isValid: false,
      error: 'Password cannot contain only numbers. Please include letters and special symbols.',
    };
  }

  const sequentialPatterns = [
    '0123456789',
    '9876543210',
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
  ];
  for (const seq of sequentialPatterns) {
    if (seq.includes(normalized)) {
      return {
        isValid: false,
        error: 'Password cannot be a sequential series of numbers or letters.',
      };
    }
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigitOrSymbol = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  if (!hasLetter || !hasDigitOrSymbol) {
    return {
      isValid: false,
      error: 'Password must include a mix of letters and numbers or symbols.',
    };
  }

  return { isValid: true };
}

/**
 * Generates an enterprise-grade random secure password
 */
export function generateSecurePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + numbers + symbols;

  let pwd = '';
  // Ensure at least one of each category
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}
