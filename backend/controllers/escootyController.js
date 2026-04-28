const Dashboard = require('../models/Dashboard');
const Device = require('../models/Device');

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
        const newDashboard = new Dashboard(req.body);
        await newDashboard.save();
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

// =============================
// DEVICE CONTROLLERS
// =============================

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
