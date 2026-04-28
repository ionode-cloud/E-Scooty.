const express = require('express');
const router = express.Router();
const escootyController = require('../controllers/escootyController');
const { protect, admin } = require('../middleware/authMiddleware');

const dataController = require('../controllers/dataController');

// Dashboard Endpoints
router.route('/dashboard')
    .get(escootyController.getAllDashboards)
    .post(dataController.syncCoreData); // Telemetry Sync moved here

router.route('/dashboard/register')
    .post(protect, admin, escootyController.createDashboard);

router.route('/dashboard/:id')
    .put(protect, admin, escootyController.updateDashboard)
    .delete(protect, admin, escootyController.deleteDashboard);

// Device Endpoints
router.route('/device')
    .get(escootyController.getAllDevices)
    .post(protect, admin, escootyController.createDevice);

router.route('/device/:id')
    .put(protect, admin, escootyController.updateDevice)
    .delete(protect, admin, escootyController.deleteDevice);

module.exports = router;
