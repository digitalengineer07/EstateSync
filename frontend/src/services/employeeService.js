import { apiRequest, generateIdempotencyKey } from "./apiClient.js";

/**
 * Employee Master & Salary Assignment Service (Phases 1 & 2)
 * Connects frontend UI components to /api/v1/employees endpoints.
 */

/**
 * Fetch list of employees with optional filtering, search, and pagination.
 * @param {Object} params - { search, department, status, hasLogin, page, limit }
 */
export async function getEmployees(params = {}) {
  return await apiRequest("/api/v1/employees", {
    method: "GET",
    params
  });
}

/**
 * Create a new employee record.
 * @param {Object} data - { employeeCode, fullName, displayName, mobile, email, department, designation, employmentType, joiningDate, reportingManagerId, userId, ... }
 */
export async function createEmployee(data) {
  return await apiRequest("/api/v1/employees", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("emp_create")
  });
}

/**
 * Fetch detailed profile of a single employee by ID.
 * @param {string} id - Employee UUID
 */
export async function getEmployeeById(id) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}`, {
    method: "GET"
  });
}

/**
 * Update non-identifying fields of an employee.
 * @param {string} id - Employee UUID
 * @param {Object} data - Editable employee fields
 */
export async function updateEmployee(id, data) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data
  });
}

/**
 * Archive / Deactivate an employee upon exit.
 * @param {string} id - Employee UUID
 * @param {Object} data - { exitDate, exitReason }
 */
export async function archiveEmployee(id, data = {}) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/archive`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("emp_archive")
  });
}

/**
 * Link an existing login User account to an employee record.
 * @param {string} id - Employee UUID
 * @param {string} userId - User UUID to link
 */
export async function linkUser(id, userId) {
  if (!id) throw new Error("Employee ID is required");
  if (!userId) throw new Error("User ID is required to link");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/link-user`, {
    method: "POST",
    body: { userId },
    idempotencyKey: generateIdempotencyKey("emp_link")
  });
}

/**
 * Unlink the login User account from an employee record.
 * @param {string} id - Employee UUID
 */
export async function unlinkUser(id) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/unlink-user`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("emp_unlink")
  });
}

/**
 * Fetch salary assignment timeline history for an employee.
 * @param {string} id - Employee UUID
 */
export async function getSalaryAssignments(id) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/salary-assignments`, {
    method: "GET"
  });
}

/**
 * Create a new salary structure assignment for an employee.
 * @param {string} id - Employee UUID
 * @param {Object} data - { salaryStructureId, effectiveFrom, baseGrossSalary, customComponents, notes }
 */
export async function createSalaryAssignment(id, data) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/salary-assignments`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("sal_assign")
  });
}

/**
 * Fetch current active salary assignment and component breakdown for an employee.
 * @param {string} id - Employee UUID
 */
export async function getCurrentSalaryAssignment(id) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/salary-assignments/current`, {
    method: "GET"
  });
}

/**
 * Resolve employee salary structure and effective components for a specific historical date.
 * @param {string} id - Employee UUID
 * @param {string} date - Date string (YYYY-MM-DD)
 */
export async function resolveSalaryByDate(id, date) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/salary-assignments/resolve`, {
    method: "GET",
    params: { date }
  });
}
