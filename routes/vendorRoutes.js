const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { isVendor } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Set up Multer for Image Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // Save files to public/uploads folder
    },
    filename: function (req, file, cb) {
        // Give the file a unique name based on the current timestamp
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Protect all routes inside this file
router.use(isVendor);

// Dashboard
router.get('/dashboard', vendorController.getDashboard);
router.post('/order/update', vendorController.updateOrderStatus);

// Menu Management
router.get('/menu', vendorController.getMenuManager);
router.post('/menu/add', upload.single('image'), vendorController.addItem); // Added Image Upload Middleware
router.post('/menu/delete/:id', vendorController.deleteItem); // New Delete Route
router.post('/menu/edit/:id', upload.single('image'), vendorController.editItem);
router.post('/table/add', vendorController.addTable);

// Vendor Settings (ON/OFF Toggle & UPI)
router.get('/settings', vendorController.getSettings);
router.post('/settings/update', vendorController.updateSettings);
router.get('/reports', vendorController.getReports);

module.exports = router;