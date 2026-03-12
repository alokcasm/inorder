const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Render Pages
exports.getLoginPage = (req, res) => {
    if (req.session.user) return res.redirect('/vendor/dashboard');
    res.render('auth/login', { error: null });
};

exports.getRegisterPage = (req, res) => {
    if (req.session.user) return res.redirect('/vendor/dashboard');
    res.render('auth/register', { error: null });
};

// Handle Registration
exports.registerVendor = async (req, res) => {
    try {
        const { name, phone, password, shopName } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.render('auth/register', { error: 'Phone number already registered' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new Vendor (Approved by default for testing purposes)
        const newVendor = new User({
            name,
            phone,
            password: hashedPassword,
            shopName,
            role: 'vendor',
            isApproved: false 
        });

        await newVendor.save();
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.render('auth/register', { error: 'Server error during registration' });
    }
};

// Handle Login
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Find user
        const user = await User.findOne({ phone });
        if (!user) {
            return res.render('auth/login', { error: 'Invalid phone or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('auth/login', { error: 'Invalid phone or password' });
        }

        // Check if vendor is approved
        // if (user.role === 'vendor' && !user.isApproved) {
        //     return res.render('auth/login', { error: 'Account pending admin approval' });
        // }

        // Save user to session
        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role,
            shopName: user.shopName
        };

        // Redirect based on role
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/vendor/dashboard');
        }

    } catch (error) {
        console.error(error);
        res.render('auth/login', { error: 'Server error during login' });
    }
};

// Handle Logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};