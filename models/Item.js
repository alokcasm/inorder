const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    offerPrice: { type: Number }, 
    category: { type: String, required: true }, 
    dietType: { type: String, enum: ['Veg', 'Non-Veg'], default: 'Veg' }, // NEW: Veg/Non-Veg indicator
    image: { type: String, default: '/uploads/default-food.png' }, 
    isAvailable: { type: Boolean, default: true }, 
    orderCount: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);