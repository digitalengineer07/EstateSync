const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const salaryService = require('../services/salaryService');

/**
 * Generate next sequential Employee Code (e.g. EMP-000001, EMP-000002)
 */
async function generateNextEmployeeCode(tx = prisma) {
  const employees = await tx.employee.findMany({
    where: { employeeCode: { startsWith: 'EMP-' } },
    select: { employeeCode: true }
  });

  let maxSeq = 0;
  for (const emp of employees) {
    const parts = emp.employeeCode.split('-');
    if (parts.length >= 2) {
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  return `EMP-${String(maxSeq + 1).padStart(6, '0')}`;
}

/**
 * 1. Register a new Employee Master record
 * POST /api/v1/employees
 */
exports.createEmployee = async (req, res) => {
  try {
    const {
      employeeCode,
      fullName,
      displayName,
      photo,
      mobile,
      alternatePhone,
      email,
      address,
      department,
      designation,
      employmentType = 'FULL_TIME',
      joiningDate,
      confirmationDate,
      reportingManagerId,
      workLocation = 'Head Office',
      userId
    } = req.body;

    const trimmedName = fullName ? fullName.trim() : '';
    const trimmedMobile = mobile ? mobile.trim() : '';
    const trimmedEmail = email ? email.trim().toLowerCase() : null;
    const trimmedDept = department ? department.trim() : '';
    const trimmedDesignation = designation ? designation.trim() : '';

    if (!trimmedName || !trimmedMobile || !trimmedDept || !trimmedDesignation || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Mobile Number, Department, Designation, and Joining Date are compulsory.'
      });
    }

    const parsedJoiningDate = new Date(joiningDate);
    if (isNaN(parsedJoiningDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Joining Date format.'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Employee Code Generation or Verification
      let finalCode = employeeCode ? employeeCode.trim().toUpperCase() : null;
      if (finalCode) {
        const existingCode = await tx.employee.findUnique({
          where: { employeeCode: finalCode }
        });
        if (existingCode) {
          throw { status: 409, message: `Employee Code "${finalCode}" is already assigned to ${existingCode.fullName}.` };
        }
      } else {
        finalCode = await generateNextEmployeeCode(tx);
      }

      // 2. Check Unique Mobile
      const existingMobile = await tx.employee.findUnique({
        where: { mobile: trimmedMobile }
      });
      if (existingMobile) {
        throw { status: 409, message: `Mobile number "${trimmedMobile}" is already registered for employee ${existingMobile.fullName} (${existingMobile.employeeCode}).` };
      }

      // 3. Check Unique Email if provided
      if (trimmedEmail) {
        const existingEmail = await tx.employee.findUnique({
          where: { email: trimmedEmail }
        });
        if (existingEmail) {
          throw { status: 409, message: `Email "${trimmedEmail}" is already registered for employee ${existingEmail.fullName} (${existingEmail.employeeCode}).` };
        }
      }

      // 4. Verify Reporting Manager if specified
      if (reportingManagerId) {
        const manager = await tx.employee.findUnique({
          where: { id: reportingManagerId }
        });
        if (!manager) {
          throw { status: 400, message: 'Specified reporting manager does not exist.' };
        }
      }

      // 5. Verify User Account if specified
      if (userId) {
        const targetUser = await tx.user.findUnique({
          where: { id: userId }
        });
        if (!targetUser) {
          throw { status: 404, message: 'Specified User account to link does not exist.' };
        }

        const existingUserLink = await tx.employee.findUnique({
          where: { userId }
        });
        if (existingUserLink) {
          throw { status: 409, message: `User account "${targetUser.email}" is already linked to employee ${existingUserLink.fullName} (${existingUserLink.employeeCode}).` };
        }
      }

      // 6. Create Employee Record
      const newEmployee = await tx.employee.create({
        data: {
          employeeCode: finalCode,
          fullName: trimmedName,
          displayName: displayName ? displayName.trim() : trimmedName,
          photo: photo ? photo.trim() : null,
          mobile: trimmedMobile,
          alternatePhone: alternatePhone ? alternatePhone.trim() : null,
          email: trimmedEmail,
          address: address ? address.trim() : null,
          department: trimmedDept,
          designation: trimmedDesignation,
          employmentType,
          joiningDate: parsedJoiningDate,
          confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
          reportingManagerId: reportingManagerId || null,
          workLocation: workLocation ? workLocation.trim() : 'Head Office',
          status: 'ACTIVE',
          userId: userId || null,
          createdBy: req.user?.email || 'SYSTEM'
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: { select: { name: true } } }
          },
          reportingManager: {
            select: { id: true, employeeCode: true, fullName: true, designation: true }
          }
        }
      });

      // 7. Record Security Audit Log
      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'EMPLOYEE_CREATE',
        entityType: 'EMPLOYEE',
        entityId: newEmployee.id,
        newValues: {
          employeeCode: newEmployee.employeeCode,
          fullName: newEmployee.fullName,
          department: newEmployee.department,
          designation: newEmployee.designation,
          userId: newEmployee.userId,
          status: newEmployee.status
        },
        req,
        tx
      });

      return newEmployee;
    }, { timeout: 15000, maxWait: 10000 });

    // Attach salary info if provided by Admin
    if (req.user?.role === 'ADMIN' && (req.body.baseSalary !== undefined || req.body.bankName)) {
      const numSal = parseFloat(req.body.baseSalary || 0);
      await prisma.$executeRawUnsafe(`
        UPDATE "Employee"
        SET 
          "baseSalary" = $1,
          "bankName" = $2,
          "bankAccountNo" = $3,
          "ifscCode" = $4,
          "upiId" = $5,
          "paymentMethod" = $6
        WHERE "id" = $7
      `, isNaN(numSal) ? 0 : numSal, req.body.bankName || null, req.body.bankAccountNo || null, req.body.ifscCode ? req.body.ifscCode.trim().toUpperCase() : null, req.body.upiId || null, req.body.paymentMethod || 'BANK_TRANSFER', result.id);
      result.baseSalary = isNaN(numSal) ? 0 : numSal;
      result.bankName = req.body.bankName || null;
      result.bankAccountNo = req.body.bankAccountNo || null;
      result.ifscCode = req.body.ifscCode || null;
      result.upiId = req.body.upiId || null;
    }

    return res.status(201).json({
      success: true,
      message: `Employee ${result.fullName} (${result.employeeCode}) registered successfully.`,
      employee: result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Create Employee Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating employee' });
  }
};

