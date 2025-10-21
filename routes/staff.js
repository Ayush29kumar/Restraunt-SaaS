const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { isAuthenticated, isStaff } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(isAuthenticated, isStaff);

// Dashboard
router.get('/dashboard', staffController.dashboard);
router.get('/', (req, res) => res.redirect('/staff/dashboard'));

// Orders
router.get('/orders', staffController.viewOrders);
router.get('/orders/:id', staffController.viewOrderDetails);
router.post('/orders/:id/status', staffController.updateOrderStatus);

// Quick access by table
router.get('/table/:tableNumber/order', staffController.getOrderByTable);

module.exports = router;