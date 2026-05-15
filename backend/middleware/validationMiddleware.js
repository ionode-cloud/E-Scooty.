/**
 * Middleware for validating Indian phone numbers
 */
exports.validateIndianPhone = (req, res, next) => {
    const indianPhoneRegex = /^(\+91)?[6-9]\d{9}$/;
    const { emergencyContacts } = req.body;

    if (emergencyContacts) {
        if (!Array.isArray(emergencyContacts)) {
            return res.status(400).json({ message: 'emergencyContacts must be an array' });
        }

        const invalid = emergencyContacts.filter(num => !indianPhoneRegex.test(num));
        if (invalid.length > 0) {
            return res.status(400).json({ 
                message: 'Invalid Indian phone number(s) detected', 
                invalidNumbers: invalid 
            });
        }

        // Normalize numbers: remove +91 and keep 10 digits
        req.body.emergencyContacts = emergencyContacts.map(num => {
            let clean = num.replace(/\D/g, '');
            if (clean.startsWith('91') && clean.length === 12) return clean.slice(2);
            return clean;
        });

        // Remove duplicates
        req.body.emergencyContacts = [...new Set(req.body.emergencyContacts)];
    }

    next();
};
