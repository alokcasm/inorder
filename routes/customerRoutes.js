const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/t/:tableId', customerController.getMenu);
router.post('/cart/add', customerController.addToCart);

// Razorpay Payment Routes
router.post('/checkout', customerController.placeOrder);
router.post('/verify-payment', customerController.verifyPayment); // New

// Tracking & Ratings
router.get('/track/:orderId', customerController.trackOrder);
router.post('/order/rate', customerController.submitRating); // New
router.get('/receipt/:orderId', customerController.getReceipt);

router.get('/t/:tableId', customerController.getMenu);
router.post('/t/:tableId/join', customerController.joinTable); // NEW


router.get('/t/:tableId/cart', customerController.getCart);
router.post('/cart/apply-coupon', customerController.applyCoupon);

router.post('/cart/update', customerController.updateCartItem);

module.exports = router;