const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Landing Page
router.get('/', (req, res) => {
    res.render('index');
});

// Login Routes
router.get('/login', authController.getLoginPage);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// 🚨 Registration & OTP Routes 🚨
router.get('/register', authController.getRegisterPage);
router.post('/register/send-otp', authController.sendOtp); // Step 1: Submits the form
router.get('/register/verify', authController.getVerifyPage); // Step 2: Loads the OTP screen
router.post('/register/verify', authController.verifyOtp); // Step 3: Checks the OTP

// Secret Admin Route
router.get('/make-me-admin/:phone', async (req, res) => {
    const User = require('../models/User');
    try {
        await User.findOneAndUpdate({ phone: req.params.phone }, { role: 'admin' });
        res.send('Success! You are now a Super Admin. Please <a href="/logout">Logout</a> and log back in.');
    } catch (err) {
        res.send('Error making admin');
    }
});

module.exports = router;