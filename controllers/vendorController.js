const Order = require('../models/Order');
const Item = require('../models/Item');
const Table = require('../models/Table');
const QRCode = require('qrcode');

// 1. Load the Dashboard (Live Orders)
exports.getDashboard = async (req, res) => {
    try {
        const vendorId = req.session.user.id;
        
        // Fetch active orders (Pending, Preparing, Ready)
        const activeOrders = await Order.find({ 
            vendorId, 
            orderStatus: { $in: ['Pending', 'Preparing', 'Ready'] } 
        }).sort({ createdAt: 1 }); // Oldest first (Queue system)

        res.render('vendor/dashboard', { 
            user: req.session.user, 
            orders: activeOrders 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 2. Update Order Status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        
        // Update database
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, 
            { orderStatus: status }, 
            { new: true } // Return the updated document
        );

        // 🚨 ALERT THE CUSTOMER! 🚨 (Send instant Socket.io event to their phone)
        req.io.to(orderId).emit('statusUpdated', updatedOrder.orderStatus);

        res.redirect('/vendor/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 3. Load Menu Management Page
// 3. Load Menu & QR Management Page
exports.getMenuManager = async (req, res) => {
    try {
        const vendorId = req.session.user.id;
        // Fetch both menu items and tables for this vendor
        const items = await Item.find({ vendorId });
        const tables = await Table.find({ vendorId }).sort({ tableNumber: 1 });
        
        res.render('vendor/menu', { user: req.session.user, items, tables });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 4. Add a New Menu Item
exports.addItem = async (req, res) => {
    try {
        const { name, price, category, description } = req.body;
        
        // Check if an image was uploaded, otherwise use default
        let imagePath = '/uploads/default-food.png';
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        }

        const newItem = new Item({
            vendorId: req.session.user.id,
            name, 
            price, 
            category, 
            description,
            image: imagePath // Save the image path!
        });
        await newItem.save();
        res.redirect('/vendor/menu');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 5. Add a Table & Generate QR Code
exports.addTable = async (req, res) => {
    try {
        const { tableNumber } = req.body;
        const vendorId = req.session.user.id;

        // Check if table number already exists for this vendor
        const existingTable = await Table.findOne({ vendorId, tableNumber });
        if (existingTable) {
            return res.status(400).send('Table number already exists!');
        }

        // Create the table
        const newTable = new Table({ vendorId, tableNumber });
        await newTable.save();

        // Generate the unique Ordering URL for this specific table
        // e.g., http://localhost:3000/t/65a1b2c3d4e5f6
        const orderUrl = `${req.protocol}://${req.get('host')}/t/${newTable._id}`;
        
        // Generate QR Code image as a base64 Data URI
        newTable.qrCodeUrl = await QRCode.toDataURL(orderUrl, {
            color: { dark: '#000000', light: '#ffffff' },
            width: 300,
            margin: 2
        });
        
        await newTable.save(); // Save the QR code to the database

        res.redirect('/vendor/menu');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 6. Delete a Menu Item
exports.deleteItem = async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.redirect('/vendor/menu');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 7. Load Vendor Settings
const User = require('../models/User'); // Make sure User model is required at the top!

exports.getSettings = async (req, res) => {
    try {
        const vendor = await User.findById(req.session.user.id);
        res.render('vendor/settings', { user: req.session.user, vendor });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 8. Update Vendor Settings (Shop ON/OFF & UPI)
exports.updateSettings = async (req, res) => {
    try {
        const { upiId, isOpen } = req.body;
        // Checkboxes return 'on' if checked, undefined if unchecked
        const shopStatus = isOpen === 'on' ? true : false; 

        await User.findByIdAndUpdate(req.session.user.id, {
            upiId: upiId,
            isOpen: shopStatus
        });

        res.redirect('/vendor/settings');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 9. Load Vendor Reports & Analytics
exports.getReports = async (req, res) => {
    try {
        const vendorId = req.session.user.id;
        
        // Fetch all completed & paid orders
        const completedOrders = await Order.find({ 
            vendorId, 
            orderStatus: 'Served',
            paymentStatus: 'Paid' 
        }).sort({ createdAt: -1 });

        // Calculate Total Revenue
        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // Calculate Today's Revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaysOrders = completedOrders.filter(order => new Date(order.createdAt) >= today);
        const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // NEW: Calculate Last 30 Days Revenue
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysOrders = completedOrders.filter(order => new Date(order.createdAt) >= thirtyDaysAgo);
        const thirtyDaysRevenue = thirtyDaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        res.render('vendor/reports', { 
            user: req.session.user, 
            totalRevenue, 
            todaysRevenue, 
            thirtyDaysRevenue, // Passed to frontend
            totalOrders: completedOrders.length,
            todaysOrdersCount: todaysOrders.length,
            thirtyDaysOrdersCount: thirtyDaysOrders.length, // Passed to frontend
            recentOrders: completedOrders.slice(0, 50) 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


exports.editItem = async (req, res) => {
    try {
        const { name, price, offerPrice, category } = req.body;
        
        let updateData = { name, price, offerPrice: offerPrice || null, category };
        
        if (req.file) {
            updateData.image = '/uploads/' + req.file.filename;
        }

        await Item.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/vendor/menu');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};