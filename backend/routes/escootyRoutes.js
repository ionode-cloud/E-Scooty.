const express = require('express');
const router = express.Router();
const escootyController = require('../controllers/escootyController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateIndianPhone } = require('../middleware/validationMiddleware');

const dataController = require('../controllers/dataController');

// ===================================================
// Telemetry Endpoints — base path: /api/escooty
// ===================================================
router.route('/')
    .get(dataController.getTelemetry)               // GET    /api/escooty?deviceId=...
    .post(dataController.syncCoreData)              // POST   /api/escooty  (create new record)
    .put(dataController.syncCoreData)               // PUT    /api/escooty  (create new record)
    .delete(dataController.deleteTelemetry);        // DELETE /api/escooty?deviceId=... (purge device logs)

// Path-based telemetry purge (easier for Postman)
router.delete('/history/:deviceId', dataController.deleteTelemetry);

// Delete specific telemetry record by internal ID
router.delete('/record/:id', dataController.deleteTelemetryRecord);

router.route('/register')
    .post(validateIndianPhone, escootyController.createDashboard); // POST /api/escooty/register

router.post('/emergency', dataController.triggerManualEmergency); // POST /api/escooty/emergency

// Delete dashboard by deviceId (hardware signature)
router.route('/node/:deviceId')
    .delete(escootyController.deleteDashboardByDeviceId);

router.route('/:id')
    .put(escootyController.updateDashboard)   // PUT  /api/escooty/:id
    .delete(escootyController.deleteDashboard); // DELETE /api/escooty/:id

// ===================================================
// Device Endpoints — base path: /api/escooty/device
// ===================================================
router.route('/device')
    .get(escootyController.getAllDevices)
    .post(escootyController.createDevice);

router.route('/device/:id')
    .put(escootyController.updateDevice)
    .delete(escootyController.deleteDevice);

module.exports = router;
