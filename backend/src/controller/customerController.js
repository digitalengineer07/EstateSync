const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postCustomerPaymentJournal, postCustomerPaymentAdjustmentJournal, postCustomerRefundJournal } = require('../utils/accountingHelper');
const { getPrimaryTreasuryWallet, getPrimaryTreasuryAdmin } = require('../utils/treasuryHelper');
const { checkDuplicateReferenceNo, registerBankReference } = require('../utils/referenceValidator');
const { cleanPlotNumber, cleanKhataNumber, normalizeForComparison } = require('../utils/identifierHelper');

// 1. Create a new Customer profile with commercial terms
exports.createCustomer = async (req, res) => {
  try {
    const {
      customerName,
      customerContact,
      customerAddress,
      projectLocation,
      plotNo,
      areaSqft,
      khataNo,
      identityType,
      identityNumber,
      kycDocuments,
      ratePerSqft,
      landCost,
      registryCost,
      otherCharges,
      discount,
      taxes
    } = req.body;

    const salesOwnerId = req.user.userId;

    const trimmedCustomerName = customerName ? customerName.trim() : '';
    const trimmedCustomerContact = customerContact ? customerContact.trim() : '';
    const trimmedCustomerAddress = customerAddress ? customerAddress.trim() : null;
    const trimmedProjectLocation = projectLocation ? projectLocation.trim() : '';
    const trimmedPlotNo = cleanPlotNumber(plotNo);
    const trimmedKhataNo = cleanKhataNumber(khataNo);
    const trimmedIdentityType = identityType ? identityType.trim() : '';
    const trimmedIdentityNumber = identityNumber ? identityNumber.trim() : '';

    if (!trimmedCustomerName || !trimmedCustomerContact || !trimmedProjectLocation || !trimmedPlotNo || !trimmedKhataNo || !trimmedIdentityType || !trimmedIdentityNumber) {
      return res.status(400).json({
        success: false,
        message: 'All master profile fields (Customer Name, Contact, Project Location, Plot No., Khata No., Identity Type & ID Number) are compulsory.'
      });
    }

    const numArea = parseFloat(areaSqft) || 0;
    if (numArea <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Plot Area (sq.ft) is compulsory and must be greater than zero.'
      });
    }

    // 2. Strict Check for Duplicate Plot & Khata across the database using deep normalization
    const normTargetPlot = normalizeForComparison(trimmedPlotNo);
    const normTargetKhata = normalizeForComparison(trimmedKhataNo);

    const allActiveCustomers = await prisma.customer.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, plotNo: true, khataNo: true, customerName: true, projectLocation: true }
    });

    const existingPlotCustomer = allActiveCustomers.find(c =>
      normalizeForComparison(c.plotNo) === normTargetPlot &&
      normalizeForComparison(c.khataNo) === normTargetKhata
    );

    if (existingPlotCustomer) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Record Error: A customer account (${existingPlotCustomer.customerName}) is already registered for Khata No. "${trimmedKhataNo}" and Plot No. "${trimmedPlotNo}" (Location: ${existingPlotCustomer.projectLocation}). Multiple accounts cannot be created for the same plot.`
      });
    }

    const numRate = parseFloat(ratePerSqft) || 0;
    const numLandCost = parseFloat(landCost) || (numRate > 0 && numArea > 0 ? numRate * numArea : 0);
    const numRegistry = parseFloat(registryCost) || 0;
    const numOther = parseFloat(otherCharges) || 0;
    const numDiscount = parseFloat(discount) || 0;
    const numTaxes = parseFloat(taxes) || 0;

    // Commercial calculation frozen at profile creation (PRD §19.3)
    const totalContractValue = (numLandCost + numRegistry + numOther + numTaxes) - numDiscount;

    if (totalContractValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total contract value must be greater than zero.'
      });
    }

    const customer = await prisma.customer.create({
      data: {
        salesOwnerId,
        customerName: trimmedCustomerName,
        customerContact: trimmedCustomerContact,
        customerAddress: trimmedCustomerAddress,
        projectLocation: trimmedProjectLocation,
        plotNo: trimmedPlotNo,
        areaSqft: numArea,
        khataNo: trimmedKhataNo,
        identityType: trimmedIdentityType,
        identityNumber: trimmedIdentityNumber,
        kycDocuments: kycDocuments || null,
        status: 'ACTIVE',
        ratePerSqft: numRate,
        landCost: numLandCost,
        registryCost: numRegistry,
        otherCharges: numOther,
        discount: numDiscount,
        taxes: numTaxes,
        totalContractValue,
        totalPaid: 0,
        balanceDue: totalContractValue
      },
      include: {
        salesOwner: { select: { id: true, name: true, email: true } }
      }
    });

    await logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      action: 'CUSTOMER_CREATE',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      newValues: {
        customerName: trimmedCustomerName,
        plotNo: trimmedPlotNo,
        khataNo: trimmedKhataNo,
        projectLocation: trimmedProjectLocation,
        totalContractValue,
        salesOwner: req.user.email
      },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Customer profile registered and commercial terms recorded successfully',
      customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: 'Server error creating customer profile', error: error.message });
  }
};

// 2. Get list of customers (Sales sees own, Admin/Accounting sees all)
exports.getCustomers = async (req, res) => {
  try {
    const userRole = req.user.role;
    const permissions = req.user.permissions || [];
    const canViewAll = userRole === 'ADMIN' || permissions.includes('customer.view_all');

    const where = canViewAll ? {} : { salesOwnerId: req.user.userId };

    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesOwner: { select: { id: true, name: true, email: true } },
        payments: {
          select: {
            id: true,
            amount: true,
            dateOfPayment: true,
            paymentMode: true,
            sourceAccount: true,
            destinationAccount: true,
            referenceNo: true,
            status: true,
            recordedBy: { select: { id: true, name: true, email: true } }
          },
          orderBy: { dateOfPayment: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Summary calculations
    let totalPortfolioValue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let activeCustomersCount = 0;

    for (const c of customers) {
      if (c.status !== 'CANCELLED') {
        activeCustomersCount++;
        totalPortfolioValue += parseFloat(c.totalContractValue || 0);
        totalCollected += parseFloat(c.totalPaid || 0) - parseFloat(c.refundAmount || 0);
        totalOutstanding += parseFloat(c.balanceDue || 0);
      }
    }

    res.json({
      success: true,
      customers,
      summary: {
        totalCustomers: activeCustomersCount,
        totalPortfolioValue,
        totalCollected,
        totalOutstanding
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching customers' });
  }
};

// 3. Get customer by ID with full payment history
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const permissions = req.user.permissions || [];
    const canViewAll = userRole === 'ADMIN' || permissions.includes('customer.view_all');

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOwner: { select: { id: true, name: true, email: true } },
        payments: {
          include: {
            recordedBy: { select: { id: true, name: true, email: true } }
          },
          orderBy: { dateOfPayment: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!canViewAll && customer.salesOwnerId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied to this customer record' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    console.error('Error fetching customer by ID:', error);
    res.status(500).json({ success: false, message: 'Server error fetching customer details' });
  }
};

// 4. Update non-financial customer fields (Sales own, Admin all)
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const {
      customerName,
      customerContact,
      customerAddress,
      identityType,
      identityNumber,
      projectLocation,
      plotNo,
      khataNo,
      areaSqft,
      kycDocuments,
      status
    } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const trimmedPlotNo = plotNo !== undefined ? cleanPlotNumber(plotNo) : cleanPlotNumber(existing.plotNo);
    const trimmedKhataNo = khataNo !== undefined ? cleanKhataNumber(khataNo) : cleanKhataNumber(existing.khataNo);

    if (!trimmedPlotNo || !trimmedKhataNo) {
      return res.status(400).json({
        success: false,
        message: 'Plot No. and Khata No. are compulsory and cannot be empty.'
      });
    }

    // Check if another customer already has this Plot No and Khata No using deep normalization
    const normTargetPlot = normalizeForComparison(trimmedPlotNo);
    const normTargetKhata = normalizeForComparison(trimmedKhataNo);

    const allActiveCustomers = await prisma.customer.findMany({
      where: { id: { not: id }, status: { not: 'CANCELLED' } },
      select: { id: true, plotNo: true, khataNo: true, customerName: true }
    });

    const duplicateCheck = allActiveCustomers.find(c =>
      normalizeForComparison(c.plotNo) === normTargetPlot &&
      normalizeForComparison(c.khataNo) === normTargetKhata
    );

    if (duplicateCheck) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Record Error: Another customer account (${duplicateCheck.customerName}) already exists with Khata No. "${trimmedKhataNo}" and Plot No. "${trimmedPlotNo}". Duplicate entry is not allowed.`
      });
    }

    const newStatus = status ? status.trim().toUpperCase() : existing.status;
    let cancellationStatus = existing.cancellationStatus;
    let cancelledAt = existing.cancelledAt;
    let cancelledById = existing.cancelledById;
    let cancellationReason = req.body.cancellationReason || existing.cancellationReason;

    // Handle cancellation trigger
    if (newStatus === 'CANCELLED' && existing.status !== 'CANCELLED') {
      cancelledAt = new Date();
      cancelledById = req.user.userId;
      const totalPaid = parseFloat(existing.totalPaid || 0);
      if (totalPaid > 0) {
        cancellationStatus = 'PENDING_SETTLEMENT'; // Requires Accounting refund & costing verification
      } else {
        cancellationStatus = 'NO_FUNDS_TO_SETTLE'; // No money was paid
      }
    } else if (newStatus === 'ACTIVE' && existing.status === 'CANCELLED') {
      cancellationStatus = null;
      cancelledAt = null;
      cancelledById = null;
      cancellationReason = null;
    }

    const updatedData = {
      customerName: customerName ? customerName.trim() : existing.customerName,
      customerContact: customerContact ? customerContact.trim() : existing.customerContact,
      customerAddress: customerAddress !== undefined ? (customerAddress ? customerAddress.trim() : null) : existing.customerAddress,
      identityType: identityType ? identityType.trim() : existing.identityType,
      identityNumber: identityNumber ? identityNumber.trim() : existing.identityNumber,
      projectLocation: projectLocation ? projectLocation.trim() : existing.projectLocation,
      plotNo: trimmedPlotNo,
      khataNo: trimmedKhataNo,
      areaSqft: areaSqft !== undefined && !isNaN(parseFloat(areaSqft)) && parseFloat(areaSqft) > 0 ? parseFloat(areaSqft) : existing.areaSqft,
      kycDocuments: kycDocuments !== undefined ? kycDocuments : existing.kycDocuments,
      status: newStatus,
      cancellationStatus,
      cancelledAt,
      cancelledById,
      cancellationReason
    };

    const updated = await prisma.customer.update({
      where: { id },
      data: updatedData,
      include: {
        salesOwner: { select: { id: true, name: true, email: true } },
        payments: {
          include: {
            recordedBy: { select: { id: true, name: true, email: true } }
          },
          orderBy: { dateOfPayment: 'desc' }
        }
      }
    });

    await logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      action: 'CUSTOMER_UPDATE',
      entityType: 'CUSTOMER',
      entityId: id,
      oldValues: {
        customerName: existing.customerName,
        customerContact: existing.customerContact,
        plotNo: existing.plotNo,
        projectLocation: existing.projectLocation,
        status: existing.status,
        cancellationStatus: existing.cancellationStatus
      },
      newValues: {
        customerName: updated.customerName,
        customerContact: updated.customerContact,
        plotNo: updated.plotNo,
        projectLocation: updated.projectLocation,
        status: updated.status,
        cancellationStatus: updated.cancellationStatus
      },
      req
    });

    res.json({
      success: true,
      message: newStatus === 'CANCELLED' && parseFloat(existing.totalPaid || 0) > 0
        ? 'Customer booking cancelled. Account sent to Accounting for costing deduction and refund settlement.'
        : 'Customer profile updated successfully',
      customer: updated
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ success: false, message: 'Server error updating customer profile', error: error.message });
  }
};

