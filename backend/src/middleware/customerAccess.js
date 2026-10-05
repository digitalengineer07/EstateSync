const db = require('../config/db');
const canViewAll = user => user.role === 'ADMIN' || user.permissions?.includes('customer.view_all');
const customerScope = user => canViewAll(user) ? {} : { salesOwnerId: user.userId };
async function requireCustomerAccess(req, res, next) {
  try {
    let id = req.body?.customerId || req.params.id;
    if (req.path.endsWith('/cancel')) {
      const demand = await db.customerDemandNote.findUnique({ where: { id: req.params.id }, select: { customerId: true } });
      if (!demand) return res.status(404).json({ success: false, message: 'Demand not found' });
      id = demand.customerId;
    }
    if (typeof id !== 'string' || !id) return res.status(400).json({ success: false, message: 'Customer ID is required' });
    const customer = await db.customer.findFirst({ where: { id, ...customerScope(req.user) }, select: { id: true } });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found or access denied' });
    next();
  } catch (error) { next(error); }
}
module.exports = { canViewAll, customerScope, requireCustomerAccess };
