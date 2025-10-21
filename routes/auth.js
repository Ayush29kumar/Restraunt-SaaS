const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');

// Login page
router.get('/login', (req, res) => {
  const error = req.query.error;
  res.render('auth/login', {
    title: 'Login',
    error: error,
    returnTo: req.query.returnTo
  });
});

// Login handler
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Find user by username
    const user = await User.findOne({ username, isActive: true })
      .populate('restaurant');

    if (!user) {
      return res.redirect('/auth/login?error=Invalid username or password');
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.redirect('/auth/login?error=Invalid username or password');
    }

    // Check if role matches (optional security measure)
    if (role && user.role !== role && user.role !== 'superadmin') {
      return res.redirect('/auth/login?error=Invalid role');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Store user in session
    req.session.user = {
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurant: user.restaurant ? user.restaurant._id : null,
      restaurantName: user.restaurant ? user.restaurant.name : null
    };

    // Redirect based on role
    const returnTo = req.body.returnTo || req.query.returnTo;

    if (returnTo && !returnTo.includes('login')) {
      return res.redirect(returnTo);
    }

    switch (user.role) {
      case 'superadmin':
        res.redirect('/superadmin/dashboard');
        break;
      case 'admin':
        res.redirect('/admin/dashboard');
        break;
      case 'staff':
        res.redirect('/staff/orders');
        break;
      default:
        res.redirect('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/auth/login?error=An error occurred during login');
  }
});

// Customer login (phone-based)
router.post('/customer-login', async (req, res) => {
  try {
    const { phone, restaurantId } = req.body;

    if (!phone || !restaurantId) {
      return res.json({ success: false, message: 'Phone and restaurant required' });
    }

    // Find or create customer
    let customer = await User.findOne({
      phone: phone,
      role: 'customer',
      restaurant: restaurantId
    });

    if (!customer) {
      // Create new customer
      customer = new User({
        username: `customer_${phone}`,
        phone: phone,
        name: `Customer ${phone.slice(-4)}`,
        role: 'customer',
        restaurant: restaurantId
      });
      await customer.save();
    }

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    // Store customer in session
    req.session.customer = {
      _id: customer._id,
      phone: customer.phone,
      name: customer.name,
      restaurant: customer.restaurant
    };

    res.json({ success: true, customer: req.session.customer });
  } catch (error) {
    console.error('Customer login error:', error);
    res.json({ success: false, message: 'Login failed' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Change password page
router.get('/change-password', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  res.render('auth/change-password', {
    title: 'Change Password',
    user: req.session.user
  });
});

// Change password handler
router.post('/change-password', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.render('auth/change-password', {
        title: 'Change Password',
        user: req.session.user,
        error: 'New passwords do not match'
      });
    }

    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.redirect('/auth/login');
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.render('auth/change-password', {
        title: 'Change Password',
        user: req.session.user,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.render('auth/change-password', {
      title: 'Change Password',
      user: req.session.user,
      success: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.render('auth/change-password', {
      title: 'Change Password',
      user: req.session.user,
      error: 'An error occurred while changing password'
    });
  }
});

module.exports = router;