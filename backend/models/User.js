const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    plainPassword: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'operator'],
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    otpCode: {
        type: String,
        default: null,
    },
    otpExpiry: {
        type: Date,
        default: null,
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
