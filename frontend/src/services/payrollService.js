import { apiRequest, generateIdempotencyKey } from "./apiClient.js";

/**
 * Payroll Calculation Engine, Masters & GL Accrual Service (Phases 2, 3 & 4)
 * Connects frontend UI components to /api/v1/payroll endpoints.
 */

// =============================================================
// 1. Salary Component Master (Phase 2)
// =============================================================

/**
 * Fetch all salary components.
 */
export async function getComponents() {
  return await apiRequest("/api/v1/payroll/components", { method: "GET" });
}

/**
 * Fetch a single salary component by ID.
 * @param {string} id - Component UUID
 */
export async function getComponentById(id) {
  if (!id) throw new Error("Component ID is required");
  return await apiRequest(`/api/v1/payroll/components/${encodeURIComponent(id)}`, { method: "GET" });
}

/**
 * Create a new salary component.
 * @param {Object} data - { code, name, description, componentType, calculationMethod, calculationBase, defaultValue, percentageValue, sequence, isTaxable, isRecurring, glAccountCode }
 */
export async function createComponent(data) {
  return await apiRequest("/api/v1/payroll/components", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("comp_create")
  });
}

/**
 * Update an existing salary component.
 * @param {string} id - Component UUID
 * @param {Object} data - Editable component fields
 */
export async function updateComponent(id, data) {
  if (!id) throw new Error("Component ID is required");
  return await apiRequest(`/api/v1/payroll/components/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data
  });
}

// =============================================================
// 2. Salary Structure Master (Phase 2)
// =============================================================

/**
 * Fetch all salary structures with associated component lines.
 */
export async function getStructures() {
  return await apiRequest("/api/v1/payroll/structures", { method: "GET" });
}

/**
 * Fetch a single salary structure by ID.
 * @param {string} id - Structure UUID
 */
export async function getStructureById(id) {
  if (!id) throw new Error("Structure ID is required");
  return await apiRequest(`/api/v1/payroll/structures/${encodeURIComponent(id)}`, { method: "GET" });
}

/**
 * Create a new salary structure template.
 * @param {Object} data - { code, name, description, lines: [{ componentId, calculationMethod, calculationBase, defaultValue, percentageValue, sequence }] }
 */
export async function createStructure(data) {
  return await apiRequest("/api/v1/payroll/structures", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("struct_create")
  });
}

/**
 * Archive a salary structure.
 * @param {string} id - Structure UUID
 */
export async function archiveStructure(id) {
  if (!id) throw new Error("Structure ID is required");
  return await apiRequest(`/api/v1/payroll/structures/${encodeURIComponent(id)}/archive`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("struct_archive")
  });
}

// =============================================================
// 3. Monthly Payroll Periods (Phase 3)
// =============================================================

/**
 * Fetch all monthly payroll periods.
 */
export async function getPeriods() {
  return await apiRequest("/api/v1/payroll/periods", { method: "GET" });
}

/**
 * Fetch a single payroll period by ID.
 * @param {string} id - Period UUID
 */
export async function getPeriodById(id) {
  if (!id) throw new Error("Period ID is required");
  return await apiRequest(`/api/v1/payroll/periods/${encodeURIComponent(id)}`, { method: "GET" });
}

/**
 * Create a new monthly payroll period calendar.
 * @param {Object} data - { fiscalYear, monthNumber, periodName, startDate, endDate, payDate }
 */
export async function createPeriod(data) {
  return await apiRequest("/api/v1/payroll/periods", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("period_create")
  });
}

/**
 * Open a draft monthly payroll period for calculation.
 * @param {string} id - Period UUID
 */
export async function openPeriod(id) {
  if (!id) throw new Error("Period ID is required");
  return await apiRequest(`/api/v1/payroll/periods/${encodeURIComponent(id)}/open`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("period_open")
  });
}

// =============================================================
// 4. Payroll Runs & Calculation Engine (Phase 3)
// =============================================================

/**
 * Create a new payroll calculation run for a period.
 * @param {Object} data - { payrollPeriodId, description }
 */
export async function createRun(data) {
  return await apiRequest("/api/v1/payroll/runs", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("run_create")
  });
}

/**
 * Fetch detailed status of a payroll run by ID.
 * @param {string} id - PayrollRun UUID
 */
export async function getRunById(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}`, { method: "GET" });
}

/**
 * Execute batch payroll calculations for all active staff in a run.
 * @param {string} id - PayrollRun UUID
 */
export async function calculateRun(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/calculate`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("run_calc")
  });
}

/**
 * Fetch calculated payroll items (payslips) for a run.
 * @param {string} id - PayrollRun UUID
 * @param {Object} params - { search, department, status, page, limit }
 */
export async function getRunItems(id, params = {}) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/items`, {
    method: "GET",
    params
  });
}

/**
 * Fetch a single employee payroll item payslip details by ID.
 * @param {string} id - PayrollItem UUID
 */
export async function getItemById(id) {
  if (!id) throw new Error("Payroll Item ID is required");
  return await apiRequest(`/api/v1/payroll/items/${encodeURIComponent(id)}`, { method: "GET" });
}

/**
 * Fetch calculation warnings and exception flags for a run.
 * @param {string} id - PayrollRun UUID
 */
export async function getRunExceptions(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/exceptions`, { method: "GET" });
}

/**
 * Create an ad-hoc payroll adjustment (bonus, incentive, deduction) on a run item.
 * @param {string} id - PayrollRun UUID
 * @param {Object} data - { payrollItemId, adjustmentType, componentCode, amount, reason }
 */
export async function createAdjustment(id, data) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/adjustments`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("adj_create")
  });
}

/**
 * Approve a calculated payroll run (Management/Admin approval gate).
 * @param {string} id - PayrollRun UUID
 */
export async function approveRun(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("run_approve")
  });
}

/**
 * Lock an approved payroll run (Immutability lockdown prior to GL posting).
 * @param {string} id - PayrollRun UUID
 */
export async function lockRun(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/lock`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("run_lock")
  });
}

// =============================================================
// 5. General Ledger Accrual & Accounting Integration (Phase 4)
// =============================================================

/**
 * Fetch double-entry General Ledger posting preview for a locked payroll run.
 * @param {string} id - PayrollRun UUID
 */
export async function getPostingPreview(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/posting-preview`, { method: "GET" });
}

/**
 * Post atomic double-entry payroll accrual journal to General Ledger.
 * @param {string} id - PayrollRun UUID
 */
export async function postToLedger(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/post-to-ledger`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("gl_post")
  });
}

/**
 * Reverse a previously posted payroll journal in the General Ledger.
 * @param {string} id - PayrollRun UUID
 * @param {Object} data - { reason }
 */
export async function reversePosting(id, data = {}) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/reverse-ledger-posting`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("gl_reverse")
  });
}

/**
 * Fetch posted accounting journal details for a payroll run.
 * @param {string} id - PayrollRun UUID
 */
export async function getAccountingPosting(id) {
  if (!id) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(id)}/accounting-posting`, { method: "GET" });
}
