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
        const deleted = await Dashboard.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Dashboard not found' });
        res.status(200).json({ message: 'Dashboard deleted successfully' });
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
        const device = await Device.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ success: false, message: `Device "${deviceId}" not found.` });
        }
        res.status(200).json({ success: true, data: device });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching device', error: error.message });
    }
};

exports.updateDeviceByDeviceId = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const updated = await Device.findOneAndUpdate(
            { deviceId },
            req.body,
            { new: true, runValidators: true }
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
        res.status(200).json({ success: true, message: `Device "${deviceId}" deleted successfully.` });
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
        res.status(200).json({ message: 'Device deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting device', error: error.message });
    }
};
