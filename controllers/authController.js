const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); // 🚨 NEW

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
// 1. Step 1: Generate & Send OTP via Email
exports.sendOtp = async (req, res) => {
    try {
        const { name, shopName, phone, email, password } = req.body;
        const User = require('../models/User');
        const bcrypt = require('bcryptjs');

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
        if (existingUser) {
            return res.render('auth/register', { error: 'Phone or Email already registered' });
        }

        // Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        console.log(`\n========================================`);
        console.log(`📱 OTP for ${shopName} (${phone}) is: ${otp}`);
        console.log(`========================================\n`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save data temporarily in the session
        req.session.tempVendor = { name, email, phone, password: hashedPassword, shopName, otp };

        // 🚨 THE FIX: Force the session to save to MongoDB BEFORE redirecting!
        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.render('auth/register', { error: 'Error saving session. Try again.' });
            }
            console.log("✅ Session saved successfully. Redirecting to /register/verify...");
            res.redirect('/register/verify');
        });

    } catch (error) {
        console.error("sendOtp Error:", error);
        res.render('auth/register', { error: 'Error sending OTP. Please try again.' });
    }
};


// 2. Step 2: Show OTP Verification Page
exports.getVerifyPage = (req, res) => {
    console.log("Checking session on /register/verify:", req.session.tempVendor); // Debugging
    
    // If no session data, they didn't fill the first form!
    if (!req.session.tempVendor) {
        console.log("❌ No tempVendor session found. Redirecting to /register.");
        return res.redirect('/register');
    }
    
    // Session exists! Show the OTP page.
    res.render('auth/verify-otp', { error: null, email: req.session.tempVendor.email, phone: req.session.tempVendor.phone });
};

// 3. Step 3: Check OTP and Save Vendor
exports.verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const tempData = req.session.tempVendor;

        if (!tempData) return res.redirect('/register');

        // Check if OTP matches
        if (otp !== tempData.otp) {
            return res.render('auth/verify-otp', { error: 'Invalid OTP. Please try again.', email: tempData.email });
        }

        // OTP matches! Create the real Vendor account
        const newVendor = new User({
            name: tempData.name,
            email: tempData.email, // Save email to DB
            phone: tempData.phone,
            password: tempData.password,
            shopName: tempData.shopName,
            role: 'vendor',
            isApproved: false 
        });

        await newVendor.save();
        
        req.session.tempVendor = null;
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.render('auth/verify-otp', { error: 'Server error during verification', email: '' });
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