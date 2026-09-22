const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postPropertyPaymentJournal, postPropertyPaymentAdjustmentJournal } = require('../utils/accountingHelper');
const { checkDuplicateReferenceNo, registerBankReference } = require('../utils/referenceValidator');
const { cleanPlotNumber, cleanKhataNumber, normalizeForComparison } = require('../utils/identifierHelper');
const { getPrimaryTreasuryAdmin } = require('../utils/treasuryHelper');

// 1. Create a new Land/Property Acquisition record (Admin / Accounting only)
exports.createProperty = async (req, res) => {
  try {
    const {
      khataNo,
      plotNo,
      projectLocation,
      landOwnerName,
      landOwnerContact,
      landOwnerAddress,
      areaSqft,
      totalLandValue,
      agreementDate,
      documents
    } = req.body;

    const createdById = req.user.userId;

    const cleanKhataNo = cleanKhataNumber(khataNo);
    const cleanPlotNo = cleanPlotNumber(plotNo);
    const cleanProjectLocation = projectLocation ? projectLocation.trim() : '';
    const cleanOwnerName = landOwnerName ? landOwnerName.trim() : '';
    const cleanOwnerContact = landOwnerContact ? landOwnerContact.trim() : '';
    const cleanOwnerAddress = landOwnerAddress ? landOwnerAddress.trim() : null;

    if (!cleanKhataNo || !cleanPlotNo || !cleanProjectLocation || !cleanOwnerName || !cleanOwnerContact || !totalLandValue) {
      return res.status(400).json({
        success: false,
        message: 'Khata No, Plot No, Project Location, Land Owner Name, Contact, and Total Land Value are compulsory.'
      });
    }

    const numValue = parseFloat(totalLandValue);
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total Land Value must be a valid positive number'
      });
    }

    // Check for duplicate Land Acquisition using deep normalization (ignoring prefixes, case, punctuation)
    const normTargetPlot = normalizeForComparison(cleanPlotNo);
    const normTargetKhata = normalizeForComparison(cleanKhataNo);

    const allActiveProperties = await prisma.propertyAcquisition.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, plotNo: true, khataNo: true, landOwnerName: true, projectLocation: true }
    });

    const existingProperty = allActiveProperties.find(p =>
      normalizeForComparison(p.plotNo) === normTargetPlot &&
      normalizeForComparison(p.khataNo) === normTargetKhata
    );

    if (existingProperty) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Record Error: A land acquisition record for Khata No. "${cleanKhataNo}" and Plot No. "${cleanPlotNo}" is already registered (Land Owner: "${existingProperty.landOwnerName}", Location: "${existingProperty.projectLocation}"). Multiple land acquisition records cannot be created for the same plot and khata.`
      });
    }

    const numArea = areaSqft ? parseFloat(areaSqft) : null;

    const property = await prisma.propertyAcquisition.create({
      data: {
        khataNo: cleanKhataNo,
        plotNo: cleanPlotNo,
        projectLocation: cleanProjectLocation,
        landOwnerName: cleanOwnerName,
        landOwnerContact: cleanOwnerContact,
        landOwnerAddress: cleanOwnerAddress,
        areaSqft: numArea,
        totalLandValue: numValue,
        totalPaidToOwner: 0,
        balanceRemaining: numValue,
        status: 'ONGOING',
        agreementDate: agreementDate ? new Date(agreementDate) : null,
        documents: documents || null,
        createdById
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    await logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      action: 'PROPERTY_CREATE',
      entityType: 'PROPERTY_ACQUISITION',
      entityId: property.id,
      newValues: {
        khataNo,
        plotNo,
        projectLocation,
        landOwnerName,
        totalLandValue: numValue
      },
      req
    });

    res.status(201).json({
      success: true,
      message: `Land acquisition record for Plot ${plotNo} (Khata ${khataNo}) created successfully`,
      property
    });
  } catch (error) {
    console.error('Error creating property acquisition:', error);
    res.status(500).json({ success: false, message: 'Server error creating property acquisition', error: error.message });
  }
};

// 2. Get all Property Acquisition records with aggregate summary (Admin & Accounting)
exports.getProperties = async (req, res) => {
  try {
    const properties = await prisma.propertyAcquisition.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        payments: {
          select: { id: true, amount: true, dateOfPayment: true, paymentMode: true, referenceNo: true, paidFromAccount: true, notes: true, status: true },
          orderBy: { dateOfPayment: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalLandValuation = 0;
    let totalPaidToOwners = 0;
    let totalOutstandingLiabilities = 0;
    let ongoingCount = 0;
    let fullyPaidCount = 0;
    let activePropertiesCount = 0;

    for (const p of properties) {
      if (p.status !== 'CANCELLED') {
        activePropertiesCount++;
        totalLandValuation += parseFloat(p.totalLandValue || 0);
        totalPaidToOwners += parseFloat(p.totalPaidToOwner || 0);
        totalOutstandingLiabilities += parseFloat(p.balanceRemaining || 0);
        if (p.status === 'FULLY_PAID') fullyPaidCount++;
        else ongoingCount++;
      }
    }

    res.json({
      success: true,
      properties,
      summary: {
        totalProperties: activePropertiesCount,
        totalLandValuation,
        totalPaidToOwners,
        totalOutstandingLiabilities,
        ongoingCount,
        fullyPaidCount
      }
    });
  } catch (error) {
    console.error('Error fetching property acquisitions:', error);
    res.status(500).json({ success: false, message: 'Server error fetching property acquisitions' });
  }
};

// 3. Get single property by ID with complete payout ledger
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.propertyAcquisition.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        payments: {
          include: {
            paidBy: { select: { id: true, name: true, email: true } }
          },
          orderBy: { dateOfPayment: 'desc' }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property acquisition record not found' });
    }

    res.json({ success: true, property });
  } catch (error) {
    console.error('Error fetching property by ID:', error);
    res.status(500).json({ success: false, message: 'Server error fetching property details' });
  }
};

// 4. Update non-financial property fields
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { khataNo, plotNo, projectLocation, landOwnerName, landOwnerContact, landOwnerAddress, documents, status } = req.body;

    const existing = await prisma.propertyAcquisition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Property acquisition record not found' });
    }

    const targetPlot = plotNo !== undefined ? cleanPlotNumber(plotNo) : cleanPlotNumber(existing.plotNo);
    const targetKhata = khataNo !== undefined ? cleanKhataNumber(khataNo) : cleanKhataNumber(existing.khataNo);

    if (plotNo !== undefined || khataNo !== undefined) {
      const normTargetPlot = normalizeForComparison(targetPlot);
      const normTargetKhata = normalizeForComparison(targetKhata);

      const allActiveProperties = await prisma.propertyAcquisition.findMany({
        where: { id: { not: id }, status: { not: 'CANCELLED' } },
        select: { id: true, plotNo: true, khataNo: true, landOwnerName: true }
      });

      const duplicate = allActiveProperties.find(p =>
        normalizeForComparison(p.plotNo) === normTargetPlot &&
        normalizeForComparison(p.khataNo) === normTargetKhata
      );

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Duplicate Record Error: Another land acquisition record for Khata No. "${targetKhata}" and Plot No. "${targetPlot}" already exists (Land Owner: "${duplicate.landOwnerName}").`
        });
      }
    }

    const updated = await prisma.propertyAcquisition.update({
      where: { id },
      data: {
        khataNo: targetKhata,
        plotNo: targetPlot,
        projectLocation: projectLocation !== undefined ? projectLocation.trim() : existing.projectLocation,
        landOwnerName: landOwnerName !== undefined ? landOwnerName.trim() : existing.landOwnerName,
        landOwnerContact: landOwnerContact !== undefined ? landOwnerContact.trim() : existing.landOwnerContact,
        landOwnerAddress: landOwnerAddress !== undefined ? (landOwnerAddress ? landOwnerAddress.trim() : null) : existing.landOwnerAddress,
        documents: documents !== undefined ? documents : existing.documents,
        status: status ?? existing.status
      }
    });

    await logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      action: 'PROPERTY_UPDATE',
      entityType: 'PROPERTY_ACQUISITION',
      entityId: id,
      oldValues: { landOwnerName: existing.landOwnerName, status: existing.status },
      newValues: { landOwnerName: updated.landOwnerName, status: updated.status },
      req
    });

    res.json({ success: true, message: 'Property record updated successfully', property: updated });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ success: false, message: 'Server error updating property record' });
  }
};

