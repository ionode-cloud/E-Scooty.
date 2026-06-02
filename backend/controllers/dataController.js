const DeviceData = require('../models/DeviceData');
const Device = require('../models/Device');
const Dashboard = require('../models/Dashboard');
const AlertHistory = require('../models/AlertHistory');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { triggerEmergencyAlerts } = require('../utils/smsService');

// Temperature Thresholds
const TEMP_THRESHOLDS = {
    NORMAL_MAX: 40,
    WARNING_MAX: 55
};

const getWarningLevel = (temp) => {
    if (temp <= TEMP_THRESHOLDS.NORMAL_MAX) return 'Normal';
    if (temp <= TEMP_THRESHOLDS.WARNING_MAX) return 'Warning';
    return 'Danger';
};

// ESP32 sends data here
exports.receiveData = async (req, res) => {
    try {
        const { 
            deviceId, batteryTemp, batterySOC, batterySOH, batteryVoltage, 
            motorTemp, motorRPM, wheelRPM, loss, torque,
            latitude, longitude, speed,
            flRadar, frRadar, rlRadar, rrRadar, 
            brakeStatus, lux, headlightStatus,
            accidentDetected, ignitionStatus
        } = req.body;

        // Validate device connection
        const device = await Device.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Update last seen
        device.lastSeen = new Date();
        await device.save();

        const normalizedBrake = String(brakeStatus || '').trim().toUpperCase();
        let mappedBrakeStatus = 'RELEASED';
        if (normalizedBrake === '1' || normalizedBrake === 'APPLIED') mappedBrakeStatus = 'APPLIED';

        const normalizedHeadlight = String(headlightStatus || '').trim().toUpperCase();
        let mappedHeadlightStatus = 'OFF';
        if (normalizedHeadlight === '1' || normalizedHeadlight === 'ON') mappedHeadlightStatus = 'ON';

        // Record emergency brake timestamp when brake is applied
        const emergencyBrakeTimestamp = (mappedBrakeStatus === 'APPLIED') ? new Date() : null;

        // Normalize accident flag
        const accidentFlag = accidentDetected === true || accidentDetected === 1 || accidentDetected === '1';

        const warningLevel = getWarningLevel(batteryTemp);

        const normalizedIgnition = String(ignitionStatus || '').trim().toUpperCase();
        let mappedIgnitionStatus = 'OFF';
        if (normalizedIgnition === '1' || normalizedIgnition === 'ON') {
            mappedIgnitionStatus = 'ON';
        } else if (normalizedIgnition === 'NC') {
            // NC = No Change — preserve the most recent stored ignition status
            const lastRecord = await DeviceData.findOne({ deviceId }).sort({ timestamp: -1 }).select('ignitionStatus');
            mappedIgnitionStatus = (lastRecord && lastRecord.ignitionStatus) ? lastRecord.ignitionStatus : 'OFF';
        }

        const newData = new DeviceData({
            deviceId,
            batteryTemperature: batteryTemp,
            batterySOC,
            batterySOH: batterySOH ?? null,
            batteryVoltage,
            motorTemperature: motorTemp,
            warningLevel,
            motorRPM,
            wheelRPM,
            loss,
            torque,
            gpsLatitude: latitude,
            gpsLongitude: longitude,
            speed,
            flRadar,
            frRadar,
            rlRadar,
            rrRadar,
            brakeStatus: mappedBrakeStatus,
            emergencyBrakeTimestamp,
            lux,
            headlightStatus: mappedHeadlightStatus,
            accidentDetected: accidentFlag,
            ignitionStatus: mappedIgnitionStatus || 'OFF',
        });

        await newData.save();

        // Emit real-time update via Socket.io
        req.io.emit('device-data', newData);

        // Fetch dashboard for emergency contacts
        const dashboard = await Dashboard.findOne({ deviceId });

        // Trigger SMS for Temperature Danger
        if (warningLevel === 'Danger' && dashboard) {
            await triggerEmergencyAlerts(dashboard.emergencyContacts, {
                alertType: 'Battery Overheat',
                scooterName: dashboard.dashboardName || deviceId,
                temperature: batteryTemp,
                time: new Date().toLocaleString(),
                latitude,
                longitude
            });
        }

        // Emit accident alert if detected
        if (accidentFlag) {
            const mapsLink = (latitude && longitude)
                ? `https://www.google.com/maps?q=${latitude},${longitude}`
                : null;
            
            if (dashboard) {
                await triggerEmergencyAlerts(dashboard.emergencyContacts, {
                    alertType: 'Accident Detected',
                    scooterName: dashboard.dashboardName || deviceId,
                    temperature: batteryTemp,
                    time: new Date().toLocaleString(),
                    latitude,
                    longitude
                });
            }
            req.io.emit('accident-alert', {
                deviceId,
                deviceName: device.deviceName || deviceId,
                timestamp: newData.timestamp,
                latitude,
                longitude,
                mapsLink,
                message: mapsLink
                    ? `⚠️ Accident detected! Help — accident happened at ${mapsLink}`
                    : `⚠️ Accident detected on device ${deviceId}!`,
            });
        }

        res.status(200).json({ message: 'Data received successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// Get device data history
exports.getHistory = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const [dashboard, history] = await Promise.all([
            Dashboard.findOne({ deviceId }),
            DeviceData.find({ deviceId }).sort({ timestamp: -1 }).limit(100)
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

// Download Excel File
exports.downloadExcel = async (req, res) => {
    try {
        const { deviceId, startDate, endDate } = req.query;

        const query = { deviceId };
        if (startDate && endDate) {
            query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const [dashboard, data] = await Promise.all([
            Dashboard.findOne({ deviceId }),
            DeviceData.find(query).sort({ timestamp: -1 })
        ]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Device Data Logs');

        const features = dashboard ? (dashboard.enabledFeatures || []) : [
            'batterySOC', 'batteryVoltage', 'batteryTemperature', 'gps', 'motorRPM', 'motorTemperature'
        ];

        const columns = [
            { header: 'Device ID', key: 'deviceId', width: 20 }
        ];

        if (features.includes('batterySOC')) {
            columns.push({ header: 'Battery SOC (%)', key: 'batterySOC', width: 15 });
        }
        if (features.includes('batterySOH')) {
            columns.push({ header: 'Battery SOH (%)', key: 'batterySOH', width: 15 });
        }
        if (features.includes('batteryVoltage')) {
            columns.push({ header: 'Battery Voltage (V)', key: 'batteryVoltage', width: 15 });
        }
        if (features.includes('batteryTemperature')) {
            columns.push({ header: 'Battery Temp (°C)', key: 'batteryTemperature', width: 15 });
        }
        if (features.includes('speed')) {
            columns.push({ header: 'Speed (km/h)', key: 'speed', width: 15 });
        }
        if (features.includes('motorTemperature')) {
            columns.push({ header: 'Motor Temp (°C)', key: 'motorTemperature', width: 15 });
        }
        if (features.includes('motorRPM')) {
            columns.push({ header: 'Motor RPM', key: 'motorRPM', width: 15 });
        }
        if (features.includes('wheelRPM')) {
            columns.push({ header: 'Wheel RPM', key: 'wheelRPM', width: 15 });
        }
        if (features.includes('loss')) {
            columns.push({ header: 'Loss', key: 'loss', width: 12 });
        }
        if (features.includes('torque')) {
            columns.push({ header: 'Torque (Nm)', key: 'torque', width: 12 });
        }
        if (features.includes('gps')) {
            columns.push({ header: 'Latitude', key: 'gpsLatitude', width: 15 });
            columns.push({ header: 'Longitude', key: 'gpsLongitude', width: 15 });
        }

        columns.push({ header: 'Timestamp', key: 'timestamp', width: 25 });

        worksheet.columns = columns;

        data.forEach(item => {
            const rowData = {
                deviceId: item.deviceId,
                timestamp: item.timestamp,
            };

            if (features.includes('batterySOC')) rowData.batterySOC = item.batterySOC;
            if (features.includes('batterySOH')) rowData.batterySOH = item.batterySOH;
            if (features.includes('batteryVoltage')) rowData.batteryVoltage = item.batteryVoltage;
            if (features.includes('batteryTemperature')) rowData.batteryTemperature = item.batteryTemperature;
            if (features.includes('speed')) rowData.speed = item.speed;
            if (features.includes('motorTemperature')) rowData.motorTemperature = item.motorTemperature;
            if (features.includes('motorRPM')) rowData.motorRPM = item.motorRPM;
            if (features.includes('wheelRPM')) rowData.wheelRPM = item.wheelRPM;
            if (features.includes('loss')) rowData.loss = item.loss;
            if (features.includes('torque')) rowData.torque = item.torque;
            if (features.includes('gps')) {
                rowData.gpsLatitude = item.gpsLatitude;
                rowData.gpsLongitude = item.gpsLongitude;
            }

            worksheet.addRow(rowData);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=DeviceData_${deviceId}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Fields returned by the simplified /api/escooty endpoints
const CORE_FIELDS = 'deviceId batterySOC batterySOH batteryVoltage batteryTemperature motorTemperature motorRPM speed brakeStatus gpsLatitude gpsLongitude ignitionStatus action timestamp';

// Helper: pick only the core fields from a Mongoose document
const pickCoreFields = (doc) => ({
    _id:                doc._id,
    deviceId:           doc.deviceId,
    batterySOC:         doc.batterySOC,
    batterySOH:         doc.batterySOH,
    batteryVoltage:     doc.batteryVoltage,
    batteryTemperature: doc.batteryTemperature,
    motorTemperature:   doc.motorTemperature,
    motorRPM:           doc.motorRPM,
    speed:              doc.speed,
    brakeStatus:        doc.brakeStatus,
    gpsLatitude:        doc.gpsLatitude,
    gpsLongitude:       doc.gpsLongitude,
    ignitionStatus:     doc.ignitionStatus,
    action:             doc.action,
    timestamp:          doc.timestamp,
});

// Simplified Core API for E-Vehicle Dashboard
exports.syncCoreData = async (req, res) => {
    try {
        const { 
            deviceId, timestamp, batterySOC, batterySOH, batteryVoltage, 
            motorTemperature, motorRPM,
            speed, Speed, brakeStatus, latitude, longitude, gpsLatitude, gpsLongitude,
            ignitionStatus, action 
        } = req.body;

        if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });

        const device = await Device.findOne({ deviceId });
        if (!device) return res.status(404).json({ message: 'Device node not found' });

        // Update heartbeat
        device.lastSeen = new Date();
        await device.save();

        const dashboards = await Dashboard.find({ deviceId });
        const hasDashboards = dashboards.length > 0;
        
        // Compile enabled features from all dashboards matching deviceId
        const enabled = new Set();
        if (hasDashboards) {
            dashboards.forEach(d => {
                if (d.enabledFeatures) {
                    d.enabledFeatures.forEach(f => enabled.add(f));
                }
            });
        }

        const isEnabled = (feature) => {
            if (!hasDashboards) return true; // If no dashboard is configured, save all fields
            return enabled.has(feature);
        };

        const normalizedBrake = String(brakeStatus || '').trim().toUpperCase();
        const mappedBrakeStatus = (normalizedBrake === '1' || normalizedBrake === 'APPLIED') ? 'APPLIED' : 'RELEASED';
        const emergencyBrakeTimestamp = (mappedBrakeStatus === 'APPLIED') ? new Date() : null;

        const batteryTemp = Number(req.body.batteryTemperature || req.body.batteryTemp || 0);
        const warningLevel = getWarningLevel(batteryTemp);

        const normalizedIgnition = String(ignitionStatus || '').trim().toUpperCase();
        let mappedIgnitionStatus;
        if (normalizedIgnition === 'ON' || normalizedIgnition === '1') {
            mappedIgnitionStatus = 'ON';
        } else if (normalizedIgnition === 'NC') {
            // NC = No Change — preserve the most recent stored ignition status
            const lastRecord = await DeviceData.findOne({ deviceId }).sort({ timestamp: -1 }).select('ignitionStatus');
            mappedIgnitionStatus = (lastRecord && lastRecord.ignitionStatus) ? lastRecord.ignitionStatus : 'OFF';
        } else {
            mappedIgnitionStatus = 'OFF';
        }

        const newData = new DeviceData({
            deviceId,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            batterySOC:         isEnabled('batterySOC') && batterySOC !== undefined ? Number(batterySOC) : undefined,
            batterySOH:         isEnabled('batterySOH') && batterySOH !== undefined ? Number(batterySOH) : undefined,
            batteryVoltage:     isEnabled('batteryVoltage') && batteryVoltage !== undefined ? Number(batteryVoltage) : undefined,
            batteryTemperature: isEnabled('batteryTemperature') ? batteryTemp : undefined,
            warningLevel:       isEnabled('batteryTemperature') ? warningLevel : undefined,
            motorTemperature:   isEnabled('motorTemperature') && motorTemperature !== undefined ? Number(motorTemperature) : undefined,
            motorRPM:           isEnabled('motorRPM') && motorRPM !== undefined ? Number(motorRPM) : undefined,
            speed:              isEnabled('speed') && (speed !== undefined || Speed !== undefined)
                                    ? (speed !== undefined ? Number(speed) : Number(Speed))
                                    : undefined,
            brakeStatus:        mappedBrakeStatus,
            emergencyBrakeTimestamp,
            gpsLatitude:        isEnabled('gps') && (latitude !== undefined || gpsLatitude !== undefined) ? Number(latitude || gpsLatitude) : undefined,
            gpsLongitude:       isEnabled('gps') && (longitude !== undefined || gpsLongitude !== undefined) ? Number(longitude || gpsLongitude) : undefined,
            ignitionStatus:     isEnabled('ignitionSwitch') && ignitionStatus !== undefined ? mappedIgnitionStatus : undefined,
            wheelRPM:           isEnabled('wheelRPM') && req.body.wheelRPM !== undefined ? Number(req.body.wheelRPM) : undefined,
            loss:               isEnabled('loss') && req.body.loss !== undefined ? Number(req.body.loss) : undefined,
            torque:             isEnabled('torque') && req.body.torque !== undefined ? Number(req.body.torque) : undefined,
            action:             action || 'TELEMETRY_SYNC'
        });

        await newData.save();
        req.io.emit('device-data', newData);

        // PRODUCTION EMERGENCY WORKFLOW
        const dashboard = dashboards[0];
        
        // Normalize action for comparison
        const normalizedAction = (action || '').trim();
        const emergencyActions = ['Accident Detected', 'Accident Detect', 'Battery Overheat', 'SOS Help', 'Theft Alert', 'Vehicle Theft'];
        
        const isValidEmergencyAction = normalizedAction !== '' && emergencyActions.includes(normalizedAction);
        const isBrakeEmergency = (mappedBrakeStatus === 'APPLIED' && normalizedAction !== '');
        const shouldTriggerAlert = isValidEmergencyAction || isBrakeEmergency;
        
        if (dashboard && shouldTriggerAlert) {
            const currentAction = isValidEmergencyAction ? normalizedAction : 'EMERGENCY_BRAKE';
            
            // 1. Create Alert History Record
            const alert = new AlertHistory({
                deviceId,
                action: currentAction,
                batteryTemperature: batteryTemp,
                batterySOC: newData.batterySOC,
                batterySOH: newData.batterySOH,
                batteryVoltage: newData.batteryVoltage,
                gpsLatitude: newData.gpsLatitude,
                gpsLongitude: newData.gpsLongitude,
                speed: newData.speed,
                brakeStatus: newData.brakeStatus,
                mapLink: `https://maps.google.com/?q=${newData.gpsLatitude},${newData.gpsLongitude}`,
                recipients: dashboard.emergencyContacts
            });

            // 2. Trigger Realtime SMS Distribution
            const smsResult = await triggerEmergencyAlerts(dashboard.emergencyContacts, {
                action: currentAction,
                deviceId,
                batteryTemperature: batteryTemp,
                speed: newData.speed,
                brakeStatus: newData.brakeStatus,
                gpsLatitude: newData.gpsLatitude,
                gpsLongitude: newData.gpsLongitude
            });

            alert.smsStatus = smsResult.status;
            await alert.save();

            // 3. Emit Socket.io Siren Event
            req.io.emit('emergency-alert', {
                ...alert.toObject(),
                siren: true,
                message: smsResult.message
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Core telemetry synchronized', 
            data: pickCoreFields(newData)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kernel sync error', error: error.message });
    }
};

// GET /api/alerts/:deviceId
exports.getAlertHistory = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const alerts = await AlertHistory.find({ deviceId }).sort({ createdAt: -1 }).limit(50);
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kernel alert fetch error', error: error.message });
    }
};

// DELETE /api/alerts/:deviceId — purge alert history
exports.deleteAlertHistory = async (req, res) => {
    try {
        const { deviceId } = req.params;
        await AlertHistory.deleteMany({ deviceId });
        res.status(200).json({ success: true, message: 'Alert history purged successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Alert purge failure', error: error.message });
    }
};

// GET /api/escooty — fetch telemetry records
// Query params: deviceId, limit (default 100), startDate, endDate
exports.getTelemetry = async (req, res) => {
    try {
        const { deviceId, limit = 100, startDate, endDate } = req.query;

        const query = {};

        if (deviceId) {
            // If a specific device is requested, verify it still has an active dashboard
            const activeDashboard = await Dashboard.findOne({ deviceId });
            if (!activeDashboard) {
                // Dashboard deleted — return empty, don't expose orphaned data
                return res.status(200).json([]);
            }
            query.deviceId = deviceId;
        } else {
            // No deviceId filter — only return data for devices with active dashboards
            const activeDashboards = await Dashboard.find({}, 'deviceId').lean();
            const activeDeviceIds = activeDashboards.map(d => d.deviceId);
            if (activeDeviceIds.length === 0) return res.status(200).json([]);
            query.deviceId = { $in: activeDeviceIds };
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const records = await DeviceData.find(query)
            .select(CORE_FIELDS)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT /api/escooty — upsert latest telemetry record for a device
// Same body as POST. Updates the most recent record; creates one if none exists.
exports.upsertTelemetry = async (req, res) => {
    try {
        const { 
            deviceId, timestamp, batterySOC, batterySOH, batteryVoltage, 
            speed, Speed, brakeStatus, latitude, longitude, gpsLatitude, gpsLongitude, action 
        } = req.body;

        if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });

        const device = await Device.findOne({ deviceId });
        if (!device) return res.status(404).json({ message: 'Device node not found' });

        device.lastSeen = new Date();
        await device.save();

        const mappedBrakeStatus = (brakeStatus === 1 || brakeStatus === '1' || brakeStatus === 'APPLIED') ? 'APPLIED' : 'RELEASED';
        const emergencyBrakeTimestamp = (mappedBrakeStatus === 'APPLIED') ? new Date() : null;

        const batteryTemp = Number(req.body.batteryTemperature || req.body.batteryTemp || 0);
        const warningLevel = getWarningLevel(batteryTemp);

        const payload = {
            deviceId,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            batterySOC:     Number(batterySOC || 0),
            batterySOH:     Number(batterySOH || 0),
            batteryVoltage: Number(batteryVoltage || 0),
            batteryTemperature: batteryTemp,
            warningLevel,
            speed:          Number(speed || Speed || 0),
            brakeStatus:    mappedBrakeStatus,
            emergencyBrakeTimestamp,
            gpsLatitude:    Number(latitude || gpsLatitude || 0),
            gpsLongitude:   Number(longitude || gpsLongitude || 0),
            action:         action || 'TELEMETRY_SYNC'
        };

        // Find the most recent record for this device and update it, or create new
        const upserted = await DeviceData.findOneAndUpdate(
            { deviceId },
            { $set: payload },
            { sort: { timestamp: -1 }, upsert: true, new: true }
        );

        req.io.emit('device-data', upserted);

        // Trigger SMS ONLY if action is critical.
        const dashboard = await Dashboard.findOne({ deviceId });
        const normalizedAction = (action || '').trim();
        const emergencyActions = ['Battery Overheat', 'Accident Detected', 'Accident Detect', 'Vehicle Theft', 'Theft Alert', 'SOS Help'];
        const isValidEmergencyAction = normalizedAction !== '' && emergencyActions.includes(normalizedAction);
        
        if (dashboard && isValidEmergencyAction) {
            await triggerEmergencyAlerts(dashboard.emergencyContacts, {
                alertType: normalizedAction,
                scooterName: dashboard.dashboardName || deviceId,
                temperature: batteryTemp,
                time: new Date().toLocaleString(),
                latitude: upserted.gpsLatitude,
                longitude: upserted.gpsLongitude
            });
        }

        res.status(200).json({
            success: true,
            message: 'Telemetry record upserted',
            data: pickCoreFields(upserted)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Upsert error', error: error.message });
    }
};

// DELETE /api/escooty — delete telemetry records by deviceId
// Query param: deviceId (required)
exports.deleteTelemetry = async (req, res) => {
    try {
        const deviceId = req.params.deviceId || req.query.deviceId;
        if (!deviceId) return res.status(400).json({ message: 'deviceId is required (as param /history/:deviceId or query ?deviceId=)' });

        const result = await DeviceData.deleteMany({ deviceId });
        res.status(200).json({ 
            success: true, 
            message: `Deleted ${result.deletedCount} records for node ${deviceId}` 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteTelemetryRecord = async (req, res) => {
    try {
        const deleted = await DeviceData.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Telemetry record not found' });
        res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a specific telemetry record
exports.updateData = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = await DeviceData.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedData) return res.status(404).json({ message: 'Record not found' });
        res.status(200).json({ success: true, message: 'Record updated', data: updatedData });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a specific telemetry record
exports.deleteData = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedData = await DeviceData.findByIdAndDelete(id);
        if (!deletedData) return res.status(404).json({ message: 'Record not found' });
        res.status(200).json({ success: true, message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Clear history for a device
exports.clearHistory = async (req, res) => {
    try {
        const { deviceId } = req.params;
        await DeviceData.deleteMany({ deviceId });
        res.status(200).json({ success: true, message: `History cleared for node ${deviceId}` });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get only emergency brake events for a device
exports.getEmergencyLogs = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const logs = await DeviceData.find({ 
            deviceId, 
            brakeStatus: 'APPLIED' 
        }).sort({ timestamp: -1 }).limit(50);
        
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching emergency logs', error: error.message });
    }
};

const fs = require('fs');

exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        const dataBuffer = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            // Expected columns: 1: Device ID, 2: Device Name, 3: Battery Temp, 4: SOC, 5: Voltage, 6: Motor Temp, 7: Motor RPM, 8: Wheel RPM, 9: Loss, 10: Torque, 11: Latitude, 12: Longitude, 13: Timestamp
            const deviceId = row.getCell(1).value;
            if (!deviceId) return;

            dataBuffer.push({
                deviceId: String(deviceId),
                deviceName: String(row.getCell(2).value || ''),
                batteryTemperature: Number(row.getCell(3).value) || 0,
                batterySOC: Number(row.getCell(4).value) || 0,
                batteryVoltage: Number(row.getCell(5).value) || 0,
                motorTemperature: Number(row.getCell(6).value) || 0,
                motorRPM: Number(row.getCell(7).value) || 0,
                wheelRPM: Number(row.getCell(8).value) || 0,
                loss: Number(row.getCell(9).value) || 0,
                torque: Number(row.getCell(10).value) || 0,
                gpsLatitude: Number(row.getCell(11).value) || 0,
                gpsLongitude: Number(row.getCell(12).value) || 0,
                timestamp: row.getCell(13).value ? new Date(row.getCell(13).value) : new Date(),
            });
        });

        if (dataBuffer.length > 0) {
            await DeviceData.insertMany(dataBuffer);
        }

        // Clean up
        fs.unlinkSync(req.file.path);

        res.status(200).json({ message: `Successfully imported ${dataBuffer.length} records.`, count: dataBuffer.length });
    } catch (error) {
        console.error('Upload Error:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing excel file', error: error.message });
    }
};

// Trigger manual emergency alert from dashboard
exports.triggerManualEmergency = async (req, res) => {
    try {
        const { deviceId, alertType } = req.body;
        if (!deviceId || !alertType) {
            return res.status(400).json({ message: 'deviceId and alertType are required' });
        }

        const dashboard = await Dashboard.findOne({ deviceId });
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        // Get latest telemetry for temperature and location
        const latestData = await DeviceData.findOne({ deviceId }).sort({ timestamp: -1 });

        await triggerEmergencyAlerts(dashboard.emergencyContacts, {
            alertType,
            scooterName: dashboard.dashboardName || deviceId,
            temperature: latestData ? latestData.batteryTemperature : 'N/A',
            time: new Date().toLocaleString(),
            latitude: latestData ? latestData.gpsLatitude : null,
            longitude: latestData ? latestData.gpsLongitude : null
        });

        // Log the emergency event with latest telemetry context to avoid "zeroing" the dashboard
        let telemetryContext = {};
        if (latestData) {
            telemetryContext = latestData.toObject();
            delete telemetryContext._id;
            delete telemetryContext.__v;
            delete telemetryContext.createdAt;
            delete telemetryContext.updatedAt;
        }

        const emergencyLog = new DeviceData({
            ...telemetryContext,
            deviceId,
            action: 'EMERGENCY_TRIGGER',
            accidentDetected: alertType === 'Accident Detected',
            timestamp: new Date()
        });
        await emergencyLog.save();

        // Log to AlertHistory as well so it appears in the dashboard history list
        const alertRecord = new AlertHistory({
            deviceId,
            action: alertType,
            batteryTemperature: emergencyLog.batteryTemperature,
            batterySOC: emergencyLog.batterySOC,
            batterySOH: emergencyLog.batterySOH,
            batteryVoltage: emergencyLog.batteryVoltage,
            gpsLatitude: emergencyLog.gpsLatitude,
            gpsLongitude: emergencyLog.gpsLongitude,
            speed: emergencyLog.speed,
            brakeStatus: emergencyLog.brakeStatus,
            mapLink: `https://maps.google.com/?q=${emergencyLog.gpsLatitude},${emergencyLog.gpsLongitude}`,
            recipients: dashboard.emergencyContacts,
            smsStatus: 'Sent' // Manual triggers assume immediate broadcast
        });
        await alertRecord.save();

        req.io.emit('device-data', emergencyLog);
        req.io.emit('emergency-alert', {
            ...alertRecord.toObject(),
            siren: true,
            message: `Manual ${alertType} triggered`
        });

        res.status(200).json({ success: true, message: `Emergency alert "${alertType}" sent to contacts.` });
    } catch (error) {
        res.status(500).json({ message: 'Error triggering emergency', error: error.message });
    }
};

// POST /api/escooty/ignition — set ignition ON/OFF for a device
exports.setIgnitionStatus = async (req, res) => {
    try {
        const { deviceId, ignitionStatus } = req.body;

        if (!deviceId || !ignitionStatus) {
            return res.status(400).json({ message: 'deviceId and ignitionStatus are required' });
        }

        const validStatuses = ['ON', 'OFF'];
        const normalizedStatus = String(ignitionStatus).toUpperCase();
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ message: 'ignitionStatus must be "ON" or "OFF"' });
        }

        const device = await Device.findOne({ deviceId });
        if (!device) return res.status(404).json({ message: 'Device node not found' });

        // Create a lightweight telemetry record capturing the ignition event
        const latestData = await DeviceData.findOne({ deviceId }).sort({ timestamp: -1 });
        const ignitionRecord = new DeviceData({
            ...(latestData ? latestData.toObject() : {}),
            _id: undefined,
            deviceId,
            ignitionStatus: normalizedStatus,
            action: `IGNITION_${normalizedStatus}`,
            timestamp: new Date(),
        });
        await ignitionRecord.save();

        // Emit real-time update
        req.io.emit('device-data', ignitionRecord);
        req.io.emit('ignition-update', { deviceId, ignitionStatus: normalizedStatus });

        res.status(200).json({
            success: true,
            message: `Ignition set to ${normalizedStatus} for device ${deviceId}`,
            ignitionStatus: normalizedStatus,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error setting ignition status', error: error.message });
    }
};
