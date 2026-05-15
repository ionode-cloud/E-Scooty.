const axios = require('axios');
const winston = require('winston');

// Production logging setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'emergency_sms.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

/**
 * Standardize Indian Mobile Numbers
 */
const normalizeNumber = (num) => {
    let clean = num.replace(/\D/g, '');
    if (clean.length === 10) return clean;
    if (clean.length === 12 && clean.startsWith('91')) return clean.slice(2);
    return clean;
};

/**
 * Send Emergency SMS via Fast2SMS
 * Production-ready with retry and logging
 */
const sendSMS = async (numbers, message, retries = 2) => {
    const rawKey = process.env.FAST2SMS_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : null;
    
    if (!apiKey) {
        logger.error('SMS ABORTED: FAST2SMS_API_KEY is missing in .env');
        return { success: false, status: 'Failed', error: 'Missing API Key' };
    }

    if (!numbers || numbers.length === 0) return;

    const contactStr = numbers.map(normalizeNumber).join(',');

    try {
        // Fast2SMS Bulk SMS Endpoint
        const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: apiKey, // Send in params as well
                route: 'q',
                message: message,
                language: 'english',
                numbers: contactStr,
            },
            headers: {
                'authorization': apiKey // Primary auth method
            },
            timeout: 10000 
        });

        if (response.data.return) {
            logger.info(`SMS sent successfully to ${contactStr}`, { response: response.data });
            return { success: true, status: 'Sent' };
        } else {
            logger.error(`Fast2SMS Rejected Request: ${response.data.message}`, { data: response.data });
            throw new Error(response.data.message || 'Fast2SMS error');
        }
    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        logger.error(`SMS Error [${contactStr}]: ${errorMsg}`);
        
        if (retries > 0) {
            logger.info(`Retrying SMS to ${contactStr}... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendSMS(numbers, message, retries - 1);
        }
        
        return { success: false, status: 'Failed', error: errorMsg };
    }
};

/**
 * Format Emergency Message
 */
const formatEmergencyMessage = (alertData) => {
    const { action, deviceId, batteryTemperature, speed, gpsLatitude, gpsLongitude, scooterName } = alertData;
    
    const name = scooterName || deviceId;
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    // Create direct Google Maps search link for the coordinates
    const mapLink = (gpsLatitude && gpsLongitude) 
        ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
        : 'LOCATION_UNAVAILABLE';

    if (action === 'Accident Detected') {
        return `🚨 EMERGENCY: ACCIDENT DETECTED\nVehicle: ${name}\nTime: ${time}\nLIVE LOCATION: ${mapLink}\n\nPlease check immediately!`;
    }

    return `ALERT: ${action}\nVehicle: ${name}\nTemp: ${batteryTemperature}°C\nSpeed: ${speed}km/h\nLocation: ${mapLink}`;
};

/**
 * Trigger Emergency Alert Distribution
 */
exports.triggerEmergencyAlerts = async (contacts, alertData) => {
    const message = formatEmergencyMessage(alertData);
    const result = await sendSMS(contacts, message);
    return { ...result, message };
};
