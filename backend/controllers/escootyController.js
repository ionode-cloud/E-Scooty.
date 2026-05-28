const Dashboard = require('../models/Dashboard');
const Device = require('../models/Device');
const User = require('../models/User');
const crypto = require('crypto');
const { triggerEmergencyAlerts } = require('../utils/smsService');

// =============================
// DASHBOARD CONTROLLERS
// =============================

exports.getAllDashboards = async (req, res) => {
    try {
        const dashboards = await Dashboard.find();
        res.status(200).json(dashboards);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboards', error: error.message });
    }
};

exports.createDashboard = async (req, res) => {
    try {
        const { dashboardName, deviceId, user, email, particleId } = req.body;

        let userId = user;

        // Auto-generate or resolve user mapping
        if (!userId) {
            const userEmail = email || (req.user ? req.user.email : 'admin@escooty.com');
            let foundUser = await User.findOne({ email: userEmail });
            if (!foundUser) {
                foundUser = new User({
                    email: userEmail,
                    password: 'defaultpassword123',
                    role: 'admin',
                    isVerified: true
                });
                await foundUser.save();
            }
            userId = foundUser._id;
        }

        const finalParticleId = particleId || crypto.randomBytes(12).toString('hex');

        const newDashboard = new Dashboard({
            ...req.body,
            user: userId,
            particleId: finalParticleId
        });

        await newDashboard.save();

        // Send Welcome SMS to Emergency Contacts
        if (newDashboard.emergencyContacts && newDashboard.emergencyContacts.length > 0) {
            await triggerEmergencyAlerts(newDashboard.emergencyContacts, {
                alertType: 'Registration Confirmation',
                scooterName: newDashboard.dashboardName,
                temperature: 'N/A',
                time: new Date().toLocaleString(),
                latitude: null,
                longitude: null
            });
        }

        res.status(201).json(newDashboard);
    } catch (error) {
        res.status(500).json({ message: 'Error creating dashboard', error: error.message });
    }
};

exports.updateDashboard = async (req, res) => {
    try {
        const updated = await Dashboard.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Dashboard not found' });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating dashboard', error: error.message });
    }
};

exports.deleteDashboard = async (req, res) => {
    try {
        const DeviceData = require('../models/DeviceData');
        const deleted = await Dashboard.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Dashboard not found' });

        // Cascade: purge all telemetry history for this dashboard's deviceId
        const historyResult = await DeviceData.deleteMany({ deviceId: deleted.deviceId });

        res.status(200).json({
            message: 'Dashboard deleted successfully.',
            deviceId: deleted.deviceId,
            telemetryRecordsDeleted: historyResult.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting dashboard', error: error.message });
    }
};

exports.deleteDashboardByDeviceId = async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Delete the dashboard configuration
        const deletedDashboard = await Dashboard.findOneAndDelete({ deviceId });

        // Also delete all associated telemetry history
        const DeviceData = require('../models/DeviceData');
        const deletedData = await DeviceData.deleteMany({ deviceId });

        if (!deletedDashboard && deletedData.deletedCount === 0) {
            return res.status(404).json({ message: `No dashboard or telemetry found for device ID "${deviceId}"` });
        }

        res.status(200).json({
            success: true,
            message: `Node "${deviceId}" decommissioned. Dashboard removed and ${deletedData.deletedCount} telemetry records purged.`
        });
    } catch (error) {
        res.status(500).json({ message: 'Error decommissioning node', error: error.message });
    }
};

// =============================
// DEVICE CONTROLLERS
// =============================

// --- Find Device by deviceId (GET / PUT / DELETE) ---

exports.getDeviceByDeviceId = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const DeviceData = require('../models/DeviceData');

        const caseInsensitiveId = { $regex: new RegExp(`^${deviceId}$`, 'i') };

        // Fetch dashboard (for widget/feature selection) and latest telemetry in parallel
        const [dashboard, latest] = await Promise.all([
            Dashboard.findOne({ deviceId: caseInsensitiveId }),
            DeviceData.findOne({ deviceId: caseInsensitiveId }).sort({ timestamp: -1 }).lean()
        ]);

        const features = dashboard?.enabledFeatures || null;
        const has = (f) => !features || features.includes(f); // if no dashboard, show all

        // Map of feature name → response field(s)
        const response = {};

        if (has('batterySOC'))         response.batterySOC         = latest?.batterySOC         ?? null;
        if (has('batterySOH'))         response.batterySOH         = latest?.batterySOH         ?? null;
        if (has('batteryVoltage'))     response.batteryVoltage     = latest?.batteryVoltage     ?? null;
        if (has('batteryTemperature')) response.batteryTemperature = latest?.batteryTemperature ?? null;
        if (has('motorTemperature'))   response.motorTemperature   = latest?.motorTemperature   ?? null;
        if (has('motorRPM'))           response.motorRPM           = latest?.motorRPM           ?? null;
        if (has('wheelRPM'))           response.wheelRPM           = latest?.wheelRPM           ?? null;
        if (has('loss'))               response.loss               = latest?.loss               ?? null;
        if (has('torque'))             response.torque             = latest?.torque             ?? null;
        if (has('speed'))              response.speed              = latest?.speed              ?? null;
        if (has('ignitionSwitch'))     response.ignitionStatus     = latest?.ignitionStatus     ?? null;
        if (has('systemStatus'))       response.brakeStatus        = latest?.brakeStatus        ?? null;
        if (has('gps')) {
            response.gpsLatitude  = latest?.gpsLatitude  ?? null;
            response.gpsLongitude = latest?.gpsLongitude ?? null;
        }

        // action is always included
        response.action = latest?.action ?? null;

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching telemetry', error: error.message });
    }
};

exports.updateDeviceByDeviceId = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const updated = await Device.findOneAndUpdate(
            { deviceId },
            { $set: req.body },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: `Device "${deviceId}" not found.` });
        }
        res.status(200).json({ success: true, message: `Device "${deviceId}" updated successfully.`, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating device', error: error.message });
    }
};

exports.deleteDeviceByDeviceId = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const deleted = await Device.findOneAndDelete({ deviceId });
        if (!deleted) {
            return res.status(404).json({ success: false, message: `Device "${deviceId}" not found.` });
        }

        // Cascade: delete all dashboards linked to this deviceId
        const dashboardResult = await Dashboard.deleteMany({ deviceId: deleted.deviceId });

        res.status(200).json({
            success: true,
            message: `Device "${deviceId}" deleted successfully.`,
            dashboardsDeleted: dashboardResult.deletedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting device', error: error.message });
    }
};

exports.getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find();
        res.status(200).json(devices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching devices', error: error.message });
    }
};

exports.createDevice = async (req, res) => {
    try {
        const newDevice = new Device(req.body);
        await newDevice.save();
        res.status(201).json(newDevice);
    } catch (error) {
        res.status(500).json({ message: 'Error creating device', error: error.message });
    }
};

exports.updateDevice = async (req, res) => {
    try {
        const updated = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Device not found' });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating device', error: error.message });
    }
};

exports.deleteDevice = async (req, res) => {
    try {
        const deleted = await Device.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Device not found' });

        // Cascade: delete all dashboards linked to this device's deviceId
        const dashboardResult = await Dashboard.deleteMany({ deviceId: deleted.deviceId });

        res.status(200).json({
            message: 'Device deleted successfully',
            dashboardsDeleted: dashboardResult.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting device', error: error.message });
    }
};
