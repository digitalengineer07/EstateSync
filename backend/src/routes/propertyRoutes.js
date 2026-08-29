const express = require('express');
const router = express.Router();
const propertyController = require('../controller/propertyController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const idempotencyMiddleware = require('../middleware/idempotencyMiddleware');

// 1. Create a new Land/Property Acquisition record (Admin / Accounting only, Idempotent)
router.post(
  '/',
  verifyJWT,
  idempotencyMiddleware,
  checkPermission('property.create'),
  propertyController.createProperty
);

// 2. List all Property Acquisitions (Admin & Accounting)
router.get(
  '/',
  verifyJWT,
  checkPermission('property.view_all'),
  propertyController.getProperties
);

// 3. Get detailed Property Acquisition record by ID
router.get(
  '/:id',
  verifyJWT,
  checkPermission('property.view_all'),
  propertyController.getPropertyById
);

// 4. Update non-financial fields of a Property Acquisition
router.put(
  '/:id',
  verifyJWT,
  checkPermission('property.edit'),
  propertyController.updateProperty
);

// 5. Record a Payout Disbursement to Land Owner (Accounting / Admin only, Idempotent)
router.post(
  '/:id/payments',
  verifyJWT,
  idempotencyMiddleware,
  checkPermission('property.payment.record'),
  propertyController.recordPayment
);

module.exports = router;
