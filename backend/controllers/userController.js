const User = require('../models/User');
const bcrypt = require('bcrypt');

// GET /api/users/me
// Get current user
exports.getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const user = await User.findById(req.user._id).select('-password -otpCode -otpExpiry');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/users
// Get all users (Admin only)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-otpCode -otpExpiry');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/users
// Create new user directly (Admin only) - Auto verified
exports.createUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        // Hash password before storing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email,
            password: hashedPassword,
            plainPassword: password,
            role: role || 'user',
            isVerified: true
        });

        await newUser.save();
        
        // Return user without sensitive fields
        const userResponse = newUser.toObject();
        delete userResponse.otpCode;
        delete userResponse.otpExpiry;
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT /api/users/:id
// Update user (Admin only)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Only allow email change if it's not taken by someone else
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use.' });
            }
            user.email = email;
        }

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.plainPassword = password;
        }

        if (role) {
            user.role = role;
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.otpCode;
        delete userResponse.otpExpiry;

        res.status(200).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE /api/users/:id
// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Only prevent admin from deleting themselves if req.user is populated (e.g. via token)
        if (req.user && req.user._id.toString() === id.toString()) {
             return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
