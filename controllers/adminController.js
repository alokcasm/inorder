const User = require('../models/User');
const Order = require('../models/Order');

// 1. Admin Dashboard (Platform Stats)
exports.getDashboard = async (req, res) => {
    try {
        const totalVendors = await User.countDocuments({ role: 'vendor' });
        const totalOrders = await Order.countDocuments();
        
        const paidOrders = await Order.find({ paymentStatus: 'Paid' });
        const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        const recentVendors = await User.find({ role: 'vendor' }).sort({ createdAt: -1 }).limit(5);

        // ADVANCED ANALYTICS: Group Revenue by Vendor!
        const vendorPerformance = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } }, // Only look at paid orders
            { $group: { 
                _id: '$vendorId', 
                totalRevenue: { $sum: '$totalAmount' }, 
                orderCount: { $sum: 1 } 
            }},
            { $sort: { totalRevenue: -1 } }, // Sort by highest revenue
            { $lookup: { // Join with User table to get shop name
                from: 'users', 
                localField: '_id', 
                foreignField: '_id', 
                as: 'vendorDetails' 
            }},
            { $unwind: '$vendorDetails' }
        ]);

        res.render('admin/dashboard', { 
            user: req.session.user,
            totalVendors,
            totalOrders,
            totalRevenue,
            recentVendors,
            vendorPerformance // Pass the new data to the view
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 2. Vendor Management Page
exports.getVendors = async (req, res) => {
    try {
        const vendors = await User.find({ role: 'vendor' }).sort({ createdAt: -1 });
        res.render('admin/vendors', { user: req.session.user, vendors });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 3. Approve a Vendor
exports.approveVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        await User.findByIdAndUpdate(vendorId, { isApproved: true });
        res.redirect('/admin/vendors');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// 4. Suspend/Revoke a Vendor
exports.suspendVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        await User.findByIdAndUpdate(vendorId, { isApproved: false });
        res.redirect('/admin/vendors');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};