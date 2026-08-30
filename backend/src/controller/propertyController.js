const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postPropertyPaymentJournal } = require('../utils/accountingHelper');

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

    if (!khataNo || !plotNo || !projectLocation || !landOwnerName || !landOwnerContact || !totalLandValue) {
      return res.status(400).json({
        success: false,
        message: 'Khata No, Plot No, Project Location, Land Owner Name, Contact, and Total Land Value are required'
      });
    }

    const numValue = parseFloat(totalLandValue);
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total Land Value must be a valid positive number'
      });
    }

    const numArea = areaSqft ? parseFloat(areaSqft) : null;

    const property = await prisma.propertyAcquisition.create({
      data: {
        khataNo,
        plotNo,
        projectLocation,
        landOwnerName,
        landOwnerContact,
        landOwnerAddress: landOwnerAddress || null,
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
          select: { id: true, amount: true, dateOfPayment: true, paymentMode: true, referenceNo: true, status: true },
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

    for (const p of properties) {
      totalLandValuation += parseFloat(p.totalLandValue || 0);
      totalPaidToOwners += parseFloat(p.totalPaidToOwner || 0);
      totalOutstandingLiabilities += parseFloat(p.balanceRemaining || 0);
      if (p.status === 'FULLY_PAID') fullyPaidCount++;
      else ongoingCount++;
    }

    res.json({
      success: true,
      properties,
      summary: {
        totalProperties: properties.length,
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
    const { landOwnerName, landOwnerContact, landOwnerAddress, documents, status } = req.body;

    const existing = await prisma.propertyAcquisition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Property acquisition record not found' });
    }

    const updated = await prisma.propertyAcquisition.update({
      where: { id },
      data: {
        landOwnerName: landOwnerName ?? existing.landOwnerName,
        landOwnerContact: landOwnerContact ?? existing.landOwnerContact,
        landOwnerAddress: landOwnerAddress ?? existing.landOwnerAddress,
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

    let treasuryWallet = adminUser.wallet;
    if (!treasuryWallet) {
      treasuryWallet = await prisma.wallet.create({
        data: {
          userId: adminUser.id,
          availableBalance: 0,
          totalAllocated: 0,
          totalSpent: 0
        }
      });
    }

    const availableTreasuryBalance = parseFloat(treasuryWallet.availableBalance);

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

      // 2. Deduct from Organization Treasury Wallet (PRD §20.3)
      const updatedOrgWallet = await tx.wallet.update({
        where: { id: treasuryWallet.id },
        data: {
          availableBalance: { decrement: payAmount },
          totalSpent: { increment: payAmount }
        }
      });

      // 3. Create WalletTransaction with DEBIT tag
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'LAND_ACQUISITION_PAYMENT',
          sourceWalletId: treasuryWallet.id,
          destWalletId: null,
          amount: payAmount,
          referenceType: 'PROPERTY_PAYMENT',
          referenceId: payment.id,
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
          treasuryWalletBalance: parseFloat(updatedOrgWallet.availableBalance)
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
