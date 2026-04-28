const Device = require('../models/Device');
const Dashboard = require('../models/Dashboard');

// Add new device
exports.addDevice = async (req, res) => {
    try {
        const { deviceName, deviceId, location } = req.body;

        const existingDevice = await Device.findOne({ deviceId });
        if (existingDevice) {
            return res.status(400).json({ message: 'Device ID already exists' });
        }

        const device = new Device({
            deviceName,
            deviceId,
            location,
            createdBy: req.user.email
        });

        await device.save();
        res.status(201).json({ message: 'Device added successfully', device });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all devices
exports.getDevices = async (req, res) => {
    try {
        let query = {};
        if (req.user && req.user.role !== 'admin') {
            // Find devices linked to user's dashboards or created by the user
            const userDashboards = await Dashboard.find({ user: req.user._id });
            const userDeviceIds = userDashboards.map(d => d.deviceId);
            
            query = { 
                $or: [
                    { createdBy: req.user.email },
                    { deviceId: { $in: userDeviceIds } }
                ]
            };
        }
        const devices = await Device.find(query).sort({ createdAt: -1 });

        // If status is not set manually, check based on last seen
        const devicesWithStatus = devices.map(device => {
            const now = new Date();
            const lastSeen = new Date(device.lastSeen);
            const diffMs = now - lastSeen;
            let status = device.status || (diffMs > 5 * 60 * 1000 ? 'Offline' : 'Online');

            return { ...device._doc, status };
        });

        res.status(200).json(devicesWithStatus);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update device status
exports.updateDeviceStatus = async (req, res) => {
    try {
        const { deviceId, status } = req.body;
        const device = await Device.findOneAndUpdate(
            { deviceId },
            { status, lastSeen: new Date() },
            { new: true }
        );

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        res.status(200).json({ message: 'Status updated', device });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete device
exports.deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        await Device.findByIdAndDelete(id);
        res.status(200).json({ message: 'Device deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
