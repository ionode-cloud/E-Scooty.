const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const adminEmail = 'admin@adas.com';
const adminPassword = 'AdminPassword123';

async function seedAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists.');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const admin = new User({
            email: adminEmail,
            password: hashedPassword,
            plainPassword: adminPassword,
            role: 'admin',
            isVerified: true
        });

        await admin.save();
        console.log('Admin user created successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
}

seedAdmin();
