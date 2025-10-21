const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');

// Apply authentication and super admin check to all routes
router.use(isAuthenticated, isSuperAdmin);

// Dashboard
router.get('/dashboard', superAdminController.dashboard);
router.get('/', (req, res) => res.redirect('/superadmin/dashboard'));

// Restaurant management
router.get('/restaurants', superAdminController.listRestaurants);
router.get('/restaurants/create', superAdminController.createRestaurantForm);
router.post('/restaurants/create', superAdminController.createRestaurant);
router.get('/restaurants/:id/edit', superAdminController.editRestaurantForm);
router.post('/restaurants/:id/edit', superAdminController.updateRestaurant);
router.get('/restaurants/:id/view', superAdminController.viewRestaurant);
router.delete('/restaurants/:id', superAdminController.deleteRestaurant);
router.post('/restaurants/:id/toggle-status', superAdminController.toggleRestaurantStatus);

module.exports = router;