/**
 * 2. Get/Search Employees with filtering and pagination
 * GET /api/v1/employees
 */
exports.getEmployees = async (req, res) => {
  try {
    const {
      search,
      department,
      designation,
      employmentType,
      status,
      hasLogin,
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    // Status filter (default to all or specific)
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Department filter
    if (department && department !== 'ALL') {
      where.department = { equals: department, mode: 'insensitive' };
    }

    // Designation filter
    if (designation && designation !== 'ALL') {
      where.designation = { equals: designation, mode: 'insensitive' };
    }

    // Employment type filter
    if (employmentType && employmentType !== 'ALL') {
      where.employmentType = employmentType;
    }

    // Login status filter
    if (hasLogin === 'true') {
      where.userId = { not: null };
    } else if (hasLogin === 'false') {
      where.userId = null;
    }

    // Keyword Search
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
        { mobile: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { department: { contains: term, mode: 'insensitive' } },
        { designation: { contains: term, mode: 'insensitive' } }
      ];
    }

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: { select: { id: true, name: true } }
            }
          },
          reportingManager: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              designation: true
            }
          }
        },
        orderBy: [{ status: 'asc' }, { employeeCode: 'asc' }],
        skip,
        take: limitNum
      })
    ]);

    // Enhance employees with salary details for authorized roles (ADMIN, ACCOUNTING, MANAGER)
    const canViewSalary = ['ADMIN', 'ACCOUNTING', 'MANAGER'].includes(req.user?.role);
    if (canViewSalary && employees.length > 0) {
      const empIds = employees.map(e => e.id);
      const salaryRows = await prisma.$queryRawUnsafe(`
        SELECT "id", "baseSalary", "bankName", "bankAccountNo", "ifscCode", "upiId", "paymentMethod"
        FROM "Employee"
        WHERE "id" = ANY($1)
      `, empIds);
      const salMap = {};
      salaryRows.forEach(r => { salMap[r.id] = r; });

      employees.forEach(emp => {
        const s = salMap[emp.id];
        if (s) {
          emp.baseSalary = parseFloat(s.baseSalary || 0);
          emp.bankName = s.bankName;
          emp.ifscCode = s.ifscCode;
          emp.upiId = s.upiId;
          emp.paymentMethod = s.paymentMethod;
          if (req.user?.role === 'ADMIN') {
            emp.bankAccountNo = s.bankAccountNo;
          } else if (s.bankAccountNo) {
            emp.bankAccountNo = s.bankAccountNo.length > 4 ? '•••• ' + s.bankAccountNo.slice(-4) : '••••';
          }
        } else {
          emp.baseSalary = 0;
        }
      });
    }

    return res.json({
      success: true,
      employees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get Employees Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
};

/**
 * 3. Get Employee profile by ID or Employee Code
 * GET /api/v1/employees/:id
 */
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id },
          { employeeCode: id }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { id: true, name: true, description: true } },
            wallet: {
              select: {
                id: true,
                availableBalanceLiquid: true,
                availableBalanceCash: true
              }
            }
          }
        },
        reportingManager: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: true,
            designation: true,
            mobile: true
          }
        },
        subordinates: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            designation: true,
            status: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // Enhance profile with salary details for authorized roles
    const canViewSalary = ['ADMIN', 'ACCOUNTING', 'MANAGER'].includes(req.user?.role);
    if (canViewSalary) {
      const salaryRows = await prisma.$queryRawUnsafe(`
        SELECT "baseSalary", "bankName", "bankAccountNo", "ifscCode", "upiId", "paymentMethod"
        FROM "Employee"
        WHERE "id" = $1
      `, employee.id);
      if (salaryRows && salaryRows.length > 0) {
        const s = salaryRows[0];
        employee.baseSalary = parseFloat(s.baseSalary || 0);
        employee.bankName = s.bankName;
        employee.ifscCode = s.ifscCode;
        employee.upiId = s.upiId;
        employee.paymentMethod = s.paymentMethod;
        if (req.user?.role === 'ADMIN') {
          employee.bankAccountNo = s.bankAccountNo;
        } else if (s.bankAccountNo) {
          employee.bankAccountNo = s.bankAccountNo.length > 4 ? '•••• ' + s.bankAccountNo.slice(-4) : '••••';
        }
      } else {
        employee.baseSalary = 0;
      }
    }

    return res.json({ success: true, employee });
  } catch (error) {
    console.error('Get Employee By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching employee profile' });
  }
};

