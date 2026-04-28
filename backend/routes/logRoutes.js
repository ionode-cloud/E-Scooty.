const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', logController.createLog);
router.get('/', logController.getLogs);

module.exports = router;
