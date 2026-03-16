const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { isVendor } = require('../middleware/authMiddleware');
const multer = require('multer');

// --- NEW CLOUDINARY UPLOAD LOGIC ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with your .env keys
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'inOrder_uploads', // A folder will be created in your Cloudinary account
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
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
router.post('/settings/update', upload.fields([{ name: 'aadhar' }, { name: 'pan' }]), vendorController.updateSettings);
router.get('/reports', vendorController.getReports);
router.post('/coupon/add', vendorController.addCoupon);
router.post('/coupon/delete/:id', vendorController.deleteCoupon);

router.post('/menu/toggle-stock/:id', vendorController.toggleStock);
router.post('/table/delete/:id', vendorController.deleteTable);

module.exports = router;