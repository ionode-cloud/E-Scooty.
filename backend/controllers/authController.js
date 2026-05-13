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

// POST /api/auth/forgot-password  — send OTP to verified account email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        const user = await User.findOne({ email });
        if (!user || !user.isVerified) {
            // Return generic message to avoid account enumeration
            return res.status(200).json({ message: 'If that email is registered, an OTP has been sent.' });
        }

        const otp = generateOtp();
        user.otpCode = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        await resend.emails.send({
            from: 'Fleet Terminal <onboarding@resend.dev>',
            to: email,
            subject: 'Reset Your Fleet Terminal Access',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; background: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 12px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
                        <div style="width:40px;height:40px;background:#10B981;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;">🛵</div>
                        <span style="font-size:11px;font-weight:900;color:#10B981;letter-spacing:0.3em;text-transform:uppercase;">Fleet Terminal</span>
                    </div>
                    <h2 style="color:#10B981; margin:0 0 8px;">Reset Access</h2>
                    <p style="color:#94A3B8; margin:0 0 24px;">Use the code below to reset your password. It expires in <strong style="color:#F8FAFC;">10 minutes</strong>.</p>
                    <div style="font-size:40px; font-weight:bold; letter-spacing:14px; color:#10B981; text-align:center; background:#1E293B; padding:20px; border-radius:10px; margin-bottom:24px;">
                        ${otp}
                    </div>
                    <p style="color:#64748B; font-size:12px;">If you did not request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        res.status(200).json({ message: 'OTP sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/auth/reset-password  — verify OTP and set new password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code.' });
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.plainPassword = newPassword;
        user.otpCode = null;
        user.otpExpiry = null;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
