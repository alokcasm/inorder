const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');

// Protect all admin routes
router.use(isAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/vendors', adminController.getVendors);
router.post('/vendor/approve/:id', adminController.approveVendor);
router.post('/vendor/suspend/:id', adminController.suspendVendor);

module.exports = router;