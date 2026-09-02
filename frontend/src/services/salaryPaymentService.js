import { apiRequest, generateIdempotencyKey } from "./apiClient.js";

/**
 * Salary Payment, Treasury Settlement & Reversal Service (Phases 5A & 5B)
 * Connects frontend UI components to /api/v1/payroll payment endpoints.
 */

// =============================================================
// 1. Payment Summaries & Payable Status (Phase 5A)
// =============================================================

/**
 * Fetch total salary payable, reserved, settled, and available metrics for a payroll run.
 * @param {string} runId - PayrollRun UUID
 */
export async function getPaymentSummary(runId) {
  if (!runId) throw new Error("Payroll Run ID is required");
  return await apiRequest(`/api/v1/payroll/runs/${encodeURIComponent(runId)}/payment-summary`, {
    method: "GET"
  });
}

/**
 * Fetch real-time reservation and settlement status of an individual employee payroll item.
 * @param {string} itemId - PayrollItem UUID
 */
export async function getEmployeePayableStatus(itemId) {
  if (!itemId) throw new Error("Payroll Item ID is required");
  return await apiRequest(`/api/v1/payroll/items/${encodeURIComponent(itemId)}/payable-status`, {
    method: "GET"
  });
}

/**
 * Fetch financial settlement preview before treasury disbursement.
 * @param {string} paymentId - SalaryPayment UUID
 */
export async function getSettlementPreview(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required");
  return await apiRequest(`/api/v1/payroll/payments/${encodeURIComponent(paymentId)}/preview`, {
    method: "GET"
  });
}

// =============================================================
// 2. Payment Vouchers & Batch Reservation (Phase 5A)
// =============================================================

/**
 * Create a single employee salary payment voucher (reserves payable balance).
 * @param {Object} data - { payrollItemId, amount, paymentMethod, paymentMode, bankReferenceNo, notes }
 */
export async function createPayment(data) {
  return await apiRequest("/api/v1/payroll/payments", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("pay_create")
  });
}

/**
 * Create a multi-employee salary payment batch voucher.
 * @param {Object} data - { payrollRunId, payments: [{ payrollItemId, amount, paymentMethod, bankReferenceNo }], notes }
 */
export async function createPaymentBatch(data) {
  return await apiRequest("/api/v1/payroll/payment-batches", {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("batch_create")
  });
}

/**
 * Approve a draft salary payment batch (moves status to APPROVED, ready for disbursement).
 * @param {string} id - PaymentBatch UUID
 */
export async function approvePaymentBatch(id) {
  if (!id) throw new Error("Payment Batch ID is required");
  return await apiRequest(`/api/v1/payroll/payment-batches/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    idempotencyKey: generateIdempotencyKey("batch_approve")
  });
}

/**
 * Cancel an unapproved salary payment batch and release reserved payable balances.
 * @param {string} id - PaymentBatch UUID
 * @param {Object} data - { reason }
 */
export async function cancelPaymentBatch(id, data = {}) {
  if (!id) throw new Error("Payment Batch ID is required");
  return await apiRequest(`/api/v1/payroll/payment-batches/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("batch_cancel")
  });
}

// =============================================================
// 3. Treasury Settlement & Payout Reversal (Phase 5B)
// =============================================================

/**
 * Disburse and settle a single approved salary payment from Corporate Treasury.
 * @param {string} id - SalaryPayment UUID
 * @param {Object} data - { paymentMode, referenceNo, notes }
 */
export async function settlePayment(id, data = {}) {
  if (!id) throw new Error("Payment ID is required");
  return await apiRequest(`/api/v1/payroll/payments/${encodeURIComponent(id)}/settle`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("pay_settle")
  });
}

/**
 * Disburse and settle an entire approved salary payment batch from Corporate Treasury.
 * @param {string} id - PaymentBatch UUID
 * @param {Object} data - { paymentMode, referenceNo, notes }
 */
export async function settlePaymentBatch(id, data = {}) {
  if (!id) throw new Error("Payment Batch ID is required");
  return await apiRequest(`/api/v1/payroll/payment-batches/${encodeURIComponent(id)}/settle`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("batch_settle")
  });
}

/**
 * Symmetrically reverse a settled salary payment, restore Treasury liquidity, and restore payable balances.
 * @param {string} id - SalaryPayment UUID
 * @param {Object} data - { reason }
 */
export async function reversePayment(id, data = {}) {
  if (!id) throw new Error("Payment ID is required");
  return await apiRequest(`/api/v1/payroll/payments/${encodeURIComponent(id)}/reverse`, {
    method: "POST",
    body: data,
    idempotencyKey: generateIdempotencyKey("pay_reverse")
  });
}
