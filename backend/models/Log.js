const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    level: {
        type: String,
        enum: ['INFO', 'WARNING', 'ERROR'],
        default: 'INFO',
    },
    data: {
        type: Object,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    deviceName: {
        type: String,
    },
    status: {
        type: String,
    }
});

module.exports = mongoose.model('Log', logSchema);
