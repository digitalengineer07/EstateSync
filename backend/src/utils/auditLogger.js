const prisma = require('../config/db');

/**
 * Record a security, financial, or system audit event.
 */
async function logAudit({
  actorId,
  actorEmail,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  req = null,
  tx = null
}) {
  try {
    const db = tx || prisma;
    const ip = req?.ip || req?.socket?.remoteAddress || null;
    const agent = req?.headers ? req.headers['user-agent'] || '' : null;

    return await db.auditLog.create({
      data: {
        actorId: actorId || (req?.user?.userId ?? null),
        actorEmail: actorEmail || (req?.user?.email ?? null),
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        oldValues: oldValues ? (typeof oldValues === 'object' ? oldValues : { value: oldValues }) : null,
        newValues: newValues ? (typeof newValues === 'object' ? newValues : { value: newValues }) : null,
        ipAddress: ip ? String(ip).slice(0, 100) : null,
        userAgent: agent ? String(agent).slice(0, 255) : null
      }
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
    if (tx || require('./transactionContext').context.getStore()) throw Object.assign(new Error('Audit record could not be saved'), { status: 503, statusCode: 503, isOperational: true });
    // Non-transactional authentication logging must not take down login.
    return null;
  }
}

module.exports = { logAudit };
