const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tableNumber: { type: Number, required: true },
    qrCodeUrl: { type: String }, // We will generate and store the QR data URI here
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Table', tableSchema);