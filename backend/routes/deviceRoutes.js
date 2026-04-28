const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, deviceController.addDevice);
router.get('/', protect, deviceController.getDevices);
router.post('/status', protect, deviceController.updateDeviceStatus);
router.delete('/:id', protect, deviceController.deleteDevice);

module.exports = router;
