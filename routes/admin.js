const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { uploadMenuItemFiles } = require('../middleware/upload');

// Apply authentication and admin check to all routes
router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/dashboard', adminController.dashboard);
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// Menu Items
router.get('/menu-items', adminController.listMenuItems);
router.get('/menu-items/create', adminController.createMenuItemForm);
router.post('/menu-items/create', uploadMenuItemFiles, adminController.createMenuItem);
router.get('/menu-items/:id/edit', adminController.editMenuItemForm);
router.post('/menu-items/:id/edit', uploadMenuItemFiles, adminController.updateMenuItem);
router.delete('/menu-items/:id', adminController.deleteMenuItem);

// Tables
router.get('/tables', adminController.listTables);
router.get('/tables/create', adminController.createTableForm);
router.post('/tables/create', adminController.createTable);
router.post('/tables/:id/status', adminController.updateTableStatus);
router.delete('/tables/:id', adminController.deleteTable);

// Staff
router.get('/staff', adminController.listStaff);
router.get('/staff/create', adminController.createStaffForm);
router.post('/staff/create', adminController.createStaff);
router.post('/staff/:id/toggle-status', adminController.toggleStaffStatus);

// Orders
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.viewOrder);

module.exports = router;