const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const S = require('../services/documents/service');
const A = require('../services/documents/sources');
const P = require('../services/documents/policy');
const R = require('../services/documents/review');
const router = express.Router();
const run = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
router.use(verifyJWT);
router.use(async (req, res, next) => {
  try { req.documentActor = await A.actorFrom(db, req.user.userId || req.user.id); req.user = req.documentActor; next(); } catch (error) { next(error); }
});
router.get('/policy', checkPermission(['document.view', 'document.upload']), run(async (req, res) => res.json({ success: true, policy: P.policy(req.query.sourceType, req.query.paymentMode || 'CASH') })));
router.post('/uploads', checkPermission('document.upload'), rateLimit({ windowMs: 60000, limit: 12, standardHeaders: true, legacyHeaders: false }), express.raw({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], limit: P.MAX_BYTES, inflate: false }), run(async (req, res) => {
  const upload = await S.stage(req.documentActor, req.body, req.query, req.headers['idempotency-key'], req);
  res.status(201).json({ success: true, upload });
}));
router.post('/uploads/:id/discard', checkPermission('document.upload'), run(async (req, res) => {
  P.uuid(req.params.id);
  await db.documentUpload.updateMany({ where: { id: req.params.id, uploadedBy: req.documentActor.userId, documentId: null }, data: { discardedAt: new Date() } });
  res.json({ success: true });
}));
router.get('/review', checkPermission('document.review'), run(async (req, res) => res.json({ success: true, ...await R.queue(req.documentActor, req.query) })));
router.get('/transactions', checkPermission('document.review'), run(async (req, res) => res.json({ success: true, ...await R.transactions(req.documentActor, req.query) })));
router.get('/summary', checkPermission('document.review'), run(async (req, res) => res.json({ success: true, ...await R.summary(req.documentActor) })));
router.get('/journal/:id', checkPermission('document.view'), run(async (req, res) => res.json({ success: true, ...await R.journalSource(req.documentActor, req.params.id) })));
router.get('/', checkPermission('document.view'), run(async (req, res) => res.json({ success: true, ...await S.list(req.documentActor, req.query.sourceType, req.query.sourceId, req.query.page) })));
router.post('/', checkPermission('document.upload'), run(async (req, res) => {
  const { sourceType, sourceId, uploadIds } = req.body;
  await db.$transaction(tx => S.attach(tx, req.documentActor, sourceType, sourceId, uploadIds, null, req, false), { timeout: 20000 });
  res.status(201).json({ success: true, ...await S.list(req.documentActor, sourceType, sourceId) });
}));
router.post('/exceptions/:id/:action', checkPermission('document.review'), run(async (req, res) => {
  A.capability(req.documentActor, 'review'); P.uuid(req.params.id);
  const action = req.params.action;
  if (!['verify', 'reject'].includes(action)) throw P.fail(400, 'Invalid exception action.');
  const reason = req.body.reason;
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 1000) throw P.fail(400, 'Review reason is required (5–1000 characters).');
  await db.$transaction(async tx => {
    const exception = await tx.documentException.findUnique({ where: { id: req.params.id } });
    if (!exception) throw P.fail(404, 'Exception not found.');
    await A.resolveSource(tx, req.documentActor, exception.sourceType, exception.sourceId);
    const changed = await tx.documentException.updateMany({ where: { id: exception.id, status: 'PENDING_REVIEW' }, data: { status: action === 'verify' ? 'VERIFIED' : 'REJECTED', reviewedBy: req.documentActor.userId, reviewedAt: new Date(), reviewReason: reason.trim() } });
    if (changed.count !== 1) throw P.fail(409, 'Exception has already been reviewed.');
    await S.audit(tx, req.documentActor, `DOCUMENT_EXCEPTION_${action.toUpperCase()}`, exception.id, { sourceType: exception.sourceType, sourceId: exception.sourceId, reason }, req);
  });
  res.json({ success: true });
}));
router.get('/:id', checkPermission('document.view'), run(async (req, res) => {
  const { doc, source } = await S.get(req.documentActor, req.params.id);
  const history = await db.transactionDocument.findMany({ where: { rootDocumentId: doc.rootDocumentId }, orderBy: { version: 'asc' } });
  const events = await db.auditLog.findMany({ where: { entityType: 'TRANSACTION_DOCUMENT', entityId: { in: history.map(d => d.id) } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, document: S.safeDocument(doc), source, history: history.map(S.safeDocument), events });
}));
for (const action of ['preview', 'download']) router.get(`/:id/${action}`, checkPermission(action === 'download' ? 'document.download' : 'document.view'), run(async (req, res) => {
  const file = await S.content(req.documentActor, req.params.id, action === 'download', req);
  res.set({ 'Content-Type': file.mimeType, 'Content-Disposition': `${action === 'download' ? 'attachment' : 'inline'}; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'", 'Cross-Origin-Resource-Policy': 'same-origin' });
  res.send(file.buffer);
}));
for (const action of ['verify', 'reject', 'archive']) router.post(`/:id/${action}`, checkPermission(action === 'archive' ? 'document.archive' : 'document.review'), run(async (req, res) => res.json({ success: true, document: await S.transition(req.documentActor, req.params.id, action, req.body.reason, req) })));
router.post('/:id/replace', checkPermission('document.replace'), run(async (req, res) => res.json({ success: true, document: await S.replace(req.documentActor, req.params.id, req.body.uploadId, req) })));
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.code === 'P2002' || error.code === 'P2034' ? 409 : error.statusCode || 500;
  res.status(status).json({ success: false, message: status === 413 ? 'File exceeds the maximum allowed size (10 MB).' : status === 409 && !error.isOperational ? 'Document changed concurrently. Refresh and retry.' : error.isOperational ? error.message : 'Document operation could not be completed. Please retry.' });
});
module.exports = router;
