const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * Controller for Operational Notes & Cash Memory Diary.
 * 
 * STRICT COMPLIANCE RULE:
 * Entries recorded here are strictly informational knowledge memos for operational tracking.
 * They do NOT trigger journal entries, wallet deductions, customer ledger postings, or treasury calculations.
 */

// GET /api/v1/notes - Fetch notes with filtering and pagination
exports.getNotes = async (req, res) => {
  try {
    const { category, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (startDate || endDate) {
      where.noteDate = {};
      if (startDate) {
        where.noteDate.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date until 23:59:59.999
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.noteDate.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { partyName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNo: { contains: q, mode: 'insensitive' } },
        { createdByName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [notes, totalCount] = await Promise.all([
      prisma.operationalNote.findMany({
        where,
        orderBy: { noteDate: 'desc' },
        skip,
        take,
      }),
      prisma.operationalNote.count({ where }),
    ]);

    res.json({
      success: true,
      notes,
      pagination: {
        page: pageNum,
        limit: take,
        total: totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    console.error('Error in getNotes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operational notes', error: error.message });
  }
};

// GET /api/v1/notes/stats - Informational KPI summary counts
exports.getNoteStats = async (req, res) => {
  try {
    const allNotes = await prisma.operationalNote.findMany({
      select: {
        category: true,
        amount: true,
      },
    });

    let totalCashReceived = 0;
    let totalCashPaidLand = 0;
    let totalCashPaidExpense = 0;
    let totalCashHandover = 0;
    let generalNotesCount = 0;

    for (const note of allNotes) {
      const numAmt = note.amount ? parseFloat(note.amount.toString()) : 0;
      if (note.category === 'CASH_RECEIVED_CUSTOMER') {
        totalCashReceived += numAmt;
      } else if (note.category === 'CASH_PAID_LAND') {
        totalCashPaidLand += numAmt;
      } else if (note.category === 'CASH_PAID_EXPENSE') {
        totalCashPaidExpense += numAmt;
      } else if (note.category === 'CASH_HANDOVER') {
        totalCashHandover += numAmt;
      } else {
        generalNotesCount += 1;
      }
    }

    res.json({
      success: true,
      stats: {
        totalNotes: allNotes.length,
        totalCashReceived,
        totalCashPaidLand,
        totalCashPaidExpense,
        totalCashHandover,
        generalNotesCount,
      },
    });
  } catch (error) {
    console.error('Error in getNoteStats:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate note statistics', error: error.message });
  }
};

// GET /api/v1/notes/:id - Fetch single note
exports.getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await prisma.operationalNote.findUnique({
      where: { id },
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, note });
  } catch (error) {
    console.error('Error in getNoteById:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch note details', error: error.message });
  }
};

// POST /api/v1/notes - Create new operational note
exports.createNote = async (req, res) => {
  try {
    const { title, category, partyName, amount, referenceNo, description, noteDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Note title or subject is required' });
    }

    const parsedAmount = amount !== undefined && amount !== null && amount !== '' ? Math.max(0, parseFloat(amount) || 0) : 0;
    const parsedDate = noteDate ? new Date(noteDate) : new Date();

    const createdById = req.user?.userId || req.user?.id || 'SYSTEM';
    const createdByName = req.user?.name || req.user?.email || 'Authorized User';
    const createdByRole = req.user?.role || 'STAFF';

    const note = await prisma.operationalNote.create({
      data: {
        title: title.trim(),
        category: category || 'GENERAL_NOTE',
        partyName: partyName ? partyName.trim() : null,
        amount: parsedAmount,
        referenceNo: referenceNo ? referenceNo.trim() : null,
        description: description ? description.trim() : null,
        noteDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        createdById,
        createdByName,
        createdByRole,
      },
    });

    await logAudit({
      actorId: createdById,
      actorEmail: req.user?.email,
      action: 'OPERATIONAL_NOTE_CREATE',
      entityType: 'OPERATIONAL_NOTE',
      entityId: note.id,
      newValues: {
        title: note.title,
        category: note.category,
        partyName: note.partyName,
        amount: note.amount ? note.amount.toString() : '0',
        noteDate: note.noteDate,
      },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Operational note saved successfully (Informational Record)',
      note,
    });
  } catch (error) {
    console.error('Error in createNote:', error);
    res.status(500).json({ success: false, message: 'Failed to create operational note', error: error.message });
  }
};

// PUT /api/v1/notes/:id - Update existing note
exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, partyName, amount, referenceNo, description, noteDate } = req.body;

    const existingNote = await prisma.operationalNote.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const userRole = req.user?.role;
    const userId = req.user?.userId || req.user?.id;

    // Admin can update any note; creator can update their own note
    if (userRole !== 'ADMIN' && existingNote.createdById !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit notes created by you' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (category !== undefined) updateData.category = category;
    if (partyName !== undefined) updateData.partyName = partyName ? partyName.trim() : null;
    if (amount !== undefined) updateData.amount = Math.max(0, parseFloat(amount) || 0);
    if (referenceNo !== undefined) updateData.referenceNo = referenceNo ? referenceNo.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (noteDate !== undefined) {
      const parsedDate = new Date(noteDate);
      if (!isNaN(parsedDate.getTime())) updateData.noteDate = parsedDate;
    }

    const updatedNote = await prisma.operationalNote.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      actorId: userId,
      actorEmail: req.user?.email,
      action: 'OPERATIONAL_NOTE_UPDATE',
      entityType: 'OPERATIONAL_NOTE',
      entityId: id,
      oldValues: existingNote,
      newValues: updatedNote,
      req,
    });

    res.json({
      success: true,
      message: 'Operational note updated successfully',
      note: updatedNote,
    });
  } catch (error) {
    console.error('Error in updateNote:', error);
    res.status(500).json({ success: false, message: 'Failed to update operational note', error: error.message });
  }
};

// DELETE /api/v1/notes/:id - Delete operational note
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNote = await prisma.operationalNote.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const userRole = req.user?.role;
    const userId = req.user?.userId || req.user?.id;

    // Admin can delete any note; creator can delete their own note
    if (userRole !== 'ADMIN' && existingNote.createdById !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete notes created by you' });
    }

    await prisma.operationalNote.delete({
      where: { id },
    });

    await logAudit({
      actorId: userId,
      actorEmail: req.user?.email,
      action: 'OPERATIONAL_NOTE_DELETE',
      entityType: 'OPERATIONAL_NOTE',
      entityId: id,
      oldValues: existingNote,
      req,
    });

    res.json({
      success: true,
      message: 'Operational note deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteNote:', error);
    res.status(500).json({ success: false, message: 'Failed to delete operational note', error: error.message });
  }
};
