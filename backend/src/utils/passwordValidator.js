/**
 * Centralized Password Validator for EstateSync
 * Enforces enterprise-grade password security across all registration,
 * self-service change password, and admin reset workflows.
 */

// Comprehensive list of commonly used weak passwords and trivial dictionary patterns (normalized lowercase)
const COMMON_WEAK_PASSWORDS = new Set([
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
 * Validates a password against enterprise security policies:
 * 1. Minimum 8 characters, maximum 128 characters
 * 2. Rejection of commonly used / dictionary passwords
 * 3. Rejection of trivial repeated characters (e.g., '11111111', 'aaaaaaaa')
 * 4. Rejection of sequential characters (e.g., '12345678', 'abcdefgh')
 * 5. Character variety: Must not be purely numeric or purely lowercase letters without digits/symbols
 *
 * @param {string} password - Plain text password to validate
 * @param {object} [options] - Additional contextual checks
 * @param {string} [options.userEmail] - User email to prevent using email prefix as password
 * @param {string} [options.userName] - User name to prevent using name as password
 * @returns {{ isValid: boolean, error?: string }}
 */
function validatePassword(password, options = {}) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required and must be a valid text string.',
    };
  }

  // 1. Length check: Minimum 8 characters, maximum 128 characters
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long.',
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      error: 'Password cannot exceed 128 characters.',
    };
  }

  const normalized = password.toLowerCase().trim();

  // 2. Reject exact match against common weak passwords
  if (COMMON_WEAK_PASSWORDS.has(normalized)) {
    return {
      isValid: false,
      error: 'This password is too common or easily guessable. Please choose a stronger, unique password.',
    };
  }

  // 3. Reject if password contains obvious common roots with trivial suffixes (e.g., 'password#1', 'admin!2026')
  const commonRoots = ['password', 'admin', 'qwerty', 'welcome', 'estatesync', 'letmein'];
  for (const root of commonRoots) {
    if (normalized === root || (normalized.startsWith(root) && normalized.length <= root.length + 3)) {
      return {
        isValid: false,
        error: `Password contains the easily guessable word "${root}". Please choose a more complex phrase.`,
      };
    }
  }

  // 4. Reject trivial single-character repetition (e.g., '11111111', 'aaaaaaaa', '########')
  if (/^(.)\1+$/.test(password)) {
    return {
      isValid: false,
      error: 'Password cannot consist of a single repeated character.',
    };
  }

  // 5. Reject purely numeric passwords (e.g., '12345678', '98451234')
  if (/^\d+$/.test(password)) {
    return {
      isValid: false,
      error: 'Password cannot contain only numbers. Please include letters and special symbols.',
    };
  }

  // 6. Reject standard sequential numbers or alphabetical runs
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

  // 7. Contextual checks: Don't allow using user's email username or full name
  if (options.userEmail && typeof options.userEmail === 'string') {
    const emailPrefix = options.userEmail.split('@')[0]?.toLowerCase().trim();
    if (emailPrefix && emailPrefix.length >= 3 && normalized.includes(emailPrefix)) {
      return {
        isValid: false,
        error: 'Password cannot contain your email username.',
      };
    }
  }

  if (options.userName && typeof options.userName === 'string') {
    const cleanName = options.userName.toLowerCase().trim();
    if (cleanName.length >= 4 && normalized.includes(cleanName)) {
      return {
        isValid: false,
        error: 'Password cannot contain your personal name.',
      };
    }
  }

  // 8. Character complexity requirement:
  // Must contain at least one letter and at least one number OR symbol
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

module.exports = {
  validatePassword,
  COMMON_WEAK_PASSWORDS,
};
