const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tableNumber: { type: Number, required: true },
    
    items: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        name: String,
        price: Number,
        quantity: Number,
        instructions: { type: String, default: '' } 
    }],
    
    totalAmount: { type: Number, required: true },
    discountApplied: { type: Number, default: 0 }, // NEW
    finalAmount: { type: Number, required: true }, // NEW
    paymentMethod: { type: String, enum: ['UPI', 'Card', 'Cash', 'Razorpay'], default: 'UPI' },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    
    orderStatus: { 
        type: String, 
        enum: ['Awaiting Payment', 'Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'], 
        default: 'Awaiting Payment' 
    },

    // NEW ADVANCED FEATURES:
    rating: { type: Number, min: 1, max: 5 }, // Customer Rating (1-5)
    comment: { type: String },                // Customer Feedback
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);