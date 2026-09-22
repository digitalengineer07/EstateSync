const prisma = require('../config/db');

/**
 * GET /api/v1/search?q=...
 * High-performance Enterprise Spotlight Search across:
 * - Customers & Plot Bookings
 * - Transactions & UTR/Payment Vouchers
 * - Staff & Employee Directory
 * - Land & Property Acquisitions
 * - Operational Cash Notes
 * 
 * STRICT COMPLIANCE: Purely read-only; zero mutation or calculation changes.
 */
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        query: q || '',
        results: {
          customers: [],
          transactions: [],
          employees: [],
          properties: [],
          notes: [],
        },
        totalResults: 0,
      });
    }

    const query = q.trim();
    const userRole = (typeof req.user?.role === 'object' ? req.user?.role?.name : req.user?.role) || '';

    // Parallel fetch across core entities with take: 4 each
    const [customers, payments, expenses, employees, properties, notes] = await Promise.all([
      // 1. Customers & Plots (Name, Plot #, Contact Phone, Location, Khata, Aadhaar/PAN)
      prisma.customer.findMany({
        where: {
          OR: [
            { customerName: { contains: query, mode: 'insensitive' } },
            { plotNo: { contains: query, mode: 'insensitive' } },
            { customerContact: { contains: query, mode: 'insensitive' } },
            { projectLocation: { contains: query, mode: 'insensitive' } },
            { khataNo: { contains: query, mode: 'insensitive' } },
            { identityNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 4,
        select: {
          id: true,
          customerName: true,
          plotNo: true,
          projectLocation: true,
          totalContractValue: true,
          totalPaid: true,
          balanceDue: true,
        },
      }).catch(() => []),

      // 2. Transactions & Customer Payments (UTR, Voucher, Payment Mode, Customer Name, Plot #)
      prisma.customerPayment.findMany({
        where: {
          OR: [
            { referenceNo: { contains: query, mode: 'insensitive' } },
            { paymentMode: { contains: query, mode: 'insensitive' } },
            { customer: { customerName: { contains: query, mode: 'insensitive' } } },
            { customer: { plotNo: { contains: query, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { dateOfPayment: 'desc' },
        include: {
          customer: {
            select: {
              customerName: true,
              plotNo: true,
            },
          },
        },
      }).catch(() => []),

      // 3. Operational Expenses & Vouchers (Description, Bill Reference, Category, Fund Mode)
      prisma.expense.findMany({
        where: {
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { fundMode: { contains: query, mode: 'insensitive' } },
            { category: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { date: 'desc' },
        include: {
          category: {
            select: { name: true },
          },
        },
      }).catch(() => []),

      // 4. Employees & Staff (Name, Display Name, Employee Code, Dept, Designation, Phone, Email)
      prisma.employee.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { employeeCode: { contains: query, mode: 'insensitive' } },
            { department: { contains: query, mode: 'insensitive' } },
            { designation: { contains: query, mode: 'insensitive' } },
            { mobile: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 4,
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
          department: true,
          designation: true,
          status: true,
        },
      }).catch(() => []),

      // 5. Land & Property Acquisitions (Owner, Contact, Location, Plot, Khata)
      prisma.propertyAcquisition.findMany({
        where: {
          OR: [
            { landOwnerName: { contains: query, mode: 'insensitive' } },
            { landOwnerContact: { contains: query, mode: 'insensitive' } },
            { projectLocation: { contains: query, mode: 'insensitive' } },
            { plotNo: { contains: query, mode: 'insensitive' } },
            { khataNo: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 4,
        select: {
          id: true,
          landOwnerName: true,
          projectLocation: true,
          plotNo: true,
          khataNo: true,
          totalLandValue: true,
        },
      }).catch(() => []),

      // 6. Operational Notes & Cash Diary (Title, Party Name, Slip Ref, Description, Category)
      prisma.operationalNote.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { partyName: { contains: query, mode: 'insensitive' } },
            { referenceNo: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 4,
        orderBy: { noteDate: 'desc' },
        select: {
          id: true,
          title: true,
          partyName: true,
          amount: true,
          category: true,
          referenceNo: true,
          noteDate: true,
        },
      }).catch(() => []),
    ]);

    // Format & attach navigation targets
    const formattedCustomers = customers.map((c) => ({
      id: c.id,
      title: c.customerName,
      subtitle: `Plot #${c.plotNo} • ${c.projectLocation}`,
      extra: `Paid: ₹${c.totalPaid ? parseFloat(c.totalPaid).toLocaleString('en-IN') : 0}`,
      category: 'Customers',
      link: userRole === 'ADMIN' ? '/dashboards/admin?tab=customers' : '/dashboards/accounting?tab=collections',
      targetTab: userRole === 'ADMIN' ? 'customers' : 'collections',
    }));

    const customerTransactions = payments.map((p) => ({
      id: `pay-${p.id}`,
      title: p.referenceNo ? `Voucher / UTR: ${p.referenceNo}` : `Payment: ₹${parseFloat(p.amount).toLocaleString('en-IN')}`,
      subtitle: `${p.customer?.customerName || 'Customer'} (Plot #${p.customer?.plotNo || '—'}) • ${p.paymentMode}`,
      extra: `₹${parseFloat(p.amount).toLocaleString('en-IN')}`,
      category: 'Transactions',
      link: userRole === 'ADMIN' ? '/dashboards/admin?tab=transactions' : '/dashboards/accounting?tab=collections',
      targetTab: userRole === 'ADMIN' ? 'transactions' : 'collections',
    }));

    const expenseTransactions = expenses.map((exp) => ({
      id: `exp-${exp.id}`,
      title: `Expense: ${exp.description || 'Operational Expense'}`,
      subtitle: `${exp.category?.name || 'General'} • ${exp.fundMode} • Ref: ${exp.reference || '—'}`,
      extra: `₹${parseFloat(exp.amount).toLocaleString('en-IN')}`,
      category: 'Transactions',
      link: userRole === 'ADMIN' ? '/dashboards/admin?tab=transactions' : (userRole === 'MANAGER' ? '/dashboards/manager?tab=expenses' : '/dashboards/accounting?tab=ledger'),
      targetTab: userRole === 'ADMIN' ? 'transactions' : (userRole === 'MANAGER' ? 'expenses' : 'ledger'),
    }));

    const formattedTransactions = [...customerTransactions, ...expenseTransactions].slice(0, 5);

    const formattedEmployees = employees.map((e) => ({
      id: e.id,
      title: e.fullName,
      subtitle: `${e.employeeCode} • ${e.designation} (${e.department})`,
      extra: e.status,
      category: 'Staff',
      link: '/dashboards/employees',
      targetTab: 'staff',
    }));

    const formattedProperties = properties.map((pr) => ({
      id: pr.id,
      title: `${pr.projectLocation} (Plot #${pr.plotNo})`,
      subtitle: `Owner: ${pr.landOwnerName} • Khata: ${pr.khataNo}`,
      extra: `Val: ₹${parseFloat(pr.totalLandValue).toLocaleString('en-IN')}`,
      category: 'Properties',
      link: userRole === 'ADMIN' ? '/dashboards/admin?tab=properties' : '/dashboards/accounting?tab=properties',
      targetTab: 'properties',
    }));

    const formattedNotes = notes.map((n) => ({
      id: n.id,
      title: n.title,
      subtitle: `${n.partyName ? `Party: ${n.partyName} • ` : ''}${n.referenceNo ? `Ref: ${n.referenceNo}` : 'Cash Diary'}`,
      extra: n.amount ? `₹${parseFloat(n.amount).toLocaleString('en-IN')}` : '',
      category: 'Notes',
      link: userRole === 'ADMIN' ? '/dashboards/admin?tab=notes' : (userRole === 'ACCOUNTING' ? '/dashboards/accounting?tab=notes' : '/dashboards/manager?tab=notes'),
      targetTab: 'notes',
    }));

    const totalResults =
      formattedCustomers.length +
      formattedTransactions.length +
      formattedEmployees.length +
      formattedProperties.length +
      formattedNotes.length;

    res.json({
      success: true,
      query,
      results: {
        customers: formattedCustomers,
        transactions: formattedTransactions,
        employees: formattedEmployees,
        properties: formattedProperties,
        notes: formattedNotes,
      },
      totalResults,
    });
  } catch (error) {
    console.error('Error in globalSearch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: error.message,
    });
  }
};
