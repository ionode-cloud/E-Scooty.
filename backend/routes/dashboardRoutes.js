const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateIndianPhone } = require('../middleware/validationMiddleware');

// Public standard user routes
router.get('/', protect, dashboardController.getDashboards);

// Public AMIN ONLY routes
router.post('/', protect, admin, validateIndianPhone, dashboardController.createDashboard);
router.delete('/:id', protect, admin, dashboardController.deleteDashboard);

module.exports = router;
