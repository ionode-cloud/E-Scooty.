const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Get current user profile - PROTECTED
router.get('/me', protect, userController.getMe);

// Administrative routes - PROTECTED & ADMIN ONLY
router.get('/', protect, admin, userController.getUsers);
router.post('/', protect, admin, userController.createUser);
router.put('/:id', protect, admin, userController.updateUser);
router.delete('/:id', protect, admin, userController.deleteUser);

module.exports = router;
