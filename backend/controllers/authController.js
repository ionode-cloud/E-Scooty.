const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_MVaZ5C89_8jiHk3VAgopQaiJSsGoJ2vw1');

// Helper: generate random 6-digit OTP
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log('Register attempt:', { email, role });

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            console.log('Register failed: User already exists and verified:', email);
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (existingUser && !existingUser.isVerified) {
            // Update existing unverified user
            existingUser.password = hashedPassword;
            existingUser.plainPassword = password;
            existingUser.role = role || 'user';
            existingUser.otpCode = otp;
            existingUser.otpExpiry = otpExpiry;
            await existingUser.save();
        } else {
            // Create new user
            const newUser = new User({
                email,
                password: hashedPassword,
                plainPassword: password,
                role: role || 'user',
                otpCode: otp,
                otpExpiry,
                isVerified: false,
            });
            await newUser.save();
        }

        // Send OTP email
        await resend.emails.send({
            from: 'ADAS Dashboard <onboarding@resend.dev>',
            to: email,
            subject: 'Your ADAS Dashboard OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 12px;">
                    <h2 style="color: #38BDF8; margin-bottom: 8px;">ADAS Dashboard</h2>
                    <p style="color: #94A3B8;">Your one-time verification code is:</p>
                    <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #38BDF8; margin: 24px 0; text-align: center;">
                        ${otp}
                    </div>
                    <p style="color: #94A3B8; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });

        res.status(200).json({ message: 'OTP sent to your email. Please verify.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/auth/send-otp  (resend OTP for login or re-verification)
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No account found with this email.' });

        const otp = generateOtp();
        user.otpCode = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await resend.emails.send({
            from: 'ADAS Dashboard <onboarding@resend.dev>',
            to: email,
            subject: 'Your ADAS Dashboard OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 12px;">
                    <h2 style="color: #38BDF8; margin-bottom: 8px;">ADAS Dashboard</h2>
                    <p style="color: #94A3B8;">Your one-time verification code is:</p>
                    <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #38BDF8; margin: 24px 0; text-align: center;">
                        ${otp}
                    </div>
                    <p style="color: #94A3B8; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });

        res.status(200).json({ message: 'OTP sent successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code.' });
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        user.isVerified = true;
        user.otpCode = null;
        user.otpExpiry = null;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log('Login failed: User not found:', email);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email not yet verified. Please complete OTP verification.' });
        }

        let isMatch = false;
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            // It is a bcrypt hash
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // It is plaintext
            isMatch = password === user.password;
        }

        if (!isMatch) {
            console.log('Login failed: Password mismatch for user:', email);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            token,
            user: { id: user._id, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
