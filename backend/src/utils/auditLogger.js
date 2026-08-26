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
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '') : null;
    const agent = req ? req.headers['user-agent'] || '' : null;

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
    // Do not crash the entire request if audit logging fails
    return null;
  }
}

module.exports = { logAudit };
