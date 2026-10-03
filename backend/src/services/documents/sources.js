const { fail, sourceType, uuid } = require('./policy');
const has = (actor, permission) => actor.role === 'ADMIN' || actor.permissions.includes(permission);
const finance = actor => ['ADMIN', 'ACCOUNTING'].includes(actor.role);
async function actorFrom(db, userId) {
  uuid(userId);
  const user = await db.user.findUnique({ where: { id: userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  if (!user?.isActive) throw fail(403, 'Account is not active.');
  return { userId: user.id, email: user.email, role: user.role.name, permissions: user.role.permissions.map(p => p.permission.code) };
}
function capability(actor, action) {
  if (!has(actor, `document.${action}`) || (['review', 'archive'].includes(action) && !finance(actor))) throw fail(403, 'You do not have permission to perform this document action.');
}
function sensitive(actor, type) {
  if (type.startsWith('CHEQUE_') && (!finance(actor) || !has(actor, 'document.sensitive'))) throw fail(403, 'Cheque images are restricted to authorized financial staff.');
}
function canStage(actor, type) {
  capability(actor, 'upload');
  const required = { EXPENSE: 'expense.create', CUSTOMER_PAYMENT: 'customer.payment.record', REFUND: 'customer.payment.record', LAND_PAYOUT: 'property.payment.record', PROPERTY: 'property.create', BANK_INFLOW: 'accounting.view', WALLET_ALLOCATION: 'fund.allocate', OTHER_FINANCIAL_TRANSACTION: 'transaction.view' };
  if (!has(actor, required[sourceType(type)]) || (['BANK_INFLOW', 'REFUND'].includes(type) && !finance(actor))) throw fail(403, 'You do not have permission to attach evidence in this module.');
}
async function resolveSource(db, actor, type, id) {
  sourceType(type); uuid(id);
  let r; let allowed = actor.role === 'ADMIN'; let info;
  if (type === 'EXPENSE') {
    r = await db.expense.findUnique({ where: { id }, include: { user: { select: { name: true } }, category: true } });
    if (r) {
      allowed ||= (r.userId === actor.userId && has(actor, 'expense.view')) || has(actor, 'expense.view_all');
      if (!allowed && has(actor, 'expense.view_team')) allowed = !!await db.fundRequest.findFirst({ where: { managerId: actor.userId, requesterId: r.userId }, select: { id: true } });
      info = { amount: r.amount, paymentMode: r.fundMode, reference: r.reference, party: r.user.name, date: r.date, createdBy: r.userId, identifier: `EXP-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`, description: r.description };
    }
  } else if (type === 'CUSTOMER_PAYMENT' || type === 'REFUND') {
    r = await db.customerPayment.findUnique({ where: { id }, include: { customer: true } });
    if (r && ((type === 'REFUND') !== (r.status === 'REFUND_DISBURSED'))) r = null;
    if (r) {
      allowed ||= type === 'REFUND' ? finance(actor) && has(actor, 'customer.view_all') : has(actor, 'customer.view_all') || (has(actor, 'customer.view') && r.customer.salesOwnerId === actor.userId);
      info = { amount: r.amount, paymentMode: r.paymentMode, reference: r.referenceNo, party: r.customer.customerName, customerId: r.customerId, property: r.customer.plotNo, date: r.dateOfPayment, createdBy: r.recordedById };
    }
  } else if (type === 'LAND_PAYOUT' || type === 'PROPERTY') {
    r = type === 'PROPERTY' ? await db.propertyAcquisition.findUnique({ where: { id } }) : await db.propertyPayment.findUnique({ where: { id }, include: { property: true } });
    if (r) {
      allowed ||= has(actor, 'property.view_all');
      const property = type === 'PROPERTY' ? r : r.property;
      info = { amount: r.amount || property.totalLandValue, paymentMode: r.paymentMode || 'N/A', reference: r.referenceNo, party: property.landOwnerName, propertyId: property.id, property: property.plotNo, date: r.dateOfPayment || r.createdAt, createdBy: r.paidById || r.createdById };
    }
  } else {
    r = await db.walletTransaction.findUnique({ where: { id }, include: { sourceWallet: true, destWallet: true } });
    if (r) {
      const bank = r.referenceType === 'BANK_STATEMENT';
      const allocation = ['FUND_ALLOCATION', 'FUND_TRANSFER'].includes(r.type);
      if ((type === 'BANK_INFLOW' && !bank) || (type === 'WALLET_ALLOCATION' && !allocation) || (type === 'OTHER_FINANCIAL_TRANSACTION' && (bank || allocation || !['ADJUSTMENT', 'EXPENSE_REVERSAL'].includes(r.type)))) r = null;
    }
    if (r) {
      allowed ||= type === 'BANK_INFLOW' ? finance(actor) && has(actor, 'accounting.view') : has(actor, 'transaction.view_all') || (has(actor, 'transaction.view') && [r.sourceWallet?.userId, r.destWallet?.userId].includes(actor.userId));
      const bankRef = type === 'BANK_INFLOW' ? await db.globalBankReference.findFirst({ where: { sourceRecordId: id } }) : null;
      info = { amount: r.amount, paymentMode: bankRef?.paymentMode || r.fundMode, reference: r.referenceId, party: bankRef?.bankName || r.description, date: r.createdAt, createdBy: r.createdBy, description: r.description };
    }
  }
  if (!r) throw fail(404, 'Source transaction not found.');
  if (!allowed) throw fail(403, 'You do not have permission to access this transaction.');
  return { sourceType: type, sourceId: id, identifier: id, ...info, amount: String(info.amount), createdAt: r.createdAt };
}
module.exports = { actorFrom, has, finance, capability, sensitive, canStage, resolveSource };
