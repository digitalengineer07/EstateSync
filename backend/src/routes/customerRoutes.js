const express = require('express');
const router = express.Router();
const customerController = require('../controller/customerController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const idempotencyMiddleware = require('../middleware/idempotencyMiddleware');

// 1. Create a new Customer Profile with Commercial terms (Sales / Admin)
router.post(
  '/',
  verifyJWT,
  idempotencyMiddleware,
  checkPermission('customer.create'),
  customerController.createCustomer
);

// 2. List Customers (Sales sees own, Admin/Accounting sees all)
router.get(
  '/',
  verifyJWT,
  checkPermission(['customer.view', 'customer.view_all']),
  customerController.getCustomers
);

// 3. Get detailed Customer profile by ID
router.get(
  '/:id',
  verifyJWT,
  checkPermission(['customer.view', 'customer.view_all']),
  customerController.getCustomerById
);

// 4. Update non-financial fields of a Customer (Sales own, Admin all)
router.put(
  '/:id',
  verifyJWT,
  checkPermission('customer.edit'),
  customerController.updateCustomer
);

// 5. Record a Customer Collection Payment (Accounting / Admin only, Idempotent)
router.post(
  '/:id/payments',
  verifyJWT,
  idempotencyMiddleware,
  checkPermission('customer.payment.record'),
  customerController.recordPayment
);

// 6. Settle Customer Cancellation & Refund Payout (Accounting / Admin only, Idempotent)
router.post(
  '/:id/settle-cancellation',
  verifyJWT,
  idempotencyMiddleware,
  checkPermission('customer.payment.record'),
  customerController.settleCustomerCancellationRefund
);

module.exports = router;