/**
 * 4. Update Employee Master details
 * PATCH /api/v1/employees/:id
 */
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      displayName,
      photo,
      mobile,
      alternatePhone,
      email,
      address,
      department,
      designation,
      employmentType,
      joiningDate,
      confirmationDate,
      reportingManagerId,
      workLocation,
      status
    } = req.body;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // If already archived and request does not explicitly reactivate it
    if (existing.status === 'ARCHIVED' && status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify an archived employee without explicit reactivation.'
      });
    }

    // Prevent self-reporting loop
    if (reportingManagerId && reportingManagerId === id) {
      return res.status(400).json({
        success: false,
        message: 'An employee cannot be assigned as their own reporting manager.'
      });
    }

    // Validate mobile uniqueness if changed
    const trimmedMobile = mobile ? mobile.trim() : existing.mobile;
    if (trimmedMobile !== existing.mobile) {
      const duplicateMobile = await prisma.employee.findFirst({
        where: { id: { not: id }, mobile: trimmedMobile }
      });
      if (duplicateMobile) {
        return res.status(409).json({
          success: false,
          message: `Mobile number "${trimmedMobile}" is already registered for another employee (${duplicateMobile.fullName}).`
        });
      }
    }

    // Validate email uniqueness if changed
    const trimmedEmail = email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing.email;
    if (trimmedEmail && trimmedEmail !== existing.email) {
      const duplicateEmail = await prisma.employee.findFirst({
        where: { id: { not: id }, email: trimmedEmail }
      });
      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: `Email "${trimmedEmail}" is already registered for another employee (${duplicateEmail.fullName}).`
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          fullName: fullName ? fullName.trim() : existing.fullName,
          displayName: displayName !== undefined ? (displayName ? displayName.trim() : null) : existing.displayName,
          photo: photo !== undefined ? (photo ? photo.trim() : null) : existing.photo,
          mobile: trimmedMobile,
          alternatePhone: alternatePhone !== undefined ? (alternatePhone ? alternatePhone.trim() : null) : existing.alternatePhone,
          email: trimmedEmail,
          address: address !== undefined ? (address ? address.trim() : null) : existing.address,
          department: department ? department.trim() : existing.department,
          designation: designation ? designation.trim() : existing.designation,
          employmentType: employmentType || existing.employmentType,
          joiningDate: joiningDate ? new Date(joiningDate) : existing.joiningDate,
          confirmationDate: confirmationDate !== undefined ? (confirmationDate ? new Date(confirmationDate) : null) : existing.confirmationDate,
          reportingManagerId: reportingManagerId !== undefined ? reportingManagerId : existing.reportingManagerId,
          workLocation: workLocation !== undefined ? (workLocation ? workLocation.trim() : null) : existing.workLocation,
          status: status || existing.status,
          updatedBy: req.user?.email || 'SYSTEM'
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          reportingManager: { select: { id: true, employeeCode: true, fullName: true } }
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'EMPLOYEE_UPDATE',
        entityType: 'EMPLOYEE',
        entityId: id,
        oldValues: {
          fullName: existing.fullName,
          mobile: existing.mobile,
          department: existing.department,
          designation: existing.designation,
          status: existing.status
        },
        newValues: {
          fullName: emp.fullName,
          mobile: emp.mobile,
          department: emp.department,
          designation: emp.designation,
          status: emp.status
        },
        req,
        tx
      });

      return emp;
    });

    return res.json({
      success: true,
      message: `Employee ${updated.fullName} updated successfully.`,
      employee: updated
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating employee' });
  }
};

