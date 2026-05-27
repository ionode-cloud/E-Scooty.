const mongoose = require('mongoose');

const deviceDataSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
    },
    deviceName: {
        type: String,
    },
    batteryTemperature: {
        type: Number,
    },
    motorTemperature: {
        type: Number,
    },
    warningLevel: {
        type: String,
        enum: ['Normal', 'Warning', 'Danger'],
        default: 'Normal',
    },
    batterySOC: {
        type: Number,
    },
    batterySOH: {
        type: Number,   // State of Health (%)
        default: null,
    },
    batteryVoltage: {
        type: Number,
    },
    gpsLatitude: {
        type: Number,
    },
    gpsLongitude: {
        type: Number,
    },
    speed: {
        type: Number,
    },
    motorRPM: {
        type: Number,
    },
    wheelRPM: {
        type: Number,
    },
    loss: {
        type: Number,
    },
    torque: {
        type: Number,
    },
    flRadar: {
        type: Number,
    },
    frRadar: {
        type: Number,
    },
    rlRadar: {
        type: Number,
    },
    rrRadar: {
        type: Number,
    },
    brakeStatus: {
        type: String,
        enum: ['APPLIED', 'RELEASED'],
        default: 'RELEASED',
    },
    // Emergency brake event — recorded timestamp when brakeStatus flips to APPLIED
    emergencyBrakeTimestamp: {
        type: Date,
        default: null,
    },
    // Accident detection flag (set by sensor/algorithm)
    accidentDetected: {
        type: Boolean,
        default: false,
    },
    lux: {
        type: Number,
    },
    headlightStatus: {
        type: String,
        enum: ['ON', 'OFF'],
        default: 'OFF',
    },
    ignitionStatus: {
        type: String,
        enum: ['ON', 'OFF'],
    },
    action: {
        type: String, // e.g., 'TELEMETRY_SYNC', 'EMERGENCY_TRIGGER'
        default: 'TELEMETRY_SYNC',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('DeviceData', deviceDataSchema);
