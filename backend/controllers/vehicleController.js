const DeviceData = require('../models/DeviceData');
const Device = require('../models/Device');
const Dashboard = require('../models/Dashboard');

// Store battery SOC, battery voltage, battery temperature, GPS, and motor/wheel metrics.
exports.storeVehicleData = async (req, res) => {
    try {
        const { 
            deviceId, batterySOC, batteryVoltage, batteryTemperature, 
            motorTemperature, motorRPM, wheelRPM, loss, torque,
            gpsLatitude, gpsLongitude, speed 
        } = req.body;

        const newData = new DeviceData({
            deviceId,
            batterySOC,
            batteryVoltage,
            batteryTemperature,
            motorTemperature,
            motorRPM,
            wheelRPM,
            loss,
            torque,
            gpsLatitude,
            gpsLongitude,
            speed
        });

        await newData.save();

        // Update device last seen
        await Device.findOneAndUpdate({ deviceId }, { lastSeen: new Date() });

        // Emit via Socket.io
        if (req.io) {
            req.io.emit('device-data', newData);
        }

        res.status(201).json({ message: 'Vehicle data stored successfully', data: newData });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Return latest vehicle data.
exports.getLatestVehicleData = async (req, res) => {
    try {
        const { deviceId } = req.query;
        if (!deviceId) {
            return res.status(400).json({ message: 'Device ID is required' });
        }
        const latest = await DeviceData.findOne({ deviceId }).sort({ timestamp: -1 });
        res.status(200).json(latest || {});
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Return previous data logs.
exports.getVehicleHistory = async (req, res) => {
    try {
        const { deviceId, limit = 100, startDate, endDate } = req.query;
        if (!deviceId) {
            return res.status(400).json({ message: 'Device ID is required' });
        }

        let query = { deviceId };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }

        const [dashboard, history] = await Promise.all([
            Dashboard.findOne({ deviceId }),
            DeviceData.find(query).sort({ timestamp: -1 }).limit(parseInt(limit))
        ]);

        if (!dashboard) {
            return res.status(200).json(history);
        }

        const features = dashboard.enabledFeatures || [];
        const filteredHistory = history.map(item => {
            const doc = item.toObject();
            const filtered = {
                _id: doc._id,
                deviceId: doc.deviceId,
                timestamp: doc.timestamp,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                action: doc.action,
                warningLevel: doc.warningLevel,
                accidentDetected: doc.accidentDetected,
            };

            if (features.includes('batterySOC')) filtered.batterySOC = doc.batterySOC;
            if (features.includes('batterySOH')) filtered.batterySOH = doc.batterySOH;
            if (features.includes('speed')) filtered.speed = doc.speed;
            if (features.includes('batteryVoltage')) filtered.batteryVoltage = doc.batteryVoltage;
            if (features.includes('batteryTemperature')) filtered.batteryTemperature = doc.batteryTemperature;
            if (features.includes('motorTemperature')) filtered.motorTemperature = doc.motorTemperature;
            if (features.includes('motorRPM')) filtered.motorRPM = doc.motorRPM;
            if (features.includes('ignitionSwitch')) filtered.ignitionStatus = doc.ignitionStatus;
            if (features.includes('gps')) {
                filtered.gpsLatitude = doc.gpsLatitude;
                filtered.gpsLongitude = doc.gpsLongitude;
            }
            if (features.includes('wheelRPM')) filtered.wheelRPM = doc.wheelRPM;
            if (features.includes('loss')) filtered.loss = doc.loss;
            if (features.includes('torque')) filtered.torque = doc.torque;

            return filtered;
        });

        res.status(200).json(filteredHistory);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