// 4b. Settle Customer Cancellation & Refund Payout (Accounting & Admin only)
exports.settleCustomerCancellationRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { deductionAmount, refundMode, payoutAccount, referenceNo, notes } = req.body;
    const accountingUserId = req.user.userId;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOwner: { select: { id: true, name: true, email: true } },
        payments: true
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.status !== 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Refund settlement is only applicable for CANCELLED customer accounts.'
      });
    }

    if (customer.cancellationStatus === 'SETTLED') {
      return res.status(400).json({
        success: false,
        message: 'This customer cancellation has already been settled and refunded.'
      });
    }

    const totalPaid = parseFloat(customer.totalPaid || 0);
    if (totalPaid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No deposited funds exist on this customer account to refund.'
      });
    }

    const numDeduction = parseFloat(deductionAmount || 0);
    if (isNaN(numDeduction) || numDeduction < 0) {
      return res.status(400).json({
        success: false,
        message: 'Company deduction / costing amount cannot be negative.'
      });
    }

    if (numDeduction > totalPaid) {
      return res.status(400).json({
        success: false,
        message: `Deduction amount (₹${numDeduction.toLocaleString('en-IN')}) cannot exceed total customer deposits (₹${totalPaid.toLocaleString('en-IN')}).`
      });
    }

    const refundAmount = totalPaid - numDeduction;

    if (refundAmount > 0 && !refundMode) {
      return res.status(400).json({
        success: false,
        message: 'Please select a refund payment mode (CASH, CHEQUE, NEFT, RTGS, UPI).'
      });
    }

    const cleanRef = referenceNo ? referenceNo.trim() : null;

    if (cleanRef) {
      const dupErr = await checkDuplicateReferenceNo(prisma, cleanRef);
      if (dupErr) {
        return res.status(400).json({ success: false, message: dupErr });
      }
    }

    // Check Corporate Treasury Liquidity
    const treasuryWallet = await getPrimaryTreasuryWallet();
    const fMode = refundMode === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const allocatedField = fMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';
    const availableTreasury = parseFloat(treasuryWallet[balanceField] || 0);

    if (refundAmount > 0 && refundAmount > availableTreasury) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Treasury liquidity: Available cash is ₹${availableTreasury.toLocaleString('en-IN')}, but refund payout is ₹${refundAmount.toLocaleString('en-IN')}.`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. If refundAmount > 0: Deduct from Treasury Wallet
      let updatedWallet = treasuryWallet;
      if (refundAmount > 0) {
        updatedWallet = await tx.wallet.update({
          where: { id: treasuryWallet.id },
          data: {
            [balanceField]: { decrement: refundAmount },
            [allocatedField]: { decrement: refundAmount }
          }
        });

        // 2. Create WalletTransaction with DEBIT (CUSTOMER_REFUND)
        await tx.walletTransaction.create({
          data: {
            type: 'CUSTOMER_REFUND',
            sourceWalletId: treasuryWallet.id,
            destWalletId: null,
            amount: refundAmount,
            fundMode: fMode,
            referenceType: 'CUSTOMER_REFUND',
            referenceId: customer.id,
            description: `Customer Cancellation Refund: ₹${refundAmount.toLocaleString('en-IN')} disbursed to ${customer.customerName} for Plot ${customer.plotNo} (Company Costing Retained: ₹${numDeduction.toLocaleString('en-IN')}) via ${(refundMode || 'DIRECT').toUpperCase()}`,
            createdBy: accountingUserId,
            status: 'COMPLETED'
          }
        });

        // 3. Post Double-Entry Journal
        await postCustomerRefundJournal(tx, {
          amount: refundAmount,
          customerName: customer.customerName,
          plotNo: customer.plotNo,
          referenceId: customer.id,
          createdBy: accountingUserId
        });
      }

      // 4. Create a refund outflow record in CustomerPayment table
      let refundPaymentRecord = null;
      if (refundAmount > 0) {
        refundPaymentRecord = await tx.customerPayment.create({
          data: {
            customerId: customer.id,
            amount: refundAmount,
            paymentMode: (refundMode || 'DIRECT').toUpperCase(),
            sourceAccount: payoutAccount || 'Corporate Treasury Account (1010)',
            destinationAccount: 'Customer Bank / Beneficiary Account',
            referenceNo: referenceNo || null,
            recordedById: accountingUserId,
            dateOfPayment: new Date(),
            status: 'REFUND_DISBURSED'
          }
        });

        if (referenceNo) {
          await registerBankReference(tx, {
            referenceNo,
            module: 'CUSTOMER_REFUND',
            sourceTable: 'CustomerPayment',
            sourceRecordId: refundPaymentRecord.id,
            amount: refundAmount,
            paymentMode: refundMode || 'DIRECT',
            recordedBy: req.user?.email || 'SYSTEM'
          });
        }
      }

      // 5. Update Customer with settlement fields
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          status: 'CANCELLED',
          cancellationStatus: 'SETTLED',
          deductionAmount: numDeduction,
          refundAmount: refundAmount,
          refundDate: new Date(),
          refundMode: refundMode ? refundMode.toUpperCase() : 'N/A',
          refundReferenceNo: referenceNo || null,
          refundNotes: notes || null,
          refundSettledById: accountingUserId,
          balanceDue: 0
        }
      });

      // 6. Record Audit Log
      await logAudit({
        actorId: accountingUserId,
        actorEmail: req.user.email,
        action: 'CUSTOMER_CANCELLATION_REFUND_SETTLED',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        newValues: {
          customerId: customer.id,
          customerName: customer.customerName,
          totalPaid,
          deductionAmount: numDeduction,
          refundAmount,
          refundMode,
          referenceNo,
          treasuryWalletBalance: parseFloat(updatedWallet[balanceField])
        },
        req,
        tx
      });

      return {
        customer: updatedCustomer,
        refundPaymentRecord,
        refundAmount,
        deductionAmount: numDeduction,
        treasuryWallet: updatedWallet
      };
    }, { timeout: 20000 });

    res.status(200).json({
      success: true,
      message: `Cancellation settlement completed! ₹${refundAmount.toLocaleString('en-IN')} refunded to ${customer.customerName}, ₹${numDeduction.toLocaleString('en-IN')} retained as company costing.`,
      data: result
    });
  } catch (error) {
    console.error('Error settling customer cancellation refund:', error);
    res.status(500).json({ success: false, message: 'Server error settling customer cancellation refund', error: error.message });
  }
};

// 5. Record Customer Payment (Accounting & Admin only)
// PRD §19.4: Atomic transaction, Organization Wallet credit, customer balance update, double-entry revenue journal
exports.recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, sourceAccount, destinationAccount, referenceNo, dateOfPayment } = req.body;
    const accountingUserId = req.user.userId;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid positive payment amount is required' });
    }

    if (!paymentMode) {
      return res.status(400).json({ success: false, message: 'Payment mode (CASH, CHEQUE, NEFT, RTGS, UPI, DD) is required' });
    }

    const cleanRef = referenceNo ? referenceNo.trim() : null;

    if (cleanRef) {
      const dupErr = await checkDuplicateReferenceNo(prisma, cleanRef);
      if (dupErr) {
        return res.status(400).json({ success: false, message: dupErr });
      }
    }

    const payAmount = parseFloat(amount);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { salesOwner: { select: { id: true, name: true, email: true } } }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Cannot record payments for inactive or cancelled customer accounts' });
    }

    const remainingDue = parseFloat(customer.balanceDue);
    if (payAmount > remainingDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${payAmount.toLocaleString()}) exceeds the customer outstanding balance due (₹${remainingDue.toLocaleString()})`
      });
    }
    // Find the Organization / Admin Wallet (Primary Treasury)
    let adminUser = await getPrimaryTreasuryAdmin(prisma);

    if (!adminUser) {
      return res.status(500).json({ success: false, message: 'Corporate Treasury Admin wallet not configured' });
    }

    const fMode = paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const allocatedField = fMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';

    let treasuryWallet = adminUser.wallet;
    if (!treasuryWallet) {
      treasuryWallet = await prisma.wallet.create({
        data: {
          userId: adminUser.id,
          availableBalanceLiquid: 0,
          availableBalanceCash: 0,
          totalAllocatedLiquid: 0,
          totalAllocatedCash: 0,
          totalSpentLiquid: 0,
          totalSpentCash: 0
        }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let parsedDateOfPayment = new Date();
      if (dateOfPayment) {
        if (typeof dateOfPayment === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOfPayment.trim())) {
          parsedDateOfPayment = new Date(`${dateOfPayment.trim()}T12:00:00.000Z`);
        } else {
          const d = new Date(dateOfPayment);
          if (!isNaN(d.getTime())) parsedDateOfPayment = d;
        }
      }

      // 1. Create the immutable CustomerPayment record
      const payment = await tx.customerPayment.create({
        data: {
          customerId: customer.id,
          amount: payAmount,
          paymentMode: paymentMode.toUpperCase(),
          sourceAccount: sourceAccount || 'Client Bank Account',
          destinationAccount: destinationAccount || 'Corporate Treasury Account (1010)',
          referenceNo: referenceNo || null,
          recordedById: accountingUserId,
          dateOfPayment: parsedDateOfPayment,
          status: 'RECORDED'
        }
      });

      if (cleanRef) {
        await registerBankReference(tx, {
          referenceNo: cleanRef,
          module: 'CUSTOMER_PAYMENT',
          sourceTable: 'CustomerPayment',
          sourceRecordId: payment.id,
          amount: payAmount,
          paymentMode: paymentMode.toUpperCase(),
          recordedBy: req.user?.email || 'SYSTEM',
          skipPreCheck: true
        });
      }

      // 2. Increment Organization Wallet available balance & treasury funds (PRD §19.4)
      const updatedOrgWallet = await tx.wallet.update({
        where: { id: treasuryWallet.id },
        data: {
          [balanceField]: { increment: payAmount },
          [allocatedField]: { increment: payAmount }
        }
      });

      // 3. Create WalletTransaction with CREDIT entry type
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'CUSTOMER_PAYMENT_RECEIVED',
          sourceWalletId: null,
          destWalletId: treasuryWallet.id,
          amount: payAmount,
          fundMode: fMode,
          referenceType: 'CUSTOMER_PAYMENT',
          referenceId: cleanRef || `CASH-RCPT-${payment.id.slice(-4).toUpperCase()}`,
          description: `Customer payment received from ${customer.customerName} for Plot ${customer.plotNo} (${customer.projectLocation}) via ${paymentMode.toUpperCase()}`,
          createdBy: accountingUserId,
          status: 'COMPLETED'
        }
      });

      // 4. Update Customer running balances
      const newTotalPaid = parseFloat(customer.totalPaid || 0) + payAmount;
      const newBalanceDue = Math.max(0, parseFloat(customer.balanceDue || 0) - payAmount);

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalPaid: newTotalPaid,
          balanceDue: newBalanceDue
        }
      });

      // 5. Post Double-Entry Journal (Debit: Bank/Treasury 1010, Credit: Customer Revenue 4010)
      await postCustomerPaymentJournal(tx, {
        amount: payAmount,
        customerName: customer.customerName,
        plotNo: customer.plotNo,
        referenceId: payment.id,
        createdBy: accountingUserId,
        postingDate: parsedDateOfPayment
      });

      return {
        payment,
        customer: updatedCustomer,
        transaction,
        treasuryWallet: updatedOrgWallet
      };
    }, { timeout: 35000, maxWait: 15000 });

    // 6. Record Audit Log asynchronously after transaction commits (Non-blocking)
    logAudit({
      actorId: accountingUserId,
      actorEmail: req.user.email,
      action: 'CUSTOMER_PAYMENT_RECORD',
      entityType: 'CUSTOMER_PAYMENT',
      entityId: result.payment.id,
      newValues: {
        customerId: customer.id,
        customerName: customer.customerName,
        amount: payAmount,
        paymentMode,
        referenceNo,
        customerTotalPaid: parseFloat(result.customer.totalPaid),
        customerBalanceDue: parseFloat(result.customer.balanceDue),
        treasuryWalletBalance: parseFloat(result.treasuryWallet[balanceField])
      },
      req
    }).catch(err => console.warn('Payment audit log warning:', err.message));

    res.status(201).json({
      success: true,
      message: `Successfully recorded collection payment of ₹${payAmount.toLocaleString()} from ${customer.customerName}`,
      data: result
    });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    const statusCode = error.status || (error.code === 'P2002' || error.code === 'DUPLICATE_REFERENCE_NO' ? 400 : (error.message?.includes('timeout') ? 504 : 500));
    const message = error.message?.includes('timeout')
      ? 'Database operation timed out due to network latency. Please check customer statement or try again.'
      : (error.message || 'Server error recording customer payment');
    res.status(statusCode).json({ success: false, message, error: error.message });
  }
};

