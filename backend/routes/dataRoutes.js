const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { protect, admin } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/device-data', dataController.receiveData); // Open API for ESP32
router.post('/sync-core', dataController.syncCoreData); // Optimized E-Scooty Dashboard API
router.get('/history/:deviceId', dataController.getHistory); // Used by dashboard charts
router.get('/emergency-logs/:deviceId', dataController.getEmergencyLogs); // For Timestamp Log card
router.put('/record/:id', protect, admin, dataController.updateData);
router.delete('/record/:id', protect, admin, dataController.deleteData);
router.delete('/history/:deviceId', protect, admin, dataController.clearHistory);
router.get('/download', dataController.downloadExcel);
router.post('/upload-xlsx', protect, upload.single('file'), dataController.uploadExcel);

module.exports = router;
