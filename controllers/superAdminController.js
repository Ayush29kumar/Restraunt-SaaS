const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

// Dashboard
exports.dashboard = async (req, res) => {
  try {
    const stats = {
      totalRestaurants: await Restaurant.countDocuments(),
      activeRestaurants: await Restaurant.countDocuments({ isActive: true }),
      totalUsers: await User.countDocuments(),
      totalOrders: await Order.countDocuments()
    };

    const recentRestaurants = await Restaurant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name');

    res.render('superadmin/dashboard', {
      title: 'Super Admin Dashboard',
      stats,
      recentRestaurants
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// List all restaurants
exports.listRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name username');

    res.render('superadmin/restaurants', {
      title: 'Manage Restaurants',
      restaurants
    });
  } catch (error) {
    console.error('List restaurants error:', error);
    res.status(500).render('error', {
      message: 'Error loading restaurants',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Create restaurant form
exports.createRestaurantForm = (req, res) => {
  res.render('superadmin/create-restaurant', {
    title: 'Create Restaurant'
  });
};

// Create restaurant
exports.createRestaurant = async (req, res) => {
  try {
    const {
      name,
      subdomain,
      address,
      phone,
      email,
      adminUsername,
      adminPassword,
      adminName,
      adminEmail
    } = req.body;

    // Check if subdomain is already taken
    const existingRestaurant = await Restaurant.findOne({ subdomain });
    if (existingRestaurant) {
      return res.render('superadmin/create-restaurant', {
        title: 'Create Restaurant',
        error: 'Subdomain already exists',
        formData: req.body
      });
    }

    // Check if admin username is already taken
    const existingUser = await User.findOne({ username: adminUsername });
    if (existingUser) {
      return res.render('superadmin/create-restaurant', {
        title: 'Create Restaurant',
        error: 'Admin username already exists',
        formData: req.body
      });
    }

    // Create restaurant
    const slug = Restaurant.generateSlug(name);
    const restaurant = new Restaurant({
      name,
      slug,
      subdomain,
      address,
      phone,
      email,
      createdBy: req.session.user._id
    });

    await restaurant.save();

    // Create admin user for the restaurant
    const adminUser = new User({
      username: adminUsername,
      password: adminPassword,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      restaurant: restaurant._id
    });

    await adminUser.save();

    res.redirect('/superadmin/restaurants?success=Restaurant created successfully');
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.render('superadmin/create-restaurant', {
      title: 'Create Restaurant',
      error: 'Error creating restaurant',
      formData: req.body
    });
  }
};

// Edit restaurant form
exports.editRestaurantForm = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).render('error', {
        message: 'Restaurant not found',
        error: {}
      });
    }

    // Get admin user for this restaurant
    const adminUser = await User.findOne({
      restaurant: restaurant._id,
      role: 'admin'
    });

    res.render('superadmin/edit-restaurant', {
      title: 'Edit Restaurant',
      restaurant,
      adminUser
    });
  } catch (error) {
    console.error('Edit restaurant form error:', error);
    res.status(500).render('error', {
      message: 'Error loading restaurant',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Update restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const {
      name,
      subdomain,
      address,
      phone,
      email,
      isActive
    } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).render('error', {
        message: 'Restaurant not found',
        error: {}
      });
    }

    // Check if subdomain is already taken by another restaurant
    if (subdomain !== restaurant.subdomain) {
      const existingRestaurant = await Restaurant.findOne({
        subdomain,
        _id: { $ne: restaurantId }
      });

      if (existingRestaurant) {
        return res.render('superadmin/edit-restaurant', {
          title: 'Edit Restaurant',
          restaurant,
          error: 'Subdomain already exists'
        });
      }
    }

    // Update restaurant
    restaurant.name = name;
    restaurant.subdomain = subdomain;
    restaurant.slug = Restaurant.generateSlug(name);
    restaurant.address = address;
    restaurant.phone = phone;
    restaurant.email = email;
    restaurant.isActive = isActive === 'true';

    await restaurant.save();

    res.redirect('/superadmin/restaurants?success=Restaurant updated successfully');
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).render('error', {
      message: 'Error updating restaurant',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Delete restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Check if restaurant has orders
    const orderCount = await Order.countDocuments({ restaurant: restaurantId });

    if (orderCount > 0) {
      return res.json({
        success: false,
        message: 'Cannot delete restaurant with existing orders. Deactivate instead.'
      });
    }

    // Delete all related data
    await User.deleteMany({ restaurant: restaurantId });
    await Restaurant.findByIdAndDelete(restaurantId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.json({
      success: false,
      message: 'Error deleting restaurant'
    });
  }
};

// Toggle restaurant status
exports.toggleRestaurantStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    res.json({
      success: true,
      isActive: restaurant.isActive
    });
  } catch (error) {
    console.error('Toggle restaurant status error:', error);
    res.json({
      success: false,
      message: 'Error toggling restaurant status'
    });
  }
};

// View restaurant details
exports.viewRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('createdBy', 'name username');

    if (!restaurant) {
      return res.status(404).render('error', {
        message: 'Restaurant not found',
        error: {}
      });
    }

    // Get restaurant statistics
    const stats = {
      totalUsers: await User.countDocuments({ restaurant: restaurant._id }),
      totalOrders: await Order.countDocuments({ restaurant: restaurant._id }),
      pendingOrders: await Order.countDocuments({
        restaurant: restaurant._id,
        status: 'pending'
      }),
      completedOrders: await Order.countDocuments({
        restaurant: restaurant._id,
        status: 'done'
      })
    };

    // Get restaurant users
    const users = await User.find({ restaurant: restaurant._id })
      .sort({ role: 1, createdAt: -1 });

    res.render('superadmin/view-restaurant', {
      title: `Restaurant: ${restaurant.name}`,
      restaurant,
      stats,
      users
    });
  } catch (error) {
    console.error('View restaurant error:', error);
    res.status(500).render('error', {
      message: 'Error loading restaurant details',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};