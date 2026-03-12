const Table = require('../models/Table');
const Item = require('../models/Item');
const User = require('../models/User');
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Load the Menu when Customer scans QR
exports.getMenu = async (req, res) => {
    try {
        const tableId = req.params.tableId;
        const table = await Table.findById(tableId).populate('vendorId');
        
        if (!table) return res.status(404).send('Table not found');

        // NEW: Check if the table is currently occupied
        const activeOrder = await Order.findOne({
            vendorId: table.vendorId._id,
            tableNumber: table.tableNumber,
            orderStatus: { $in: ['Pending', 'Preparing', 'Ready'] } // Order is still ongoing
        });

        // If occupied, show the Occupied Screen instead of the menu
        if (activeOrder) {
            return res.render('customer/occupied', { 
                tableNumber: table.tableNumber, 
                shopName: table.vendorId.shopName 
            });
        }

        const items = await Item.find({ vendorId: table.vendorId._id, isAvailable: true });
        
        if (!req.session.cart) req.session.cart = [];

        res.render('customer/menu', { 
            table, 
            vendor: table.vendorId, 
            items, 
            cart: req.session.cart 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 2. Add Item to Cart (API Endpoint)
exports.addToCart = (req, res) => {
    const { itemId, name, price } = req.body;
    
    if (!req.session.cart) req.session.cart = [];
    
    // Check if item already in cart
    const existingItem = req.session.cart.find(item => item.itemId === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        req.session.cart.push({ itemId, name, price: Number(price), quantity: 1 });
    }
    
    res.json({ success: true, cart: req.session.cart });
};

// 3. Place the Order
exports.placeOrder = async (req, res) => {
    try {
        const { tableId } = req.body;
        const cart = req.session.cart;

        if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

        const table = await Table.findById(tableId).populate('vendorId');
        
        // Check if store is closed
        if (!table.vendorId.isOpen || !table.vendorId.isApproved) { return res.status(400).json({ error: 'Restaurant cannot accept orders right now.' }) }

        let totalAmount = 0;
        cart.forEach(item => totalAmount += (item.price * item.quantity));

        // Create Order in Database (Status: Pending Payment)
        const newOrder = new Order({
            vendorId: table.vendorId._id,
            tableNumber: table.tableNumber,
            items: cart,
            totalAmount,
            paymentMethod: 'Razorpay',
            paymentStatus: 'Pending',
            orderStatus: 'Pending'
        });
        await newOrder.save();

        // Create Razorpay Order (Amount is in Paise, so multiply by 100)
        const options = {
            amount: totalAmount * 100, 
            currency: "INR",
            receipt: newOrder._id.toString()
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        // Send Order details back to frontend to open Razorpay Modal
        res.json({
            success: true,
            orderId: newOrder._id,
            razorpayOrderId: razorpayOrder.id,
            amount: options.amount,
            key: process.env.RAZORPAY_KEY_ID,
            shopName: table.vendorId.shopName
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// 4. Track Order Status
exports.trackOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('vendorId');
        
        if (!order) return res.status(404).send('Order not found');

        res.render('customer/track', { order, vendor: order.vendorId });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


// 4. Verify Razorpay Payment Signature
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

        // Verify Signature to ensure payment is legit
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                                        .update(body.toString())
                                        .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment Successful! Update DB
            const updatedOrder = await Order.findByIdAndUpdate(dbOrderId, { paymentStatus: 'Paid' }, { new: true });
            
            // Clear customer cart
            req.session.cart = [];

            // 🚨 ALERT THE KITCHEN! 🚨 (Only after successful payment)
            req.io.to(updatedOrder.vendorId.toString()).emit('newOrder', updatedOrder);

            res.json({ success: true, redirectUrl: `/track/${dbOrderId}` });
        } else {
            res.status(400).json({ success: false, error: 'Invalid Signature' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// 5. Submit Rating & Comment
exports.submitRating = async (req, res) => {
    try {
        const { orderId, rating, comment } = req.body;
        await Order.findByIdAndUpdate(orderId, { rating, comment });
        res.redirect(`/track/${orderId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 6. Generate Digital Receipt (Printable)
exports.getReceipt = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('vendorId');
        
        if (!order) return res.status(404).send('Order not found');

        res.render('customer/receipt', { order, vendor: order.vendorId });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};