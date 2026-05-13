const express = require('express');
const router = express.Router();
const escootyController = require('../controllers/escootyController');
const { protect, admin } = require('../middleware/authMiddleware');

const dataController = require('../controllers/dataController');

// ===================================================
// Telemetry Endpoints — base path: /api/escooty
// ===================================================
router.route('/')
    .get(dataController.getTelemetry)               // GET    /api/escooty?deviceId=...
    .post(dataController.syncCoreData)              // POST   /api/escooty  (create new record)
    .put(dataController.upsertTelemetry)            // PUT    /api/escooty  (upsert latest record)
    .delete(dataController.deleteTelemetry);        // DELETE /api/escooty?deviceId=...

router.route('/register')
    .post(protect, admin, escootyController.createDashboard); // POST /api/escooty/register (admin)

router.route('/:id')
    .put(protect, admin, escootyController.updateDashboard)   // PUT  /api/escooty/:id
    .delete(protect, admin, escootyController.deleteDashboard); // DELETE /api/escooty/:id

// ===================================================
// Device Endpoints — base path: /api/escooty/device
// ===================================================
router.route('/device')
    .get(escootyController.getAllDevices)
    .post(protect, admin, escootyController.createDevice);

router.route('/device/:id')
    .put(protect, admin, escootyController.updateDevice)
    .delete(protect, admin, escootyController.deleteDevice);

module.exports = router;
