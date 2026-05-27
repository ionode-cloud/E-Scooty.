const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema({
    dashboardName: { type: String, required: true },
    particleId: { type: String, required: true },
    deviceId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enabledFeatures: {
        type: [String],
        enum: [
            'batterySOC', 'batteryVoltage', 'batteryTemperature',
            'motorTemperature', 'motorRPM', 'wheelRPM',
            'loss', 'torque', 'gps',
            'ignitionSwitch',
            'batterySOH', 'speed', 'systemStatus'
        ],
        default: [],
    },
    description: { type: String, default: '' },
    emergencyContacts: {
        type: [String],
        default: [],
        validate: {
            validator: function(contacts) {
                const indianPhoneRegex = /^(\+91)?[6-9]\d{9}$/;
                return contacts.every(num => indianPhoneRegex.test(num)) && contacts.length <= 10;
            },
            message: 'Invalid Indian phone number detected or contact limit exceeded (max 10).'
        }
    },
}, { timestamps: true });

// Production-ready indexing
dashboardSchema.index({ deviceId: 1 });
dashboardSchema.index({ user: 1 });

module.exports = mongoose.model('Dashboard', dashboardSchema);

