const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'vendor'], default: 'vendor' },
    
    // Vendor specific fields
    shopName: { type: String },
    shopAddress: { type: String },
    isApproved: { type: Boolean, default: false }, 
    
    // NEW ADVANCED FEATURES:
    isOpen: { type: Boolean, default: true }, // Restaurant ON/OFF toggle
    upiId: { type: String, default: '' },     // For accepting payments
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);