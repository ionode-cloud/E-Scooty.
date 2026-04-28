const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Device = require('../models/Device');

// 🔥 Replicate your original OTA SERVER URL or just use generic domain if running locally
const SERVER_URL = "http://localhost:5000/uploads";

// ===============================
// 1️⃣ Device Ping (ESP32 sends this)
// ===============================
exports.pingDevice = async (req, res) => {
    try {
        const deviceId = req.query.device;
        if (!deviceId) return res.status(400).send("Need device ID");

        // Update the lastSeen timestamp in MongoDB
        await Device.findOneAndUpdate(
            { deviceId },
            { lastSeen: Date.now() },
            { new: true, upsert: true } // Upsert just in case it's a completely unseen device pinging? Or just true
        );
        console.log(`${deviceId} is alive and pinged OTA`);
        res.send("OK");
    } catch (error) {
        res.status(500).send("Ping error");
    }
};

// ===============================
// 2️⃣ Check Device Online Status (Web uses this)
// ===============================
exports.checkDeviceStatus = async (req, res) => {
    try {
        const deviceId = req.query.device;
        if (!deviceId) return res.json({ online: false });

        const device = await Device.findOne({ deviceId });
        if (!device) return res.json({ online: false });

        const lastSeen = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;

        // Match original OTA logic: if seen within the last 10 seconds (10000ms)
        if (lastSeen && (Date.now() - lastSeen < 10000)) {
            return res.json({ online: true });
        }
        res.json({ online: false });
    } catch (error) {
        res.status(500).json({ online: false, error: 'DB Error' });
    }
};

// ===============================
// 3️⃣ Upload .bin for Specific Device
// ===============================
exports.uploadFirmware = async (req, res) => {
    try {
        const deviceId = req.params.deviceId;

        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const firmwareName = `firmware_${deviceId}.bin`;

        // File is temporarily in uploads/ with random name right now due to Multer
        // Rename it to what the ESP32 expects
        const targetPath = path.join(__dirname, '..', 'uploads', firmwareName);

        // Move/rename it
        fs.renameSync(req.file.path, targetPath);

        // Update DB
        const firmwareUrl = `${SERVER_URL}/${firmwareName}`;
        await Device.findOneAndUpdate(
            { deviceId },
            { otaUpdatePending: true, otaFirmwareUrl: firmwareUrl }
        );

        console.log(`Firmware uploaded for ${deviceId}`);
        res.send(`Firmware uploaded for ${deviceId}`);

    } catch (error) {
        console.error(error);
        res.status(500).send("File move/upload failed");
    }
};

// ===============================
// 4️⃣ Update via GitHub Link    
// ===============================
exports.updateViaLink = async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const firmwareUrl = req.body.url;

        if (!firmwareUrl) {
            return res.status(400).send("No URL provided");
        }

        const firmwareName = `firmware_${deviceId}.bin`;
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

        const filePath = path.join(uploadsDir, firmwareName);

        const response = await axios({
            method: "GET",
            url: firmwareUrl,
            responseType: "stream"
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on("finish", async () => {
            await Device.findOneAndUpdate(
                { deviceId },
                { otaUpdatePending: true, otaFirmwareUrl: firmwareUrl } // Just save github URL to match original
            );

            console.log(`Firmware downloaded for ${deviceId}`);
            res.send(`Firmware ready for ${deviceId}`);
        });

        writer.on("error", () => {
            res.status(500).send("Download failed");
        });

    } catch (error) {
        res.status(500).send("Invalid firmware URL or failure");
    }
};

// ===============================
// 5️⃣ ESP32 Checks for Update
// ===============================
exports.triggerUpdate = async (req, res) => {
    try {
        const deviceId = req.query.device;
        if (!deviceId) return res.json({ update: false });

        const device = await Device.findOne({ deviceId });

        if (device && device.otaUpdatePending) {
            const firmwareURL = device.otaFirmwareUrl;

            // Reset pending so it doesn't infinite loop updating
            device.otaUpdatePending = false;
            await device.save();

            console.log(`Update triggered for ${deviceId}`);
            console.log("Firmware URL:", firmwareURL);

            return res.json({
                update: true,
                url: firmwareURL
            });
        }

        res.json({ update: false });
    } catch (error) {
        res.status(500).json({ update: false });
    }
};
