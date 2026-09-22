const express = require('express');
const router = express.Router();
const noteController = require('../controller/noteController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Role-guard middleware: Only ADMIN, MANAGER, and ACCOUNTING are allowed
const requireNoteAccess = (req, res, next) => {
  if (['ADMIN', 'MANAGER', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Operational notes are restricted to Admin, Manager, and Accounting personnel',
  });
};

router.use(verifyJWT, requireNoteAccess);

// Routes
router.get('/', noteController.getNotes);
router.get('/stats', noteController.getNoteStats);
router.get('/:id', noteController.getNoteById);
router.post('/', noteController.createNote);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