/**
 * 5. Archive Employee (Resignation / Termination)
 * POST /api/v1/employees/:id/archive
 */
exports.archiveEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { exitReason, exitDate, status = 'ARCHIVED' } = req.body;

    if (!exitReason || !exitReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Exit reason is required to archive an employee.'
      });
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const archived = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          status: ['ARCHIVED', 'RESIGNED', 'TERMINATED', 'INACTIVE'].includes(status) ? status : 'ARCHIVED',
          exitDate: exitDate ? new Date(exitDate) : new Date(),
          exitReason: exitReason.trim(),
          archivedAt: new Date(),
          archivedBy: req.user?.email || 'SYSTEM',
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'EMPLOYEE_ARCHIVE',
        entityType: 'EMPLOYEE',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: emp.status, exitReason: emp.exitReason, exitDate: emp.exitDate },
        req,
        tx
      });

      return emp;
    });

    return res.json({
      success: true,
      message: `Employee ${archived.fullName} (${archived.employeeCode}) has been archived.`,
      employee: archived
    });
  } catch (error) {
    console.error('Archive Employee Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error archiving employee' });
  }
};

/**
 * 6. Link an existing User login account to an Employee
 * POST /api/v1/employees/:id/link-user
 */
exports.linkUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required to link account.' });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account to link does not exist.' });
    }

    // Check if user is already linked to another employee
    const existingLink = await prisma.employee.findUnique({
      where: { userId }
    });
    if (existingLink && existingLink.id !== id) {
      return res.status(409).json({
        success: false,
        message: `User "${targetUser.email}" is already linked to employee ${existingLink.fullName} (${existingLink.employeeCode}).`
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          userId,
          updatedBy: req.user?.email || 'SYSTEM'
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: { select: { name: true } } }
          }
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'EMPLOYEE_USER_LINK',
        entityType: 'EMPLOYEE',
        entityId: id,
        newValues: { linkedUserId: userId, userEmail: targetUser.email },
        req,
        tx
      });

      return emp;
    });

    return res.json({
      success: true,
      message: `User account "${targetUser.email}" linked to employee ${updated.fullName} successfully.`,
      employee: updated
    });
  } catch (error) {
    console.error('Link User Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error linking user' });
  }
};

