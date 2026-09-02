import { apiRequest, generateIdempotencyKey } from "./apiClient.js";

/**
 * Frontend Salary & Treasury Disbursal Service
 */

/**
 * Fetch monthly enterprise salary summary dashboard stats (Admin & Accounting)
 * @param {string} month - e.g. "2026-09"
 */
export async function getSalarySummary(month) {
  return await apiRequest("/api/v1/employees/salary/summary", {
    method: "GET",
    params: month ? { month } : {}
  });
}

/**
 * Update employee base salary and bank details (Admin Only)
 * @param {string} id - Employee UUID
 * @param {Object} data - { baseSalary, bankName, bankAccountNo, ifscCode, upiId, paymentMethod }
 */
export async function updateSalaryConfig(id, data) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/salary`, {
    method: "PUT",
    body: data
  });
}

/**
 * Disburse monthly salary from Corporate Treasury (Admin & Accounting)
 * @param {string} id - Employee UUID
 * @param {Object} data - { month, amount, paymentMode, referenceNo, notes }
 */
export async function paySalary(id, data) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/pay-salary`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("emp_pay_sal")
  });
}

/**
 * Fetch past salary disbursements for an employee (Admin, Accounting, Manager)
 * @param {string} id - Employee UUID
 */
export async function getSalaryPayments(id) {
  if (!id) throw new Error("Employee ID is required");
  return await apiRequest(`/api/v1/employees/${encodeURIComponent(id)}/salary-payments`, {
    method: "GET"
  });
}
