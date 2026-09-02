const prisma = require('../config/db');

/**
 * Payment Plan Management Service (Phase 7A)
 */

/**
 * Create a new Payment Plan with its Milestones
 */
async function createPaymentPlan({
  name,
  projectLocation,
  description,
  milestones,
  createdById
}) {
  if (!name || !name.trim()) {
    throw { status: 400, message: 'Payment plan name is compulsory.' };
  }

  const cleanName = name.trim().toUpperCase();

  const existing = await prisma.paymentPlan.findUnique({
    where: { name: cleanName }
  });

  if (existing) {
    throw { status: 409, message: `Payment plan with name "${cleanName}" already exists.` };
  }

  if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
    throw { status: 400, message: 'At least one milestone is required to create a payment plan.' };
  }

  // Validate milestones
  let totalPercentage = 0;
  const seenSequences = new Set();

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    const seq = m.sequence !== undefined ? parseInt(m.sequence, 10) : i + 1;
    if (isNaN(seq) || seq <= 0) {
      throw { status: 400, message: `Invalid milestone sequence at index ${i}. Must be a positive integer.` };
    }
    if (seenSequences.has(seq)) {
      throw { status: 400, message: `Duplicate milestone sequence ${seq} found in plan.` };
    }
    seenSequences.add(seq);

    if (!m.name || !m.name.trim()) {
      throw { status: 400, message: `Milestone at sequence ${seq} requires a descriptive name.` };
    }

    const calcType = m.calculationType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE';
    if (calcType === 'PERCENTAGE') {
      const pct = parseFloat(m.percentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        throw { status: 400, message: `Milestone "${m.name}" percentage must be greater than 0 and <= 100.` };
      }
      totalPercentage += pct;
    } else {
      const amt = parseFloat(m.fixedAmount);
      if (isNaN(amt) || amt <= 0) {
        throw { status: 400, message: `Milestone "${m.name}" fixed amount must be greater than 0.` };
      }
    }
  }

  // If all milestones are percentage-based, enforce 100% total sum
  const allPercentage = milestones.every(m => (m.calculationType || 'PERCENTAGE') === 'PERCENTAGE');
  if (allPercentage && Math.abs(totalPercentage - 100.00) > 0.01) {
    throw {
      status: 400,
      message: `Invalid Payment Plan: Milestone percentages sum to ${totalPercentage.toFixed(2)}%. Total must equal exactly 100.00%.`
    };
  }

  // Create plan and milestones atomically
  return await prisma.$transaction(async (tx) => {
    const plan = await tx.paymentPlan.create({
      data: {
        name: cleanName,
        projectLocation: projectLocation ? projectLocation.trim() : null,
        description: description ? description.trim() : null,
        createdById: createdById || null
      }
    });

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const seq = m.sequence !== undefined ? parseInt(m.sequence, 10) : i + 1;
      const calcType = m.calculationType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE';
      await tx.paymentPlanMilestone.create({
        data: {
          planId: plan.id,
          sequence: seq,
          name: m.name.trim(),
          calculationType: calcType,
          percentage: calcType === 'PERCENTAGE' ? parseFloat(m.percentage) : null,
          fixedAmount: calcType === 'FIXED_AMOUNT' ? parseFloat(m.fixedAmount) : null,
          dueDaysAfterTrigger: m.dueDaysAfterTrigger ? parseInt(m.dueDaysAfterTrigger, 10) : 15,
          isTaxable: Boolean(m.isTaxable)
        }
      });
    }

    return await tx.paymentPlan.findUnique({
      where: { id: plan.id },
      include: {
        milestones: {
          orderBy: { sequence: 'asc' }
        }
      }
    });
  });
}

/**
 * List all Payment Plans
 */
async function listPaymentPlans({ status } = {}) {
  const where = {};
  if (status) where.status = status;

  return await prisma.paymentPlan.findMany({
    where,
    include: {
      milestones: {
        orderBy: { sequence: 'asc' }
      },
      _count: {
        select: { customers: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get Payment Plan by ID
 */
async function getPaymentPlanById(id) {
  const plan = await prisma.paymentPlan.findUnique({
    where: { id },
    include: {
      milestones: {
        orderBy: { sequence: 'asc' }
      },
      customers: {
        select: {
          id: true,
          customerName: true,
          plotNo: true,
          totalContractValue: true,
          status: true
        }
      }
    }
  });

  if (!plan) {
    throw { status: 404, message: 'Payment plan not found.' };
  }

  return plan;
}

/**
 * Assign Payment Plan to a Customer
 */
async function assignPlanToCustomer({ customerId, planId, actorId }) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    throw { status: 404, message: 'Customer not found.' };
  }

  const plan = await prisma.paymentPlan.findUnique({
    where: { id: planId },
    include: { milestones: { orderBy: { sequence: 'asc' } } }
  });

  if (!plan) {
    throw { status: 404, message: 'Payment plan not found.' };
  }

  if (plan.status !== 'ACTIVE') {
    throw { status: 400, message: 'Cannot assign an inactive payment plan.' };
  }

  return await prisma.customer.update({
    where: { id: customerId },
    data: { paymentPlanId: planId },
    include: {
      paymentPlan: {
        include: { milestones: { orderBy: { sequence: 'asc' } } }
      }
    }
  });
}

module.exports = {
  createPaymentPlan,
  listPaymentPlans,
  getPaymentPlanById,
  assignPlanToCustomer
};
