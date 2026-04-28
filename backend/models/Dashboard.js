const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema({
    dashboardName: { type: String, required: true },
    particleId: { type: String, required: true },
    deviceId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enabledFeatures: {
        type: [String],
        default: ['batterySOC', 'batteryVoltage', 'batteryTemperature', 'motorTemperature', 'motorRPM', 'wheelRPM', 'loss', 'torque', 'gps'],
    },
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Dashboard', dashboardSchema);