// 6. Update / Correct an Existing Customer Payment Record (Accounting can update non-cash metadata; ONLY ADMIN can modify amount or Cash<->Liquid mode)
exports.updatePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { dateOfPayment, paymentMode, sourceAccount, destinationAccount, referenceNo, amount, reason } = req.body;
    const currentUserId = req.user.userId;
    const userRole = req.user.role;

    const existingPayment = await prisma.customerPayment.findUnique({
      where: { id: paymentId },
      include: { customer: true }
    });

    if (!existingPayment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // LOOPHOLE GUARD 1: Prevent editing REVERSED or REFUNDED payment records
    if (existingPayment.status === 'REVERSED' || existingPayment.status === 'REFUND_DISBURSED') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Action: Cannot modify a payment record that has already been REVERSED or REFUNDED.'
      });
    }

    // LOOPHOLE GUARD 2: Prevent editing payments for CANCELLED or SETTLED customer accounts
    if (existingPayment.customer.status === 'CANCELLED' || existingPayment.customer.cancellationStatus === 'SETTLED') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Action: Cannot modify payment records for a CANCELLED or SETTLED customer account.'
      });
    }

    // Determine if amount is being modified
    const oldAmount = parseFloat(existingPayment.amount);
    const parsedNewAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : null;
    const isAmountChanging = parsedNewAmount !== null && Math.abs(parsedNewAmount - oldAmount) > 0.001;
    const cleanReason = reason ? reason.trim() : '';

    // Determine if payment mode / fund category is changing
    const oldPaymentMode = existingPayment.paymentMode.toUpperCase();
    const finalPaymentMode = paymentMode ? paymentMode.toUpperCase() : oldPaymentMode;
    const oldFMode = oldPaymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const newFMode = finalPaymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const isFundModeChanging = oldFMode !== newFMode;

    // LOOPHOLE GUARD 3: Role Restrictions
    // ONLY ADMIN can edit the payment amount
    if (isAmountChanging && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: Only ADMIN is authorized to modify customer payment amounts. Accountants can only correct payment metadata (dates, bank accounts, or reference numbers).'
      });
    }

    // ONLY ADMIN can convert payment mode between CASH and BANK/LIQUID
    if (isFundModeChanging && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: Only ADMIN is authorized to change payment mode between CASH and BANK/LIQUID transfers.'
      });
    }

    // LOOPHOLE GUARD 4: Input Validation & Commercial Limits
    if (isAmountChanging) {
      if (isNaN(parsedNewAmount) || !isFinite(parsedNewAmount) || parsedNewAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Amount: Payment amount must be a positive number greater than 0.'
        });
      }

      if (parsedNewAmount > 1000000000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Amount: Payment amount exceeds maximum permissible system limit (₹100 Crores).'
        });
      }

      if (!cleanReason || cleanReason.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory justification reason (minimum 10 characters) is required when modifying payment amounts for financial audit compliance.'
        });
      }
    }

    // LOOPHOLE GUARD 5: Active Milestone Allocation Check
    if (isAmountChanging && parsedNewAmount < oldAmount) {
      const activeAllocations = await prisma.paymentAllocation.findMany({
        where: { paymentId, status: 'ACTIVE' }
      });
      const totalAllocatedToDemands = activeAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedAmount || 0), 0);
      if (parsedNewAmount < (totalAllocatedToDemands - 0.01)) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce payment amount to ₹${parsedNewAmount.toLocaleString()} because ₹${totalAllocatedToDemands.toLocaleString()} is already locked/allocated to milestone demand notes. Please de-allocate or adjust the milestone demand notes first.`
        });
      }
    }

    // Reference validation (CASH has no reference; non-CASH requires clean, unique reference if passed)
    let cleanRef = referenceNo ? referenceNo.trim() : null;
    if (finalPaymentMode === 'CASH') {
      cleanRef = null;
    } else if (cleanRef && cleanRef !== existingPayment.referenceNo) {
      const dupErr = await checkDuplicateReferenceNo(prisma, cleanRef, existingPayment.id);
      if (dupErr) {
        return res.status(400).json({ success: false, message: dupErr });
      }
    }

    // Parse date safely without timezone shift
    let parsedDate = existingPayment.dateOfPayment;
    if (dateOfPayment) {
      if (typeof dateOfPayment === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOfPayment.trim())) {
        parsedDate = new Date(`${dateOfPayment.trim()}T12:00:00.000Z`);
      } else {
        const d = new Date(dateOfPayment);
        if (!isNaN(d.getTime())) parsedDate = d;
      }
    }

    const finalSourceAccount = sourceAccount !== undefined ? (sourceAccount ? sourceAccount.trim() : null) : existingPayment.sourceAccount;
    const finalDestAccount = destinationAccount !== undefined ? (destinationAccount ? destinationAccount.trim() : null) : existingPayment.destinationAccount;

    // Is there any financial balance change?
    // Amount changing OR Fund mode changing (Cash <-> Liquid)
    const requiresFinancialRebalance = isAmountChanging || isFundModeChanging;

    if (requiresFinancialRebalance) {
      const effectiveNewAmount = isAmountChanging ? parsedNewAmount : oldAmount;
      const delta = Math.round((effectiveNewAmount - oldAmount) * 100) / 100;

      const adminUser = await getPrimaryTreasuryAdmin(prisma);
      if (!adminUser || !adminUser.wallet) {
        return res.status(500).json({ success: false, message: 'Corporate Treasury Admin wallet not configured' });
      }
      const treasuryWallet = adminUser.wallet;

      const oldBalanceField = oldFMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
      const oldAllocatedField = oldFMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';
      const newBalanceField = newFMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
      const newAllocatedField = newFMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';

      // Liquidity verification before transaction
      if (isFundModeChanging) {
        // Must have sufficient liquidity in old mode to withdraw
        const currentOldBal = parseFloat(treasuryWallet[oldBalanceField] || 0);
        if (currentOldBal < oldAmount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient Corporate Treasury liquidity in ${oldFMode} mode (₹${currentOldBal.toLocaleString()}) to convert ₹${oldAmount.toLocaleString()} payment to ${newFMode} mode.`
          });
        }
      } else if (delta < 0) {
        const currentBal = parseFloat(treasuryWallet[oldBalanceField] || 0);
        if (currentBal < Math.abs(delta)) {
          return res.status(400).json({
            success: false,
            message: `Insufficient Corporate Treasury liquidity in ${oldFMode} mode to deduct ₹${Math.abs(delta).toLocaleString()} adjustment. Available balance is ₹${currentBal.toLocaleString()}.`
          });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch fresh customer record within transaction to eliminate race conditions
        const freshCustomer = await tx.customer.findUnique({
          where: { id: existingPayment.customerId }
        });

        const currentTotalPaid = parseFloat(freshCustomer.totalPaid || 0);
        const currentBalanceDue = parseFloat(freshCustomer.balanceDue || 0);
        const totalContractValue = parseFloat(freshCustomer.totalContractValue || 0);

        if (delta < 0 && (currentTotalPaid + delta < -0.01)) {
          throw {
            status: 400,
            message: `Cannot reduce payment by ₹${Math.abs(delta).toLocaleString()}: would cause customer total paid to become negative.`
          };
        }

        if (delta > 0 && (currentTotalPaid + delta > totalContractValue + 0.01)) {
          throw {
            status: 400,
            message: `Payment increase (+₹${delta.toLocaleString()}) would cause total paid (₹${(currentTotalPaid + delta).toLocaleString()}) to exceed total contract value (₹${totalContractValue.toLocaleString()}).`
          };
        }

        // 2. Update CustomerPayment record
        const updatedPayment = await tx.customerPayment.update({
          where: { id: paymentId },
          data: {
            amount: effectiveNewAmount,
            dateOfPayment: parsedDate,
            paymentMode: finalPaymentMode,
            sourceAccount: finalPaymentMode === 'CASH' ? 'Cash In Hand' : finalSourceAccount,
            destinationAccount: finalPaymentMode === 'CASH' ? 'Cash In Hand' : finalDestAccount,
            referenceNo: cleanRef
          },
          include: {
            customer: true,
            recordedBy: { select: { id: true, name: true, email: true } }
          }
        });

        // 3. Rebalance Corporate Treasury Wallet
        let updatedWallet;
        if (isFundModeChanging) {
          updatedWallet = await tx.wallet.update({
            where: { id: treasuryWallet.id },
            data: {
              [oldBalanceField]: { decrement: oldAmount },
              [oldAllocatedField]: { decrement: oldAmount },
              [newBalanceField]: { increment: effectiveNewAmount },
              [newAllocatedField]: { increment: effectiveNewAmount }
            }
          });
        } else {
          updatedWallet = await tx.wallet.update({
            where: { id: treasuryWallet.id },
            data: {
              [newBalanceField]: { increment: delta },
              [newAllocatedField]: { increment: delta }
            }
          });
        }

        // 4. Create WalletTransaction Audit Trail
        const walletTxDesc = isFundModeChanging
          ? `Payment reclassification from ${oldFMode} to ${newFMode} for customer ${freshCustomer.customerName} (Payment ID: ${paymentId.slice(0, 8)}). ${cleanReason || 'Mode updated by Admin'}`
          : `${delta > 0 ? 'Upward' : 'Downward'} payment correction for customer ${freshCustomer.customerName} (Payment ID: ${paymentId.slice(0, 8)}). Reason: ${cleanReason}`;

        const transaction = await tx.walletTransaction.create({
          data: {
            type: 'CUSTOMER_PAYMENT_CORRECTION',
            sourceWalletId: (delta < 0 || isFundModeChanging) ? treasuryWallet.id : null,
            destWalletId: (delta > 0 || isFundModeChanging) ? treasuryWallet.id : null,
            amount: isFundModeChanging ? effectiveNewAmount : Math.abs(delta),
            fundMode: newFMode,
            referenceType: 'CUSTOMER_PAYMENT_ADJUSTMENT',
            referenceId: `ADJ-${paymentId.slice(-6).toUpperCase()}`,
            description: walletTxDesc,
            createdBy: currentUserId,
            status: 'COMPLETED'
          }
        });

        // 5. Update Customer running balances
        const newTotalPaid = Math.max(0, currentTotalPaid + delta);
        const newBalanceDue = Math.max(0, currentBalanceDue - delta);
        const updatedCustomer = await tx.customer.update({
          where: { id: freshCustomer.id },
          data: {
            totalPaid: newTotalPaid,
            balanceDue: newBalanceDue
          }
        });

        // 6. Post General Ledger double-entry adjustment journal
        let journal = null;
        if (Math.abs(delta) > 0.009) {
          journal = await postCustomerPaymentAdjustmentJournal(tx, {
            delta,
            customerName: freshCustomer.customerName,
            plotNo: freshCustomer.plotNo,
            paymentId: existingPayment.id,
            oldAmount,
            newAmount: effectiveNewAmount,
            reason: cleanReason || 'Payment amount adjustment',
            createdBy: currentUserId
          });
        }

        // 7. Synchronize Centralized GlobalBankReference Registry
        if (cleanRef || existingPayment.referenceNo) {
          const refToMatch = cleanRef || existingPayment.referenceNo;
          const existingRef = await tx.globalBankReference.findFirst({
            where: {
              OR: [
                { referenceNo: refToMatch.trim().toUpperCase() },
                { sourceRecordId: String(existingPayment.id) }
              ]
            }
          });

          if (existingRef) {
            if (finalPaymentMode === 'CASH') {
              // Cash has no reference; mark existing reference as REVERSED
              await tx.globalBankReference.update({
                where: { id: existingRef.id },
                data: {
                  status: 'REVERSED',
                  reversalReason: `Payment mode converted to CASH by Admin. Reason: ${cleanReason || 'N/A'}`,
                  updatedAt: new Date()
                }
              });
            } else {
              await tx.globalBankReference.update({
                where: { id: existingRef.id },
                data: {
                  referenceNo: cleanRef ? cleanRef.toUpperCase() : existingRef.referenceNo,
                  amount: effectiveNewAmount,
                  paymentMode: finalPaymentMode,
                  status: 'ACTIVE'
                }
              });
            }
          } else if (cleanRef && finalPaymentMode !== 'CASH') {
            await registerBankReference(tx, {
              referenceNo: cleanRef,
              module: 'CUSTOMER_PAYMENT',
              sourceTable: 'CustomerPayment',
              sourceRecordId: existingPayment.id,
              amount: effectiveNewAmount,
              paymentMode: finalPaymentMode,
              recordedBy: req.user?.email || 'SYSTEM',
              skipPreCheck: true
            });
          }
        }

        return { updatedPayment, updatedWallet, updatedCustomer, transaction, journal };
      }, { timeout: 35000, maxWait: 15000 });

      // Non-blocking Audit Log
      logAudit({
        actorId: currentUserId,
        actorEmail: req.user.email,
        action: isAmountChanging ? 'CUSTOMER_PAYMENT_AMOUNT_ADJUST' : 'CUSTOMER_PAYMENT_MODE_CHANGE',
        entityType: 'CUSTOMER_PAYMENT',
        entityId: paymentId,
        oldValues: {
          amount: oldAmount,
          paymentMode: oldPaymentMode,
          totalPaid: existingPayment.customer.totalPaid,
          balanceDue: existingPayment.customer.balanceDue,
          dateOfPayment: existingPayment.dateOfPayment,
          referenceNo: existingPayment.referenceNo
        },
        newValues: {
          amount: effectiveNewAmount,
          paymentMode: finalPaymentMode,
          delta,
          reason: cleanReason,
          totalPaid: parseFloat(result.updatedCustomer.totalPaid),
          balanceDue: parseFloat(result.updatedCustomer.balanceDue),
          dateOfPayment: result.updatedPayment.dateOfPayment,
          referenceNo: result.updatedPayment.referenceNo
        },
        req
      }).catch(err => console.warn('Payment adjustment audit log warning:', err.message));

      return res.json({
        success: true,
        message: isAmountChanging
          ? `Payment amount successfully adjusted by Admin from ₹${oldAmount.toLocaleString()} to ₹${effectiveNewAmount.toLocaleString()} (Δ: ${delta >= 0 ? '+' : ''}₹${delta.toLocaleString()}). Financial ledger and customer balances reconciled.`
          : `Payment mode successfully converted from ${oldPaymentMode} to ${finalPaymentMode}. Treasury cash/liquid balances reconciled.`,
        data: result.updatedPayment
      });
    }

    // Branch 2: Standard metadata update (Date, Source/Destination bank accounts, Reference within same liquid mode)
    const updatedPayment = await prisma.customerPayment.update({
      where: { id: paymentId },
      data: {
        dateOfPayment: parsedDate,
        paymentMode: finalPaymentMode,
        sourceAccount: finalPaymentMode === 'CASH' ? 'Cash In Hand' : finalSourceAccount,
        destinationAccount: finalPaymentMode === 'CASH' ? 'Cash In Hand' : finalDestAccount,
        referenceNo: cleanRef
      },
      include: {
        customer: true,
        recordedBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (cleanRef && cleanRef !== existingPayment.referenceNo) {
      const existingRef = await prisma.globalBankReference.findFirst({
        where: { sourceRecordId: String(existingPayment.id) }
      });
      if (existingRef) {
        await prisma.globalBankReference.update({
          where: { id: existingRef.id },
          data: { referenceNo: cleanRef.toUpperCase() }
        });
      }
    }

    logAudit({
      actorId: currentUserId,
      actorEmail: req.user.email,
      action: 'CUSTOMER_PAYMENT_UPDATE',
      entityType: 'CUSTOMER_PAYMENT',
      entityId: paymentId,
      oldValues: {
        dateOfPayment: existingPayment.dateOfPayment,
        paymentMode: existingPayment.paymentMode,
        sourceAccount: existingPayment.sourceAccount,
        destinationAccount: existingPayment.destinationAccount,
        referenceNo: existingPayment.referenceNo
      },
      newValues: {
        dateOfPayment: updatedPayment.dateOfPayment,
        paymentMode: updatedPayment.paymentMode,
        sourceAccount: updatedPayment.sourceAccount,
        destinationAccount: updatedPayment.destinationAccount,
        referenceNo: updatedPayment.referenceNo
      },
      req
    }).catch(err => console.warn('Payment update audit log warning:', err.message));

    return res.json({
      success: true,
      message: 'Payment metadata updated successfully',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error updating customer payment:', error);
    const statusCode = error.status || (error.code === 'P2002' || error.code === 'DUPLICATE_REFERENCE_NO' ? 400 : (error.message?.includes('timeout') ? 504 : 500));
    res.status(statusCode).json({
      success: false,
      message: error.message?.includes('timeout')
        ? 'Database operation timed out. Please refresh and check customer statement.'
        : (error.message || 'Server error updating customer payment'),
      error: error.message
    });
  }
};

