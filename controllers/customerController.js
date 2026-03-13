const Table = require('../models/Table');
const Item = require('../models/Item');
const User = require('../models/User');
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Coupon = require('../models/Coupon');

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

        // Check if table is occupied
        // Check if table is occupied
        const activeOrder = await Order.findOne({
            vendorId: table.vendorId._id,
            tableNumber: table.tableNumber,
            orderStatus: { $in: ['Pending', 'Preparing', 'Ready'] } 
        });

        // 🚨 NEW LOGIC: Is the table occupied?
        if (activeOrder) {
            // Did THIS specific user place the order?
            if (req.session.activeOrderId && req.session.activeOrderId === activeOrder._id.toString()) {
                // It's their order! Redirect them straight to the tracking screen.
                return res.redirect(`/track/${activeOrder._id}`);
            } else {
                // It's someone else's order. Show the "Occupied" screen.
                return res.render('customer/occupied', { 
                    tableNumber: table.tableNumber, 
                    shopName: table.vendorId.shopName 
                });
            }
        }

        // NEW: If user hasn't entered name/phone, show the Welcome Animation Screen
        if (!req.session.customerPhone) {
            return res.render('customer/welcome', { table, vendor: table.vendorId });
        }

        const items = await Item.find({ vendorId: table.vendorId._id, isAvailable: true }).sort({ orderCount: -1 }); // Sort by most popular
        if (!req.session.cart) req.session.cart = [];

        res.render('customer/menu', { 
            table, 
            vendor: table.vendorId, 
            items, 
            cart: req.session.cart,
            customerName: req.session.customerName // Pass name to view
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

// --- ADD THIS BELOW addToCart IN controllers/customerController.js ---

exports.updateCartItem = (req, res) => {
    const { itemId, action } = req.body; // action will be 'increase' or 'decrease'
    
    if (!req.session.cart) req.session.cart = [];
    
    const itemIndex = req.session.cart.findIndex(item => item.itemId === itemId);
    
    if (itemIndex > -1) {
        if (action === 'increase') {
            req.session.cart[itemIndex].quantity += 1;
        } else if (action === 'decrease') {
            req.session.cart[itemIndex].quantity -= 1;
            // If quantity hits 0, remove the item entirely from the cart
            if (req.session.cart[itemIndex].quantity <= 0) {
                req.session.cart.splice(itemIndex, 1);
            }
        }
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
        if (!table.vendorId.isOpen || !table.vendorId.isApproved) {
            return res.status(400).json({ error: 'Restaurant cannot accept orders right now.' });
        }

        // 1. Calculate Base Total
        let totalAmount = 0;
        cart.forEach(item => totalAmount += (item.price * item.quantity));

        // 2. Apply Coupon if exists in session
        let discountApplied = 0;
        if (req.session.coupon) {
            if (req.session.coupon.discountType === 'FLAT') {
                discountApplied = req.session.coupon.discountValue;
            } else if (req.session.coupon.discountType === 'PERCENTAGE') {
                discountApplied = (totalAmount * req.session.coupon.discountValue) / 100;
            }
        }

        let finalAmount = totalAmount - discountApplied;
        if (finalAmount < 0) finalAmount = 0; // Prevent negative bills

        // 3. Create Order
        const newOrder = new Order({
            vendorId: table.vendorId._id,
            tableNumber: table.tableNumber,
            items: cart,
            totalAmount,
            discountApplied,
            finalAmount, // Save final discounted price
            paymentMethod: 'Razorpay',
            paymentStatus: 'Pending',
            orderStatus: 'Awaiting Payment'
        });
        await newOrder.save();

        // 4. Create Razorpay Order
        const options = {
            amount: Math.round(finalAmount * 100), // Razorpay uses Paise
            currency: "INR",
            receipt: newOrder._id.toString()
        };
        const razorpayOrder = await razorpayInstance.orders.create(options);

        res.json({
            success: true, orderId: newOrder._id, razorpayOrderId: razorpayOrder.id,
            amount: options.amount, key: process.env.RAZORPAY_KEY_ID, shopName: table.vendorId.shopName,
            prefill: { name: req.session.customerName, contact: req.session.customerPhone }
        });

    } catch (error) {
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
            
            // Payment Successful! Send to kitchen
            const updatedOrder = await Order.findByIdAndUpdate(dbOrderId, { 
                paymentStatus: 'Paid',
                orderStatus: 'Pending' 
            }, { new: true });
            
            // 🚨 REAL TRACKING LOGIC: Increase the order count for every item bought!
            for (let cartItem of req.session.cart) {
                await Item.findByIdAndUpdate(cartItem.itemId, { 
                    $inc: { orderCount: cartItem.quantity } 
                });
            }

            // Clear customer cart
            req.session.cart = [];
            req.session.activeOrderId = updatedOrder._id.toString();

            // Alert the Kitchen
            req.io.to(updatedOrder.vendorId.toString()).emit('newOrder', updatedOrder);

            // Alert the Kitchen
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

// 1.5. Save Customer Details
exports.joinTable = (req, res) => {
    req.session.customerName = req.body.name;
    req.session.customerPhone = req.body.phone;
    res.redirect(`/t/${req.params.tableId}`);
};

// Load Cart Page
exports.getCart = async (req, res) => {
    try {
        const table = await Table.findById(req.params.tableId).populate('vendorId');
        if (!table) return res.redirect('/');

        res.render('customer/cart', { 
            table, 
            vendor: table.vendorId, 
            cart: req.session.cart || [],
            appliedCoupon: req.session.coupon || null
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Apply Coupon Logic
exports.applyCoupon = async (req, res) => {
    try {
        const { code, vendorId } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), vendorId, isActive: true });

        if (!coupon) return res.json({ success: false, message: 'Invalid or expired coupon' });

        req.session.coupon = coupon; // Save coupon to session
        res.json({ success: true, coupon });
    } catch (error) {
        res.json({ success: false, message: 'Error applying coupon' });
    }
};
