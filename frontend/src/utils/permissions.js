/**
 * Granular RBAC Permission Helper for EstateSync
 * Evaluates backend permission codes against the active AuthContext user.
 */

/**
 * Check if the user possesses a specific backend permission.
 * @param {Object} user - The AuthContext user object (containing role and permissions array)
 * @param {string} permissionCode - The exact backend permission code (e.g., 'employee.create')
 * @returns {boolean}
 */
export function hasPermission(user, permissionCode) {
  if (!user || !permissionCode) return false;

  // Super-admin has full authorization
  if (user.role === 'ADMIN') return true;

  if (!user.permissions || !Array.isArray(user.permissions)) {
    return false;
  }

  return user.permissions.includes(permissionCode.trim());
}

/**
 * Check if the user possesses AT LEAST ONE of the specified permissions.
 * @param {Object} user - The AuthContext user object
 * @param {string[]} permissionCodes - Array of backend permission codes
 * @returns {boolean}
 */
export function hasAnyPermission(user, permissionCodes = []) {
  if (!user || !Array.isArray(permissionCodes) || permissionCodes.length === 0) return false;
  if (user.role === 'ADMIN') return true;

  return permissionCodes.some((code) => hasPermission(user, code));
}

/**
 * Check if the user possesses ALL of the specified permissions.
 * @param {Object} user - The AuthContext user object
 * @param {string[]} permissionCodes - Array of backend permission codes
 * @returns {boolean}
 */
export function hasAllPermissions(user, permissionCodes = []) {
  if (!user || !Array.isArray(permissionCodes) || permissionCodes.length === 0) return false;
  if (user.role === 'ADMIN') return true;

  return permissionCodes.every((code) => hasPermission(user, code));
}
