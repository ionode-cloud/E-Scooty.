const mongoose = require('mongoose');

const alertHistorySchema = new mongoose.Schema({
    deviceId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    batteryTemperature: { type: Number },
    batterySOC: { type: Number },
    batterySOH: { type: Number },
    batteryVoltage: { type: Number },
    gpsLatitude: { type: Number },
    gpsLongitude: { type: Number },
    speed: { type: Number },
    brakeStatus: { type: String },
    mapLink: { type: String },
    smsStatus: { 
        type: String, 
        enum: ['Sent', 'Failed', 'Pending'], 
        default: 'Pending' 
    },
    recipients: [String],
    resolved: { type: Boolean, default: false }
}, { timestamps: true });

// Add index for fast querying of recent alerts for a specific device
alertHistorySchema.index({ deviceId: 1, createdAt: -1 });

module.exports = mongoose.model('AlertHistory', alertHistorySchema);
