const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const otaController = require('../controllers/otaController');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Setup multer mapping
const upload = multer({ dest: uploadsDir });

// 1. Devices Ping (ESP32) -> /api/ota/device-ping
router.get('/device-ping', otaController.pingDevice);

// 2. Web Checks Online Status -> /api/ota/check-device
router.get('/check-device', otaController.checkDeviceStatus);

// 3. Web Uploads .bin -> /api/ota/upload/:deviceId
router.post('/upload/:deviceId', upload.single('firmware'), otaController.uploadFirmware);

// 4. Web Links GitHub .bin -> /api/ota/update-link/:deviceId
router.post('/update-link/:deviceId', otaController.updateViaLink);

// 5. ESP32 Requests Firmware Location -> /api/ota/trigger-update
router.get('/trigger-update', otaController.triggerUpdate);

module.exports = router;
