const prisma = require('../config/db');

/**
 * Get System Audit Logs (Admin & Accounting visibility)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, entityType, limit = 50 } = req.query;

    const whereClause = {};
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10)
    });

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error fetching audit logs' });
  }
};
