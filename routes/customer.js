const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { loadRestaurant, customerAuth } = require('../middleware/auth');

// QR Code entry point - table access
router.get('/:restaurantSlug/table/:tableNumber', customerController.tableEntry);

// Apply restaurant loading and customer auth to all following routes
router.use('/:restaurantSlug', loadRestaurant, customerAuth);

// Menu
router.get('/:restaurantSlug/menu', customerController.viewMenu);

// Cart operations
router.post('/:restaurantSlug/cart/add', customerController.addToCart);
router.post('/:restaurantSlug/cart/update/:itemId', customerController.updateCartItem);
router.get('/:restaurantSlug/cart', customerController.viewCart);

// Checkout and order
router.get('/:restaurantSlug/checkout', customerController.checkoutPage);
router.post('/:restaurantSlug/order/place', customerController.placeOrder);

// Order status
router.get('/:restaurantSlug/order/:orderId', customerController.viewOrderStatus);
router.get('/:restaurantSlug/order/:orderId/status', customerController.getOrderStatus);

// Customer orders
router.get('/:restaurantSlug/my-orders', customerController.viewMyOrders);

module.exports = router;