/**
 * Login Rate Limiter & Brute-Force Protection
 * Enforces temporary restriction for repeated failed password attempts by IP or by account.
 *
 * Rules:
 * - Max 5 consecutive failed attempts per account or IP within 15 minutes
 * - Once triggered, account or IP is temporarily restricted for 15 minutes
 * - Successful login immediately resets failed counters
 * - Admin password reset immediately unblocks the target account
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;  // 15 minutes

// In-memory buckets for IP and Account tracking
const ipBucket = new Map();      // ip -> { count: number, firstAttemptAt: number, lockedUntil: number | null }
const accountBucket = new Map(); // normalized email -> { count: number, firstAttemptAt: number, lockedUntil: number | null }

/**
 * Normalizes an IP address (stripping IPv6 prefix if present)
 */
function cleanIp(ip) {
  if (!ip) return '127.0.0.1';
  let cleaned = String(ip).trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.replace('::ffff:', '');
  }
  return cleaned;
}

/**
 * Normalizes an email address
 */
function cleanEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Checks whether an IP or Account is currently under temporary restriction
 *
 * @param {string} ip - Request IP address
 * @param {string} email - Login email attempt
 * @returns {{ restricted: boolean, remainingMs: number, retryMinutes: number, reason?: 'account' | 'ip' }}
 */
function isRestricted(ip, email) {
  const now = Date.now();
  const cIp = cleanIp(ip);
  const cEmail = cleanEmail(email);

  // Check account lockout first
  if (cEmail && accountBucket.has(cEmail)) {
    const accRecord = accountBucket.get(cEmail);
    if (accRecord.lockedUntil && accRecord.lockedUntil > now) {
      const remainingMs = accRecord.lockedUntil - now;
      const retryMinutes = Math.ceil(remainingMs / 60000);
      return {
        restricted: true,
        remainingMs,
        retryMinutes,
        reason: 'account',
      };
    } else if (accRecord.lockedUntil && accRecord.lockedUntil <= now) {
      // Lockout expired, reset bucket
      accountBucket.delete(cEmail);
    }
  }

  // Check IP lockout
  if (cIp && ipBucket.has(cIp)) {
    const ipRecord = ipBucket.get(cIp);
    if (ipRecord.lockedUntil && ipRecord.lockedUntil > now) {
      const remainingMs = ipRecord.lockedUntil - now;
      const retryMinutes = Math.ceil(remainingMs / 60000);
      return {
        restricted: true,
        remainingMs,
        retryMinutes,
        reason: 'ip',
      };
    } else if (ipRecord.lockedUntil && ipRecord.lockedUntil <= now) {
      // Lockout expired, reset bucket
      ipBucket.delete(cIp);
    }
  }

  return { restricted: false, remainingMs: 0, retryMinutes: 0 };
}

/**
 * Records a failed login attempt for both the IP and the Account.
 * If the threshold is reached (5 attempts), sets a 15-minute temporary restriction.
 *
 * @param {string} ip
 * @param {string} email
 * @returns {{ restricted: boolean, attemptsLeft: number, retryMinutes: number, reason?: string }}
 */
function recordFailedAttempt(ip, email) {
  const now = Date.now();
  const cIp = cleanIp(ip);
  const cEmail = cleanEmail(email);

  // Update Account bucket
  let accountAttempts = 0;
  let accountLocked = false;

  if (cEmail) {
    let accRecord = accountBucket.get(cEmail);
    if (!accRecord || now - accRecord.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      accRecord = { count: 1, firstAttemptAt: now, lockedUntil: null };
    } else {
      accRecord.count += 1;
    }

    if (accRecord.count >= MAX_FAILED_ATTEMPTS) {
      accRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      accountLocked = true;
    }
    accountBucket.set(cEmail, accRecord);
    accountAttempts = accRecord.count;
  }

  // Update IP bucket
  let ipAttempts = 0;
  let ipLocked = false;

  if (cIp) {
    let ipRecord = ipBucket.get(cIp);
    if (!ipRecord || now - ipRecord.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      ipRecord = { count: 1, firstAttemptAt: now, lockedUntil: null };
    } else {
      ipRecord.count += 1;
    }

    if (ipRecord.count >= MAX_FAILED_ATTEMPTS) {
      ipRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      ipLocked = true;
    }
    ipBucket.set(cIp, ipRecord);
    ipAttempts = ipRecord.count;
  }

  if (accountLocked || ipLocked) {
    return {
      restricted: true,
      attemptsLeft: 0,
      retryMinutes: 15,
      reason: accountLocked ? 'account' : 'ip',
    };
  }

  const highestAttempts = Math.max(accountAttempts, ipAttempts);
  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - highestAttempts);

  return {
    restricted: false,
    attemptsLeft,
    retryMinutes: 0,
  };
}

/**
 * Records a successful login attempt, resetting the failed attempts counter.
 *
 * @param {string} ip
 * @param {string} email
 */
function recordSuccess(ip, email) {
  const cIp = cleanIp(ip);
  const cEmail = cleanEmail(email);

  if (cIp && ipBucket.has(cIp)) {
    ipBucket.delete(cIp);
  }

  if (cEmail && accountBucket.has(cEmail)) {
    accountBucket.delete(cEmail);
  }
}

/**
 * Clears any active restriction for a specific account email (e.g., when Admin resets the password).
 *
 * @param {string} email
 */
function clearRestrictionForAccount(email) {
  const cEmail = cleanEmail(email);
  if (cEmail && accountBucket.has(cEmail)) {
    accountBucket.delete(cEmail);
  }
}

// Periodic cleanup of expired entries every 5 minutes to prevent memory accumulation
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipBucket.entries()) {
    if (val.lockedUntil && val.lockedUntil < now) {
      ipBucket.delete(key);
    } else if (!val.lockedUntil && now - val.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      ipBucket.delete(key);
    }
  }

  for (const [key, val] of accountBucket.entries()) {
    if (val.lockedUntil && val.lockedUntil < now) {
      accountBucket.delete(key);
    } else if (!val.lockedUntil && now - val.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      accountBucket.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

module.exports = {
  isRestricted,
  recordFailedAttempt,
  recordSuccess,
  clearRestrictionForAccount,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
};