// 5. Record Payment to Land Owner (Accounting & Admin only)
// PRD §20.3: Validates amount <= balanceRemaining & amount <= Treasury balance (no negative balance invariant)
// Atomically deducts Treasury Wallet, creates LAND_ACQUISITION_PAYMENT transaction, updates property balances, posts Dr 1510 / Cr 1010 journal
exports.recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, paidFromAccount, referenceNo, notes, dateOfPayment } = req.body;
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

    const property = await prisma.propertyAcquisition.findUnique({
      where: { id }
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property acquisition record not found' });
    }

    if (property.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot record payments against a cancelled property acquisition' });
    }

    const remainingLiability = parseFloat(property.balanceRemaining);
    if (payAmount > remainingLiability) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${payAmount.toLocaleString()}) exceeds the property remaining balance liability (₹${remainingLiability.toLocaleString()})`
      });
    }

const { getPrimaryTreasuryAdmin } = require('../utils/treasuryHelper');

    // Find the Organization / Admin Treasury Wallet
    let adminUser = await getPrimaryTreasuryAdmin(prisma);

    if (!adminUser) {
      return res.status(500).json({ success: false, message: 'Corporate Treasury Admin user not found' });
    }

    const fMode = paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const spentField = fMode === 'CASH' ? 'totalSpentCash' : 'totalSpentLiquid';

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

    const availableTreasuryBalance = parseFloat(treasuryWallet[balanceField] || 0);

    // Invariant check: No negative wallet balance (PRD §4.3 & §20.3)
    if (payAmount > availableTreasuryBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Treasury liquidity: Payment of ₹${payAmount.toLocaleString()} exceeds available Organization Wallet cash (₹${availableTreasuryBalance.toLocaleString()})`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the immutable PropertyPayment record
      const payment = await tx.propertyPayment.create({
        data: {
          propertyId: property.id,
          amount: payAmount,
          paymentMode: paymentMode.toUpperCase(),
          paidFromAccount: paidFromAccount || 'Corporate Treasury Account (1010)',
          referenceNo: referenceNo || null,
          notes: notes || `Disbursement for Khata ${property.khataNo} Plot ${property.plotNo}`,
          paidById: accountingUserId,
          dateOfPayment: dateOfPayment ? new Date(dateOfPayment) : new Date(),
          status: 'RECORDED'
        }
      });

      if (referenceNo) {
        await registerBankReference(tx, {
          referenceNo,
          module: 'PROPERTY_PAYMENT',
          sourceTable: 'PropertyPayment',
          sourceRecordId: payment.id,
          amount: payAmount,
          paymentMode: paymentMode.toUpperCase(),
          recordedBy: req.user?.email || 'SYSTEM'
        });
      }

      // 2. Deduct from Organization Treasury Wallet (PRD §20.3)
      const updatedOrgWallet = await tx.wallet.update({
        where: { id: treasuryWallet.id },
        data: {
          [balanceField]: { decrement: payAmount },
          [spentField]: { increment: payAmount }
        }
      });

      // 3. Create WalletTransaction with DEBIT tag
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'LAND_ACQUISITION_PAYMENT',
          sourceWalletId: treasuryWallet.id,
          destWalletId: null,
          amount: payAmount,
          fundMode: fMode,
          referenceType: 'PROPERTY_PAYMENT',
          referenceId: cleanRef || `CASH-PAY-${payment.id.slice(-4).toUpperCase()}`,
          description: `Land acquisition payout of ₹${payAmount.toLocaleString()} to ${property.landOwnerName} (Plot ${property.plotNo}, Khata ${property.khataNo}) via ${paymentMode.toUpperCase()}`,
          createdBy: accountingUserId,
          status: 'COMPLETED'
        }
      });

      // 4. Update Property running balances & status
      const newTotalPaid = parseFloat(property.totalPaidToOwner) + payAmount;
      const newBalanceRemaining = parseFloat(property.balanceRemaining) - payAmount;
      const newStatus = newBalanceRemaining <= 0.009 ? 'FULLY_PAID' : property.status;

      const updatedProperty = await tx.propertyAcquisition.update({
        where: { id: property.id },
        data: {
          totalPaidToOwner: newTotalPaid,
          balanceRemaining: newBalanceRemaining,
          status: newStatus
        }
      });

      // 5. Post Double-Entry Journal (Debit: Fixed Asset 1510, Credit: Treasury Bank 1010)
      await postPropertyPaymentJournal(tx, {
        amount: payAmount,
        landOwnerName: property.landOwnerName,
        khataNo: property.khataNo,
        plotNo: property.plotNo,
        referenceId: payment.id,
        createdBy: accountingUserId
      });

      // 6. Record Audit Log
      await logAudit({
        actorId: accountingUserId,
        actorEmail: req.user.email,
        action: 'PROPERTY_PAYMENT_RECORD',
        entityType: 'PROPERTY_PAYMENT',
        entityId: payment.id,
        newValues: {
          propertyId: property.id,
          landOwnerName: property.landOwnerName,
          amount: payAmount,
          paymentMode,
          referenceNo,
          propertyTotalPaid: newTotalPaid,
          propertyBalanceRemaining: newBalanceRemaining,
          treasuryWalletBalance: parseFloat(updatedOrgWallet[balanceField])
        },
        req,
        tx
      });

      return {
        payment,
        property: updatedProperty,
        transaction,
        treasuryWallet: updatedOrgWallet
      };
    }, { timeout: 20000 });

    res.status(201).json({
      success: true,
      message: `Successfully recorded land payout of ₹${payAmount.toLocaleString()} to ${property.landOwnerName}`,
      data: result
    });
  } catch (error) {
    console.error('Error recording property payment:', error);
    res.status(500).json({ success: false, message: 'Server error recording property payment', error: error.message });
  }
};

