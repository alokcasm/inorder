// Protects Vendor Routes
exports.isVendor = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'vendor') {
        next(); // User is a vendor, let them pass
    } else {
        res.redirect('/login'); // Not logged in, send to login page
    }
};

// Protects Admin Routes
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next(); // User is an admin, let them pass
    } else {
        res.redirect('/login');
    }
};