const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Landing Page
// router.get('/', (req, res) => {
//     // We will render the beautiful Glassmorphism landing page here later!
//     res.send('<h1>Welcome to QueueZero (inOrder)</h1> <a href="/login">Login</a> | <a href="/register">Register</a>');
// });

// Auth Routes
router.get('/login', authController.getLoginPage);
router.post('/login', authController.login);

router.get('/register', authController.getRegisterPage);
router.post('/register', authController.registerVendor);

router.get('/logout', authController.logout);

const User = require('../models/User');
router.get('/make-me-admin/:phone', async (req, res) => {
    try {
        await User.findOneAndUpdate({ phone: req.params.phone }, { role: 'admin' });
        res.send('Success! You are now a Super Admin. Please <a href="/logout">Logout</a> and log back in.');
    } catch (err) {
        res.send('Error making admin');
    }
});

module.exports = router;