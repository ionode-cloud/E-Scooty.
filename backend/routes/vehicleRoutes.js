const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/data', vehicleController.storeVehicleData);
router.get('/latest', vehicleController.getLatestVehicleData);
router.get('/history', vehicleController.getVehicleHistory);

module.exports = router;
