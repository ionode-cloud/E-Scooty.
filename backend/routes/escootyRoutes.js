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
router.post('/ignition', dataController.setIgnitionStatus);       // POST /api/escooty/ignition

// Delete dashboard by deviceId (hardware signature)
router.route('/node/:deviceId')
    .delete(escootyController.deleteDashboardByDeviceId);

// ===================================================
// Dashboard Management Endpoints — base path: /api/escooty/dashboard
// ===================================================
router.route('/dashboard')
    .get(escootyController.getAllDashboards)                        // GET    /api/escooty/dashboard
    .post(validateIndianPhone, escootyController.createDashboard); // POST   /api/escooty/dashboard

router.route('/dashboard/:id')
    .put(escootyController.updateDashboard)                         // PUT    /api/escooty/dashboard/:id
    .delete(escootyController.deleteDashboard);                     // DELETE /api/escooty/dashboard/:id

// ===================================================
// Device Endpoints — base path: /api/escooty/device
// ===================================================
router.route('/device')
    .get(escootyController.getAllDevices)    // GET  /api/escooty/device
    .post(escootyController.createDevice);  // POST /api/escooty/device

router.route('/device/:id')
    .put(escootyController.updateDevice)     // PUT    /api/escooty/device/:id
    .delete(escootyController.deleteDevice); // DELETE /api/escooty/device/:id

// ===================================================
// Find Device by deviceId string — MUST be last to avoid
// swallowing named routes like /dashboard and /device
// ===================================================
router.route('/:deviceId')
    .get(escootyController.getDeviceByDeviceId)        // GET    /api/escooty/:deviceId
    .put(escootyController.updateDeviceByDeviceId)     // PUT    /api/escooty/:deviceId
    .delete(escootyController.deleteDeviceByDeviceId); // DELETE /api/escooty/:deviceId

module.exports = router;
