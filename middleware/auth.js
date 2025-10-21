const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

// Check if user is a super admin
const isSuperAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'superadmin') {
    return next();
  }
  res.status(403).render('error', {
    message: 'Access denied. Super Admin privileges required.',
    error: {}
  });
};

// Check if user is a restaurant admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user &&
      (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
    return next();
  }
  res.status(403).render('error', {
    message: 'Access denied. Admin privileges required.',
    error: {}
  });
};

// Check if user is staff or higher
const isStaff = (req, res, next) => {
  if (req.session && req.session.user &&
      ['staff', 'admin', 'superadmin'].includes(req.session.user.role)) {
    return next();
  }
  res.status(403).render('error', {
    message: 'Access denied. Staff privileges required.',
    error: {}
  });
};

// Check if user belongs to the restaurant
const belongsToRestaurant = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/login');
  }

  // Super admins can access any restaurant
  if (req.session.user.role === 'superadmin') {
    return next();
  }

  // Check if user's restaurant matches the requested restaurant
  const restaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;

  if (restaurantId && req.session.user.restaurant) {
    if (req.session.user.restaurant.toString() === restaurantId.toString()) {
      return next();
    }
  }

  res.status(403).render('error', {
    message: 'Access denied. You do not have access to this restaurant.',
    error: {}
  });
};

// Load restaurant data for customer routes
const loadRestaurant = async (req, res, next) => {
  try {
    const restaurantSlug = req.params.restaurantSlug;

    if (!restaurantSlug) {
      return res.status(404).render('error', {
        message: 'Restaurant not found',
        error: {}
      });
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug, isActive: true });

    if (!restaurant) {
      return res.status(404).render('error', {
        message: 'Restaurant not found',
        error: {}
      });
    }

    // Store restaurant in session and locals
    req.session.restaurant = restaurant;
    res.locals.restaurant = restaurant;
    req.restaurant = restaurant;

    next();
  } catch (error) {
    console.error('Error loading restaurant:', error);
    res.status(500).render('error', {
      message: 'Error loading restaurant',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Customer authentication (phone-based)
const customerAuth = (req, res, next) => {
  if (req.session && req.session.customer) {
    res.locals.customer = req.session.customer;
    return next();
  }
  next();
};

// Optional authentication - doesn't redirect, just checks
const optionalAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
};

// Check specific permission
const hasPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    try {
      const user = await User.findById(req.session.user._id);

      if (user && user.hasPermission(permission)) {
        return next();
      }

      res.status(403).render('error', {
        message: `Access denied. You don't have permission to ${permission.replace(/_/g, ' ')}.`,
        error: {}
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).render('error', {
        message: 'Error checking permissions',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  };
};

module.exports = {
  isAuthenticated,
  isSuperAdmin,
  isAdmin,
  isStaff,
  belongsToRestaurant,
  loadRestaurant,
  customerAuth,
  optionalAuth,
  hasPermission
};