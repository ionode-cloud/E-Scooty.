const Log = require('../models/Log');

exports.createLog = async (req, res) => {
    try {
        const { deviceId, message, level, data, deviceName, status } = req.body;

        const newLog = new Log({
            deviceId,
            message,
            level,
            data,
            deviceName,
            status
        });

        await newLog.save();
        res.status(201).json({ message: 'Log stored successfully', log: newLog });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const { deviceId, limit = 100 } = req.query;
        const query = deviceId ? { deviceId } : {};
        const logs = await Log.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
