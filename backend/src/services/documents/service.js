const crypto = require('node:crypto');
const prisma = require('../../config/db');
const { logAudit } = require('../../utils/auditLogger');
const P = require('./policy');
const A = require('./sources');
const { validateFile, preview } = require('./files');
const { storage, scan } = require('./storage');
const safeDocument = d => {
  const { storageKey, ...visible } = d;
  return visible;
};
async function checkedContent(record) {
  const buffer = await storage().read(record.storageKey);
  if (buffer.length !== record.fileSize || crypto.createHash('sha256').update(buffer).digest('hex') !== record.sha256) throw P.fail(503, 'Document integrity check failed. Contact an administrator.');
  return buffer;
}
async function audit(tx, actor, action, entityId, values, req) {
  const result = await logAudit({ actorId: actor.userId, actorEmail: actor.email, action, entityType: 'TRANSACTION_DOCUMENT', entityId, newValues: values, tx, req });
  if (!result) throw P.fail(503, 'Document audit could not be recorded. Please retry.');
}
async function stage(actor, body, params, key, req) {
  if (params.sourceId) {
    A.capability(actor, 'upload');
    await A.resolveSource(prisma, actor, params.sourceType, params.sourceId);
  } else A.canStage(actor, params.sourceType);
  P.documentType(params.sourceType, params.documentType); A.sensitive(actor, params.documentType);
  if (typeof key !== 'string' || key.length < 8 || key.length > 100 || !/^[\w-]+$/.test(key)) throw P.fail(400, 'A valid Idempotency-Key is required.');
  const metadata = await validateFile(body, params.fileName, req.headers['content-type']?.split(';')[0]);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([params.sourceType, params.documentType, metadata])).digest('hex');
  const where = { uploadedBy_idempotencyKey: { uploadedBy: actor.userId, idempotencyKey: key } };
  const replay = await prisma.documentUpload.findUnique({ where });
  if (replay) {
    if (replay.fingerprint !== fingerprint) throw P.fail(409, 'Idempotency key was already used for different content.');
    if (replay.discardedAt || replay.expiresAt < new Date()) throw P.fail(410, 'Upload expired. Select the file again.');
    return { id: replay.id, ...metadata, documentType: replay.documentType, replay: true };
  }
  const pendingCount = await prisma.documentUpload.count({ where: { uploadedBy: actor.userId, documentId: null, discardedAt: null, expiresAt: { gt: new Date() } } });
  if (pendingCount >= 30) throw P.fail(429, 'Too many pending uploads. Remove unused files or finish a transaction.');
  await scan(body, metadata);
  const keyOnDisk = await storage().put(body);
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`document-stage:${actor.userId}`}, 0))::text`;
      const activeCount = await tx.documentUpload.count({ where: { uploadedBy: actor.userId, documentId: null, discardedAt: null, expiresAt: { gt: new Date() } } });
      if (activeCount >= 30) throw P.fail(429, 'Too many pending uploads. Remove unused files or finish a transaction.');
      const upload = await tx.documentUpload.create({ data: { ...metadata, sourceType: params.sourceType, documentType: params.documentType, uploadedBy: actor.userId, storageKey: keyOnDisk, idempotencyKey: key, fingerprint, expiresAt: new Date(Date.now() + 86400000) } });
      await audit(tx, actor, 'DOCUMENT_UPLOAD_STAGED', upload.id, { sourceType: upload.sourceType, sha256: upload.sha256 }, req);
      return upload;
    });
    return { id: result.id, ...metadata, documentType: result.documentType };
  } catch (error) {
    // Unknown commit outcomes must not delete potentially committed evidence.
    // The reconciler removes confirmed orphan objects after a 48-hour grace period.
    if (error.code === 'P2002') {
      const existing = await prisma.documentUpload.findUnique({ where });
      if (existing?.fingerprint === fingerprint) return { id: existing.id, ...metadata, documentType: existing.documentType, replay: true };
      throw P.fail(409, 'Upload conflicts with an existing request.');
    }
    throw error;
  }
}
async function uploadRecords(tx, actor, type, ids = []) {
  if (!Array.isArray(ids) || ids.length > P.MAX_FILES || new Set(ids).size !== ids.length) throw P.fail(400, 'Select at most five distinct documents.');
  ids.forEach(P.uuid);
  const uploads = await tx.documentUpload.findMany({ where: { id: { in: ids } } });
  if (uploads.length !== ids.length) throw P.fail(400, 'One or more uploads could not be found.');
  for (const u of uploads) {
    if (u.uploadedBy !== actor.userId || u.sourceType !== type) throw P.fail(403, 'Upload does not belong to this user and transaction module.');
    if (u.discardedAt || u.expiresAt <= new Date() || u.documentId) throw P.fail(409, 'Upload expired or was already attached.');
    P.documentType(type, u.documentType); A.sensitive(actor, u.documentType);
    await checkedContent(u);
  }
  return uploads;
}
async function validateSubmission(tx, actor, type, mode, ids = [], exceptionReason) {
  const uploads = await uploadRecords(tx, actor, type, ids);
  if (uploads.length) A.capability(actor, 'upload');
  if (exceptionReason !== undefined && exceptionReason !== null && exceptionReason !== '') {
    if (type !== 'EXPENSE' || typeof exceptionReason !== 'string' || exceptionReason.trim().length < 10 || exceptionReason.trim().length > 1000) throw P.fail(400, 'Receipt exception requires a reason between 10 and 1000 characters.');
  }
  const missing = P.requiredGroups(type, mode).filter(g => !uploads.some(u => g.includes(u.documentType)));
  if (missing.some(g => !(type === 'EXPENSE' && exceptionReason?.trim().length >= 10 && g.includes('EXPENSE_RECEIPT')))) throw P.fail(400, 'Required transaction evidence is missing. Attach the required receipt or payment proof.');
  return uploads;
}
async function attach(tx, actor, type, sourceId, ids = [], exceptionReason, req, enforce = true) {
  const source = await A.resolveSource(tx, actor, type, sourceId);
  const uploads = enforce ? await validateSubmission(tx, actor, type, source.paymentMode, ids, exceptionReason) : await uploadRecords(tx, actor, type, ids);
  if (uploads.length) A.capability(actor, 'upload');
  for (const u of uploads.sort((a, b) => a.id.localeCompare(b.id))) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${type}:${sourceId}:${u.sha256}`}, 0))::text`;
    if (await tx.transactionDocument.findFirst({ where: { sourceType: type, sourceId, sha256: u.sha256 } })) throw P.fail(409, 'This document already exists on this transaction.');
    const id = crypto.randomUUID();
    // Lock the intent before creating evidence; parallel claims cannot both succeed.
    const claimed = await tx.documentUpload.updateMany({ where: { id: u.id, documentId: null, discardedAt: null, expiresAt: { gt: new Date() } }, data: { expiresAt: new Date(Date.now() + 86400000) } });
    if (claimed.count !== 1) throw P.fail(409, 'Upload has already been consumed.');
    await tx.transactionDocument.create({ data: { id, rootDocumentId: id, sourceType: type, sourceId, documentType: u.documentType, originalFileName: u.originalFileName, storageKey: u.storageKey, mimeType: u.mimeType, fileSize: u.fileSize, sha256: u.sha256, uploadedBy: actor.userId } });
    await tx.documentUpload.update({ where: { id: u.id }, data: { documentId: id } });
    await audit(tx, actor, 'DOCUMENT_UPLOADED', id, { sourceType: type, sourceId, documentType: u.documentType, sha256: u.sha256 }, req);
  }
  if (exceptionReason?.trim()) {
    const exception = await tx.documentException.create({ data: { sourceType: type, sourceId, reason: exceptionReason.trim(), requestedBy: actor.userId } });
    await audit(tx, actor, 'DOCUMENT_EXCEPTION_REQUESTED', exception.id, { sourceType: type, sourceId, reason: exceptionReason.trim() }, req);
  }
  return source;
}
async function list(actor, type, id, page = 1) {
  A.capability(actor, 'view');
  page = Number(page);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw P.fail(400, 'Invalid document page.');
  const source = await A.resolveSource(prisma, actor, type, id);
  const baseWhere = { sourceType: type, sourceId: id };
  const canSensitive = A.finance(actor) && A.has(actor, 'document.sensitive');
  const where = { ...baseWhere, ...(!canSensitive ? { documentType: { notIn: ['CHEQUE_FRONT', 'CHEQUE_BACK'] } } : {}) };
  const docs = await prisma.transactionDocument.findMany({ where, orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }], include: { uploader: { select: { name: true } } }, take: 50, skip: (page - 1) * 50 });
  const total = await prisma.transactionDocument.count({ where });
  // Policy coverage must consider all versions, not only the displayed page.
  const coverage = await prisma.transactionDocument.groupBy({ by: ['documentType', 'status'], where: baseWhere });
  const exception = await prisma.documentException.findUnique({ where: { sourceType_sourceId: { sourceType: type, sourceId: id } } });
  const documents = docs.map(safeDocument);
  return { source, documents, total, page, pageSize: 50, exception, policy: P.policy(type, source.paymentMode), state: P.evidenceState(type, source.paymentMode, coverage, exception), capabilities: { upload: A.has(actor, 'document.upload'), download: A.has(actor, 'document.download'), sensitive: canSensitive, review: A.finance(actor) && A.has(actor, 'document.review'), replace: A.has(actor, 'document.replace'), archive: A.finance(actor) && A.has(actor, 'document.archive') } };
}
async function get(actor, id, action = 'view', db = prisma) {
  A.capability(actor, action); P.uuid(id);
  const doc = await db.transactionDocument.findUnique({ where: { id } });
  if (!doc) throw P.fail(404, 'Document not found.');
  A.sensitive(actor, doc.documentType);
  const source = await A.resolveSource(db, actor, doc.sourceType, doc.sourceId);
  return { doc, source };
}
async function transition(actor, id, action, reason, req) {
  return prisma.$transaction(async tx => {
    const { doc } = await get(actor, id, action === 'archive' ? 'archive' : 'review', tx);
    if (!['verify', 'reject', 'archive'].includes(action)) throw P.fail(400, 'Invalid review action.');
    if (action !== 'verify' && (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 1000)) throw P.fail(400, 'A reason between 5 and 1000 characters is required.');
    if (action !== 'archive' && doc.status !== 'PENDING_REVIEW') throw P.fail(409, 'Document has already been reviewed or replaced.');
    if (['REPLACED', 'ARCHIVED'].includes(doc.status)) throw P.fail(409, 'Historical evidence cannot be changed.');
    if (action === 'verify') await checkedContent(doc);
    const data = action === 'verify' ? { status: 'VERIFIED', verifiedBy: actor.userId, verifiedAt: new Date() }
      : action === 'reject' ? { status: 'REJECTED', rejectedBy: actor.userId, rejectedAt: new Date(), rejectionReason: reason.trim() }
      : { status: 'ARCHIVED', archivedBy: actor.userId, archivedAt: new Date(), archiveReason: reason.trim() };
    const changed = await tx.transactionDocument.updateMany({ where: { id, status: doc.status }, data });
    if (changed.count !== 1) throw P.fail(409, 'Document changed during review. Refresh and try again.');
    await audit(tx, actor, `DOCUMENT_${data.status}`, id, { sourceType: doc.sourceType, sourceId: doc.sourceId, previousStatus: doc.status, reason: reason || null }, req);
    return safeDocument(await tx.transactionDocument.findUnique({ where: { id } }));
  });
}
async function replace(actor, id, uploadId, req) {
  return prisma.$transaction(async tx => {
    const { doc } = await get(actor, id, 'replace', tx);
    const [u] = await uploadRecords(tx, actor, doc.sourceType, [uploadId]);
    if (u.documentType !== doc.documentType) throw P.fail(400, 'Replacement must have the same document type.');
    if (!['REJECTED', 'PENDING_REVIEW', 'VERIFIED'].includes(doc.status)) throw P.fail(409, 'This document has already been replaced or archived.');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${doc.sourceType}:${doc.sourceId}:${u.sha256}`}, 0))::text`;
    if (await tx.transactionDocument.findFirst({ where: { sourceType: doc.sourceType, sourceId: doc.sourceId, sha256: u.sha256 } })) throw P.fail(409, 'This document already exists on this transaction.');
    const changed = await tx.transactionDocument.updateMany({ where: { id, status: doc.status }, data: { status: 'REPLACED' } });
    if (changed.count !== 1) throw P.fail(409, 'Document changed during replacement. Refresh and try again.');
    const claimed = await tx.documentUpload.updateMany({ where: { id: u.id, documentId: null, discardedAt: null, expiresAt: { gt: new Date() } }, data: { expiresAt: new Date(Date.now() + 86400000) } });
    if (claimed.count !== 1) throw P.fail(409, 'Upload has already been consumed.');
    const replacement = await tx.transactionDocument.create({ data: { sourceType: doc.sourceType, sourceId: doc.sourceId, documentType: doc.documentType, rootDocumentId: doc.rootDocumentId, version: doc.version + 1, replacesDocumentId: doc.id, originalFileName: u.originalFileName, storageKey: u.storageKey, mimeType: u.mimeType, fileSize: u.fileSize, sha256: u.sha256, uploadedBy: actor.userId } });
    await tx.documentUpload.update({ where: { id: u.id }, data: { documentId: replacement.id } });
    await audit(tx, actor, 'DOCUMENT_REPLACED', replacement.id, { sourceType: doc.sourceType, sourceId: doc.sourceId, replacesDocumentId: id, previousStatus: doc.status, version: replacement.version }, req);
    return safeDocument(replacement);
  });
}
async function content(actor, id, download, req) {
  const { doc } = await get(actor, id, download ? 'download' : 'view');
  const buffer = await checkedContent(doc);
  await audit(prisma, actor, download ? 'DOCUMENT_DOWNLOADED' : 'DOCUMENT_VIEWED', id, { sourceType: doc.sourceType, sourceId: doc.sourceId }, req);
  return { ...(download ? { buffer, mimeType: doc.mimeType } : await preview(buffer, doc.mimeType)), name: doc.originalFileName };
}
module.exports = { stage, attach, validateSubmission, list, get, transition, replace, content, audit, safeDocument };
