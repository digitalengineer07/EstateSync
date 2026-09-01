const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const VALID_COMPONENT_TYPES = ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT'];
const VALID_CALCULATION_METHODS = [
  'FIXED_AMOUNT',
  'PERCENTAGE_OF_BASIC',
  'PERCENTAGE_OF_GROSS',
  'PERCENTAGE_OF_COMPONENT',
  'MANUAL_AMOUNT'
];

/**
 * 1. Create a new Salary Component
 * POST /api/v1/payroll/components
 */
exports.createSalaryComponent = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      componentType,
      calculationMethod,
      calculationBase,
      defaultValue = 0,
      percentageValue = 0,
      sequence = 1,
      isTaxable = true,
      isRecurring = true,
      glAccountCode
    } = req.body;

    const trimmedCode = code ? code.trim().toUpperCase() : '';
    const trimmedName = name ? name.trim() : '';

    if (!trimmedCode || !trimmedName || !componentType || !calculationMethod) {
      return res.status(400).json({
        success: false,
        message: 'Component Code, Name, Component Type, and Calculation Method are required.'
      });
    }

    if (!VALID_COMPONENT_TYPES.includes(componentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Component Type. Must be one of: ${VALID_COMPONENT_TYPES.join(', ')}`
      });
    }

    if (!VALID_CALCULATION_METHODS.includes(calculationMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Calculation Method. Must be one of: ${VALID_CALCULATION_METHODS.join(', ')}`
      });
    }

    const numPct = Number(percentageValue);
    if (isNaN(numPct) || numPct < 0 || numPct > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage Value must be a valid number between 0 and 100.'
      });
    }

    const numDefault = Number(defaultValue);
    if (isNaN(numDefault) || numDefault < 0) {
      return res.status(400).json({
        success: false,
        message: 'Default Value cannot be negative.'
      });
    }

    const existing = await prisma.salaryComponent.findUnique({
      where: { code: trimmedCode }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Salary Component with code "${trimmedCode}" already exists (${existing.name}).`
      });
    }

    const component = await prisma.$transaction(async (tx) => {
      const comp = await tx.salaryComponent.create({
        data: {
          code: trimmedCode,
          name: trimmedName,
          description: description ? description.trim() : null,
          componentType,
          calculationMethod,
          calculationBase: calculationBase ? calculationBase.trim().toUpperCase() : null,
          defaultValue: numDefault,
          percentageValue: numPct,
          sequence: parseInt(sequence, 10) || 1,
          isTaxable: Boolean(isTaxable),
          isRecurring: Boolean(isRecurring),
          isActive: true,
          glAccountCode: glAccountCode ? glAccountCode.trim() : null,
          createdBy: req.user?.email || 'SYSTEM',
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'SALARY_COMPONENT_CREATE',
        entityType: 'SALARY_COMPONENT',
        entityId: comp.id,
        newValues: {
          code: comp.code,
          name: comp.name,
          componentType: comp.componentType,
          calculationMethod: comp.calculationMethod
        },
        req,
        tx
      });

      return comp;
    });

    return res.status(201).json({
      success: true,
      message: `Salary Component "${component.name}" (${component.code}) created successfully.`,
      component
    });
  } catch (error) {
    console.error('Create Salary Component Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating salary component' });
  }
};

/**
 * 2. Get/List Salary Components
 * GET /api/v1/payroll/components
 */
exports.getSalaryComponents = async (req, res) => {
  try {
    const { componentType, isActive, search } = req.query;

    const where = {};
    if (componentType && componentType !== 'ALL') {
      where.componentType = componentType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } }
      ];
    }

    const components = await prisma.salaryComponent.findMany({
      where,
      orderBy: [{ sequence: 'asc' }, { code: 'asc' }]
    });

    return res.json({
      success: true,
      count: components.length,
      components
    });
  } catch (error) {
    console.error('Get Salary Components Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching salary components' });
  }
};

/**
 * 3. Get Salary Component by ID
 * GET /api/v1/payroll/components/:id
 */
exports.getSalaryComponentById = async (req, res) => {
  try {
    const { id } = req.params;

    const component = await prisma.salaryComponent.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }]
      }
    });

    if (!component) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }

    return res.json({ success: true, component });
  } catch (error) {
    console.error('Get Salary Component By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching salary component' });
  }
};

/**
 * 4. Update Salary Component
 * PATCH /api/v1/payroll/components/:id
 */
exports.updateSalaryComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      calculationMethod,
      calculationBase,
      defaultValue,
      percentageValue,
      sequence,
      isTaxable,
      isRecurring,
      isActive,
      glAccountCode
    } = req.body;

    const existing = await prisma.salaryComponent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }

    if (calculationMethod && !VALID_CALCULATION_METHODS.includes(calculationMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Calculation Method. Must be one of: ${VALID_CALCULATION_METHODS.join(', ')}`
      });
    }

    if (percentageValue !== undefined) {
      const numPct = Number(percentageValue);
      if (isNaN(numPct) || numPct < 0 || numPct > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage Value must be a valid number between 0 and 100.'
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const comp = await tx.salaryComponent.update({
        where: { id },
        data: {
          name: name ? name.trim() : existing.name,
          description: description !== undefined ? (description ? description.trim() : null) : existing.description,
          calculationMethod: calculationMethod || existing.calculationMethod,
          calculationBase: calculationBase !== undefined ? (calculationBase ? calculationBase.trim().toUpperCase() : null) : existing.calculationBase,
          defaultValue: defaultValue !== undefined ? Number(defaultValue) : existing.defaultValue,
          percentageValue: percentageValue !== undefined ? Number(percentageValue) : existing.percentageValue,
          sequence: sequence !== undefined ? parseInt(sequence, 10) : existing.sequence,
          isTaxable: isTaxable !== undefined ? Boolean(isTaxable) : existing.isTaxable,
          isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : existing.isRecurring,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
          glAccountCode: glAccountCode !== undefined ? (glAccountCode ? glAccountCode.trim() : null) : existing.glAccountCode,
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'SALARY_COMPONENT_UPDATE',
        entityType: 'SALARY_COMPONENT',
        entityId: id,
        oldValues: { name: existing.name, percentageValue: existing.percentageValue, defaultValue: existing.defaultValue },
        newValues: { name: comp.name, percentageValue: comp.percentageValue, defaultValue: comp.defaultValue },
        req,
        tx
      });

      return comp;
    });

    return res.json({
      success: true,
      message: `Salary Component "${updated.name}" updated successfully.`,
      component: updated
    });
  } catch (error) {
    console.error('Update Salary Component Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating salary component' });
  }
};
