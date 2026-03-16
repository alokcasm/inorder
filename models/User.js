const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // 🚨 NEW EMAIL FIELD
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'vendor'], default: 'vendor' },
    
    shopName: { type: String },
    shopAddress: { type: String },
    isApproved: { type: Boolean, default: false }, 
    isOpen: { type: Boolean, default: true }, 
    upiId: { type: String, default: '' },     
    
    // NEW: KYC Documents
    aadharImage: { type: String, default: '' },
    panImage: { type: String, default: '' },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);