// 6. Edit/Correct Property Payout Disbursement (Admin Only)
// Enforces: Role === 'ADMIN'
// Full Double-Entry Accounting Settlement:
// 1. Treasury Wallet adjustment (Cash/Liquid refund or deduction)
// 2. PropertyAcquisition liability and status update
// 3. GlobalBankReference UTR synchronization
// 4. WalletTransaction adjustment audit trail
// 5. General Ledger Double-Entry Adjustment Journal (Dr 1510 / Cr 1010 or vice-versa)
// 6. Comprehensive AuditLog recording
exports.updatePropertyPayment = async (req, res) => {
  try {
    const userRole = req.user?.role || req.user?.roleName;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: Only administrators are authorized to edit land acquisition payment records.'
      });
    }

    const { paymentId } = req.params;
    const { amount, paymentMode, referenceNo, paidFromAccount, notes, dateOfPayment, reason } = req.body;
    const adminUserId = req.user.userId;

    const existingPayment = await prisma.propertyPayment.findUnique({
      where: { id: paymentId },
      include: {
        property: true
      }
    });

    if (!existingPayment) {
      return res.status(404).json({ success: false, message: 'Property payment record not found' });
    }

    if (existingPayment.status === 'REVERSED') {
      return res.status(400).json({ success: false, message: 'Cannot modify a reversed property payment' });
    }

    if (existingPayment.property.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot modify payments for a cancelled property acquisition' });
    }

    const oldAmount = parseFloat(existingPayment.amount);
    const parsedNewAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : oldAmount;

    if (isNaN(parsedNewAmount) || parsedNewAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid positive payment amount is required' });
    }

    const isAmountChanging = Math.abs(parsedNewAmount - oldAmount) > 0.001;
    const delta = Math.round((parsedNewAmount - oldAmount) * 100) / 100;

    const oldPaymentMode = (existingPayment.paymentMode || 'RTGS').toUpperCase();
    const finalPaymentMode = paymentMode ? paymentMode.toUpperCase() : oldPaymentMode;
    const oldFMode = oldPaymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const newFMode = finalPaymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const isFundModeChanging = oldFMode !== newFMode;

    const cleanReason = reason ? reason.trim() : '';
    if ((isAmountChanging || isFundModeChanging) && cleanReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory justification reason (minimum 5 characters) is required when modifying payment amounts or modes for financial audit compliance.'
      });
    }

    // Property liability validation
    const property = existingPayment.property;
    const currentTotalPaid = parseFloat(property.totalPaidToOwner || 0);
    const totalLandValuation = parseFloat(property.totalLandValue || 0);

    const newTotalPaid = Math.round((currentTotalPaid + delta) * 100) / 100;
    if (newTotalPaid < -0.009) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reduce payment: would cause total paid to become negative.'
      });
    }

    if (newTotalPaid > totalLandValuation + 0.009) {
      return res.status(400).json({
        success: false,
        message: `Payment increase (+₹${delta.toLocaleString('en-IN')}) would cause total paid (₹${newTotalPaid.toLocaleString('en-IN')}) to exceed total land valuation (₹${totalLandValuation.toLocaleString('en-IN')}).`
      });
    }

    const newBalanceRemaining = Math.max(0, Math.round((totalLandValuation - newTotalPaid) * 100) / 100);
    const newStatus = newBalanceRemaining <= 0.009 ? 'FULLY_PAID' : 'ONGOING';

    // Treasury liquidity verification
    const adminUser = await getPrimaryTreasuryAdmin(prisma);
    if (!adminUser || !adminUser.wallet) {
      return res.status(500).json({ success: false, message: 'Corporate Treasury Admin wallet not configured' });
    }
    const treasuryWallet = adminUser.wallet;

    const oldBalanceField = oldFMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const oldSpentField = oldFMode === 'CASH' ? 'totalSpentCash' : 'totalSpentLiquid';
    const newBalanceField = newFMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const newSpentField = newFMode === 'CASH' ? 'totalSpentCash' : 'totalSpentLiquid';

    if (isFundModeChanging) {
      const currentNewBal = parseFloat(treasuryWallet[newBalanceField] || 0);
      if (currentNewBal < parsedNewAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Corporate Treasury liquidity in ${newFMode} mode (₹${currentNewBal.toLocaleString('en-IN')}) to disburse ₹${parsedNewAmount.toLocaleString('en-IN')} payment.`
        });
      }
    } else if (delta > 0) {
      const currentBal = parseFloat(treasuryWallet[newBalanceField] || 0);
      if (currentBal < delta) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Corporate Treasury liquidity: Payment increase of ₹${delta.toLocaleString('en-IN')} exceeds available ${newFMode} wallet balance (₹${currentBal.toLocaleString('en-IN')}).`
        });
      }
    }

    // UTR Reference validation
    let cleanRef = referenceNo ? referenceNo.trim() : null;
    if (finalPaymentMode === 'CASH') {
      cleanRef = null;
    } else if (cleanRef && cleanRef !== existingPayment.referenceNo) {
      const dupErr = await checkDuplicateReferenceNo(prisma, cleanRef, existingPayment.id);
      if (dupErr) {
        return res.status(400).json({ success: false, message: dupErr });
      }
    }

    // Date parsing
    let parsedDate = existingPayment.dateOfPayment;
    if (dateOfPayment) {
      if (typeof dateOfPayment === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOfPayment.trim())) {
        parsedDate = new Date(`${dateOfPayment.trim()}T12:00:00.000Z`);
      } else {
        const d = new Date(dateOfPayment);
        if (!isNaN(d.getTime())) parsedDate = d;
      }
    }

    const finalPaidFrom = finalPaymentMode === 'CASH'
      ? 'Cash In Hand'
      : (paidFromAccount !== undefined ? (paidFromAccount ? paidFromAccount.trim() : null) : existingPayment.paidFromAccount);
    const finalNotes = notes !== undefined ? (notes ? notes.trim() : null) : existingPayment.notes;

    // Atomic settlement transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update PropertyPayment record
      const updatedPayment = await tx.propertyPayment.update({
        where: { id: paymentId },
        data: {
          amount: parsedNewAmount,
          dateOfPayment: parsedDate,
          paymentMode: finalPaymentMode,
          paidFromAccount: finalPaidFrom,
          referenceNo: cleanRef,
          notes: finalNotes
        }
      });

      // 2. Rebalance Corporate Treasury Wallet
      let updatedTreasuryWallet;
      if (isFundModeChanging) {
        updatedTreasuryWallet = await tx.wallet.update({
          where: { id: treasuryWallet.id },
          data: {
            [oldBalanceField]: { increment: oldAmount },
            [oldSpentField]: { decrement: oldAmount },
            [newBalanceField]: { decrement: parsedNewAmount },
            [newSpentField]: { increment: parsedNewAmount }
          }
        });
      } else if (Math.abs(delta) > 0.001) {
        updatedTreasuryWallet = await tx.wallet.update({
          where: { id: treasuryWallet.id },
          data: {
            [newBalanceField]: { decrement: delta },
            [newSpentField]: { increment: delta }
          }
        });
      } else {
        updatedTreasuryWallet = treasuryWallet;
      }

      // 3. Update PropertyAcquisition running balances & status
      const updatedProperty = await tx.propertyAcquisition.update({
        where: { id: property.id },
        data: {
          totalPaidToOwner: newTotalPaid,
          balanceRemaining: newBalanceRemaining,
          status: newStatus
        }
      });

      // 4. Synchronize Centralized GlobalBankReference Registry
      if (cleanRef || existingPayment.referenceNo) {
        const existingRef = await tx.globalBankReference.findFirst({
          where: {
            OR: [
              { sourceRecordId: String(existingPayment.id) },
              ...(existingPayment.referenceNo ? [{ referenceNo: existingPayment.referenceNo.trim().toUpperCase() }] : [])
            ]
          }
        });

        if (existingRef) {
          if (finalPaymentMode === 'CASH') {
            await tx.globalBankReference.update({
              where: { id: existingRef.id },
              data: {
                status: 'REVERSED',
                reversalReason: `Converted to CASH payout by Admin. Reason: ${cleanReason || 'Mode change'}`
              }
            });
          } else if (cleanRef) {
            await tx.globalBankReference.update({
              where: { id: existingRef.id },
              data: {
                referenceNo: cleanRef.toUpperCase(),
                amount: parsedNewAmount,
                paymentMode: finalPaymentMode,
                status: 'ACTIVE'
              }
            });
          }
        } else if (finalPaymentMode !== 'CASH' && cleanRef) {
          await registerBankReference(tx, {
            referenceNo: cleanRef,
            module: 'PROPERTY_PAYMENT',
            sourceTable: 'PropertyPayment',
            sourceRecordId: existingPayment.id,
            amount: parsedNewAmount,
            paymentMode: finalPaymentMode,
            recordedBy: req.user?.email || 'ADMIN'
          });
        }
      }

      // 5. Create WalletTransaction Audit Trail
      let transaction = null;
      if (isFundModeChanging || Math.abs(delta) > 0.001) {
        const txDesc = isFundModeChanging
          ? `Land payout mode reclassified from ${oldFMode} to ${newFMode} for land owner ${property.landOwnerName} (Khata ${property.khataNo}, Plot ${property.plotNo}). Reason: ${cleanReason || 'Admin mode update'}`
          : `Land payout ${delta > 0 ? 'increase' : 'decrease'} of ₹${Math.abs(delta).toLocaleString('en-IN')} for land owner ${property.landOwnerName} (Khata ${property.khataNo}, Plot ${property.plotNo}). Reason: ${cleanReason}`;

        transaction = await tx.walletTransaction.create({
          data: {
            type: 'LAND_ACQUISITION_PAYMENT_ADJUSTMENT',
            sourceWalletId: (delta > 0 || isFundModeChanging) ? treasuryWallet.id : null,
            destWalletId: (delta < 0 || isFundModeChanging) ? treasuryWallet.id : null,
            amount: isFundModeChanging ? parsedNewAmount : Math.abs(delta),
            fundMode: newFMode,
            referenceType: 'PROPERTY_PAYMENT',
            referenceId: cleanRef || `ADJ-PROP-${existingPayment.id.slice(-4).toUpperCase()}`,
            description: txDesc,
            createdBy: adminUserId,
            status: 'COMPLETED'
          }
        });
      }

      // 6. Post General Ledger Double-Entry Adjustment Journal
      let journal = null;
      if (Math.abs(delta) > 0.009) {
        journal = await postPropertyPaymentAdjustmentJournal(tx, {
          delta,
          landOwnerName: property.landOwnerName,
          khataNo: property.khataNo,
          plotNo: property.plotNo,
          paymentId: existingPayment.id,
          oldAmount,
          newAmount: parsedNewAmount,
          reason: cleanReason || 'Payment amount adjustment',
          createdBy: adminUserId
        });
      }

      // 7. Record Comprehensive Audit Log
      await logAudit({
        actorId: adminUserId,
        actorEmail: req.user.email,
        action: 'PROPERTY_PAYMENT_UPDATE',
        entityType: 'PROPERTY_PAYMENT',
        entityId: existingPayment.id,
        oldValues: {
          amount: oldAmount,
          paymentMode: oldPaymentMode,
          referenceNo: existingPayment.referenceNo,
          paidFromAccount: existingPayment.paidFromAccount,
          dateOfPayment: existingPayment.dateOfPayment,
          notes: existingPayment.notes,
          propertyTotalPaid: currentTotalPaid,
          propertyBalanceRemaining: parseFloat(property.balanceRemaining || 0),
          propertyStatus: property.status
        },
        newValues: {
          amount: parsedNewAmount,
          paymentMode: finalPaymentMode,
          referenceNo: cleanRef,
          paidFromAccount: finalPaidFrom,
          dateOfPayment: parsedDate,
          notes: finalNotes,
          delta,
          reason: cleanReason,
          propertyTotalPaid: newTotalPaid,
          propertyBalanceRemaining: newBalanceRemaining,
          propertyStatus: newStatus,
          treasuryWalletBalances: {
            liquid: parseFloat(updatedTreasuryWallet.availableBalanceLiquid || 0),
            cash: parseFloat(updatedTreasuryWallet.availableBalanceCash || 0)
          }
        },
        req,
        tx
      });

      return {
        payment: updatedPayment,
        property: updatedProperty,
        transaction,
        journal
      };
    }, { timeout: 20000 });

    res.json({
      success: true,
      message: `Successfully updated payment record for ${property.landOwnerName} (Plot ${property.plotNo}). Financial settlement complete.`,
      data: result
    });
  } catch (error) {
    console.error('Error updating property payment:', error);
    res.status(500).json({ success: false, message: 'Server error updating property payment', error: error.message });
  }
};
