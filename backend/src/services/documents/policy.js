const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const common = ['PAYMENT_PROOF', 'BANK_ADVICE', 'UTR_PROOF', 'CHEQUE_FRONT', 'CHEQUE_BACK', 'SUPPORTING_DOCUMENT', 'OTHER'];
const TYPES = Object.freeze({
  EXPENSE: ['EXPENSE_RECEIPT', 'INVOICE', ...common],
  CUSTOMER_PAYMENT: ['CUSTOMER_PAYMENT_PROOF', ...common],
  BANK_INFLOW: common,
  LAND_PAYOUT: common,
  REFUND: ['REFUND_PROOF', ...common],
  WALLET_ALLOCATION: common,
  OTHER_FINANCIAL_TRANSACTION: common,
  PROPERTY: ['AGREEMENT', 'SUPPORTING_DOCUMENT', 'OTHER'],
});
function fail(statusCode, message) {
  return Object.assign(new Error(message), { statusCode, isOperational: true });
}
function sourceType(value) {
  if (typeof value !== 'string' || !Object.hasOwn(TYPES, value)) throw fail(400, 'Invalid source type.');
  return value;
}
function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw fail(400, 'Invalid record ID.');
  return value;
}
function documentType(source, type) {
  if (!TYPES[sourceType(source)].includes(type)) throw fail(400, 'Document type is not allowed for this transaction.');
  return type;
}
function requiredGroups(source, mode, env = process.env) {
  sourceType(source);
  const groups = [];
  if (source === 'EXPENSE' && env.DOCUMENT_EXPENSE_RECEIPT_REQUIRED !== 'false') groups.push(['EXPENSE_RECEIPT', 'INVOICE']);
  if (source !== 'PROPERTY' && mode !== 'CASH' && env.DOCUMENT_BANK_PROOF_REQUIRED === 'true') {
    groups.push(source === 'REFUND' ? ['REFUND_PROOF', 'PAYMENT_PROOF', 'BANK_ADVICE', 'UTR_PROOF'] : source === 'CUSTOMER_PAYMENT' ? ['CUSTOMER_PAYMENT_PROOF', 'PAYMENT_PROOF', 'BANK_ADVICE', 'UTR_PROOF'] : ['PAYMENT_PROOF', 'BANK_ADVICE', 'UTR_PROOF']);
  }
  if (mode === 'CHEQUE' && env.DOCUMENT_CHEQUE_FRONT_REQUIRED === 'true') groups.push(['CHEQUE_FRONT']);
  return groups;
}
function policy(source, mode) {
  return { sourceType: sourceType(source), allowedTypes: TYPES[source], requiredGroups: requiredGroups(source, mode), maxBytes: MAX_BYTES, maxFiles: MAX_FILES, exceptionAllowed: source === 'EXPENSE', recommendation: mode === 'CHEQUE' ? 'Attach the cheque front; back image is optional.' : 'Attach supporting evidence for financial review.' };
}
function evidenceState(source, mode, docs, exception) {
  const receiptException = source === 'EXPENSE' && ['VERIFIED', 'PENDING_REVIEW'].includes(exception?.status);
  const groups = requiredGroups(source, mode).filter(g => !(receiptException && g.includes('EXPENSE_RECEIPT')));
  const active = docs.filter(d => !['REPLACED', 'ARCHIVED'].includes(d.status));
  if (groups.some(g => !active.some(d => g.includes(d.documentType)))) return 'DOCUMENT_MISSING';
  if (groups.some(g => !active.some(d => g.includes(d.documentType) && d.status !== 'REJECTED'))) return 'DOCUMENT_REJECTED';
  if (active.some(d => d.status === 'PENDING_REVIEW')) return 'DOCUMENT_PENDING';
  if (active.some(d => d.status === 'REJECTED')) return 'DOCUMENT_REJECTED';
  if (receiptException) return exception.status === 'VERIFIED' ? 'EXCEPTION_APPROVED' : 'EXCEPTION_PENDING';
  return active.length ? 'DOCUMENT_VERIFIED' : 'OPTIONAL';
}
module.exports = { MAX_BYTES, MAX_FILES, TYPES, fail, uuid, sourceType, documentType, requiredGroups, policy, evidenceState };