/**
 * 7. Unlink User login account from an Employee
 * POST /api/v1/employees/:id/unlink-user
 */
exports.unlinkUser = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!employee.userId) {
      return res.status(400).json({
        success: false,
        message: 'This employee does not have any linked user account.'
      });
    }

    const previousUserId = employee.userId;

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          userId: null,
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'EMPLOYEE_USER_UNLINK',
        entityType: 'EMPLOYEE',
        entityId: id,
        oldValues: { unlinkedUserId: previousUserId },
        req,
        tx
      });

      return emp;
    });

    return res.json({
      success: true,
      message: `User login unlinked from employee ${updated.fullName} successfully.`,
      employee: updated
    });
  } catch (error) {
    console.error('Unlink User Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error unlinking user' });
  }
};

/**
 * 7. Update Employee Base Salary & Bank Configuration (Admin Only)
 * PUT /api/v1/employees/:id/salary
 */
exports.updateSalaryConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { baseSalary, bankName, bankAccountNo, ifscCode, upiId, paymentMethod } = req.body;

    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Administrators can configure employee salaries.' });
    }

    const result = await salaryService.updateEmployeeSalaryConfig({
      employeeId: id,
      baseSalary,
      bankName,
      bankAccountNo,
      ifscCode,
      upiId,
      paymentMethod,
      actor: req.user
    });

    return res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Update Salary Config Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating salary configuration' });
  }
};

/**
 * 8. Disburse Monthly Salary from Corporate Treasury (Admin & Accounting)
 * POST /api/v1/employees/:id/pay-salary
 */
exports.paySalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, amount, paymentMode, referenceNo, notes } = req.body;

    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ACCOUNTING') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Admin and Accounting can disburse employee salaries.' });
    }

    const result = await salaryService.disburseEmployeeSalary({
      employeeId: id,
      month,
      amount,
      paymentMode,
      referenceNo,
      notes,
      actorUser: req.user
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Pay Salary Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error disbursing salary' });
  }
};

/**
 * 9. Get Salary Payments History for an Employee (Admin, Accounting, Manager)
 * GET /api/v1/employees/:id/salary-payments
 */
exports.getSalaryPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedRoles = ['ADMIN', 'ACCOUNTING', 'MANAGER'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view salary records.' });
    }

    const payments = await salaryService.getEmployeeSalaryPayments(id);
    return res.json({ success: true, payments });
  } catch (error) {
    console.error('Get Salary Payments Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching salary payments' });
  }
};

/**
 * 10. Get Monthly Salary Summary Dashboard Stats (Admin & Accounting)
 * GET /api/v1/employees/salary/summary
 */
exports.getSalarySummary = async (req, res) => {
  try {
    const { month } = req.query;
    const allowedRoles = ['ADMIN', 'ACCOUNTING'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Admin and Accounting can view enterprise salary summaries.' });
    }

    const summary = await salaryService.getSalarySummary(month);
    return res.json({ success: true, summary });
  } catch (error) {
    console.error('Get Salary Summary Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching salary summary' });
  }
};
