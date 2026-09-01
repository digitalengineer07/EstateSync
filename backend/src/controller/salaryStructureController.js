const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * 1. Create Salary Structure with itemized lines
 * POST /api/v1/payroll/structures
 */
exports.createSalaryStructure = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      currency = 'INR',
      effectiveFrom,
      lines = []
    } = req.body;

    const trimmedCode = code ? code.trim().toUpperCase() : '';
    const trimmedName = name ? name.trim() : '';

    if (!trimmedCode || !trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Structure Code and Structure Name are required.'
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A Salary Structure must contain at least one Salary Component line item.'
      });
    }

    // 1. Check duplicate component IDs in the lines payload
    const seenComponentIds = new Set();
    for (const line of lines) {
      if (!line.componentId) {
        return res.status(400).json({ success: false, message: 'Each line item must have a valid componentId.' });
      }
      if (seenComponentIds.has(line.componentId)) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate salary components within the same structure are not permitted.'
        });
      }
      seenComponentIds.add(line.componentId);
    }

    // 2. Check structure code uniqueness
    const existing = await prisma.salaryStructure.findUnique({
      where: { code: trimmedCode }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Salary Structure with code "${trimmedCode}" already exists (${existing.name}).`
      });
    }

    // 3. Verify all components exist and are active
    const components = await prisma.salaryComponent.findMany({
      where: { id: { in: Array.from(seenComponentIds) } }
    });

    if (components.length !== seenComponentIds.size) {
      return res.status(400).json({
        success: false,
        message: 'One or more referenced salary components do not exist.'
      });
    }

    const inactiveComp = components.find(c => !c.isActive);
    if (inactiveComp) {
      return res.status(400).json({
        success: false,
        message: `Cannot add inactive salary component "${inactiveComp.name}" to a new structure.`
      });
    }

    const compMap = new Map(components.map(c => [c.id, c]));

    const result = await prisma.$transaction(async (tx) => {
      const structure = await tx.salaryStructure.create({
        data: {
          code: trimmedCode,
          name: trimmedName,
          description: description ? description.trim() : null,
          currency,
          status: 'ACTIVE',
          version: 1,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
          createdBy: req.user?.email || 'SYSTEM',
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      const lineData = lines.map((line, idx) => {
        const comp = compMap.get(line.componentId);
        return {
          structureId: structure.id,
          componentId: line.componentId,
          calculationMethod: line.calculationMethod || comp.calculationMethod,
          value: line.value !== undefined ? Number(line.value) : Number(comp.defaultValue),
          percentage: line.percentage !== undefined ? Number(line.percentage) : Number(comp.percentageValue),
          calculationBase: line.calculationBase || comp.calculationBase,
          sequence: line.sequence !== undefined ? parseInt(line.sequence, 10) : (comp.sequence || (idx + 1)),
          isMandatory: line.isMandatory !== undefined ? Boolean(line.isMandatory) : true,
          isActive: true
        };
      });

      await tx.salaryStructureLine.createMany({
        data: lineData
      });

      const fullStructure = await tx.salaryStructure.findUnique({
        where: { id: structure.id },
        include: {
          lines: {
            include: { component: true },
            orderBy: { sequence: 'asc' }
          }
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'SALARY_STRUCTURE_CREATE',
        entityType: 'SALARY_STRUCTURE',
        entityId: structure.id,
        newValues: {
          code: structure.code,
          name: structure.name,
          lineCount: lines.length
        },
        req,
        tx
      });

      return fullStructure;
    });

    return res.status(201).json({
      success: true,
      message: `Salary Structure "${result.name}" (${result.code}) created successfully.`,
      structure: result
    });
  } catch (error) {
    console.error('Create Salary Structure Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating salary structure' });
  }
};

/**
 * 2. Get/List Salary Structures
 * GET /api/v1/payroll/structures
 */
exports.getSalaryStructures = async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } }
      ];
    }

    const structures = await prisma.salaryStructure.findMany({
      where,
      include: {
        lines: {
          include: { component: true },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { assignments: true }
        }
      },
      orderBy: { code: 'asc' }
    });

    return res.json({
      success: true,
      count: structures.length,
      structures
    });
  } catch (error) {
    console.error('Get Salary Structures Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching salary structures' });
  }
};

/**
 * 3. Get Salary Structure by ID with full itemized lines
 * GET /api/v1/payroll/structures/:id
 */
exports.getSalaryStructureById = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await prisma.salaryStructure.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }]
      },
      include: {
        lines: {
          include: { component: true },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { assignments: true }
        }
      }
    });

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    return res.json({ success: true, structure });
  } catch (error) {
    console.error('Get Salary Structure By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching salary structure' });
  }
};

/**
 * 4. Archive / Deactivate Salary Structure
 * POST /api/v1/payroll/structures/:id/archive
 */
exports.archiveSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.salaryStructure.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    const archived = await prisma.$transaction(async (tx) => {
      const struct = await tx.salaryStructure.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'SALARY_STRUCTURE_ARCHIVE',
        entityType: 'SALARY_STRUCTURE',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: 'ARCHIVED' },
        req,
        tx
      });

      return struct;
    });

    return res.json({
      success: true,
      message: `Salary Structure "${archived.name}" has been archived.`,
      structure: archived
    });
  } catch (error) {
    console.error('Archive Salary Structure Error:', error);
    return res.status(500).json({ success: false, message: 'Server error archiving salary structure' });
  }
};
