const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Landing page when scanning QR code
exports.tableEntry = async (req, res) => {
  try {
    const { restaurantSlug, tableNumber } = req.params;

    // Find restaurant
    const restaurant = await Restaurant.findOne({ slug: restaurantSlug, isActive: true });
    if (!restaurant) {
      return res.status(404).render('error', {
        message: 'Restaurant not found',
        error: {}
      });
    }

    // Find table
    const table = await Table.findOne({
      restaurant: restaurant._id,
      tableNumber: tableNumber,
      isActive: true
    });

    if (!table) {
      return res.status(404).render('error', {
        message: 'Table not found',
        error: {}
      });
    }

    // Store restaurant and table in session
    req.session.restaurant = restaurant;
    req.session.table = table;

    res.redirect(`/r/${restaurantSlug}/menu`);
  } catch (error) {
    console.error('Table entry error:', error);
    res.status(500).render('error', {
      message: 'Error accessing table',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// View menu
exports.viewMenu = async (req, res) => {
  try {
    const restaurant = req.restaurant || req.session.restaurant;

    if (!restaurant) {
      return res.redirect('/');
    }

    // Get all available menu items grouped by category
    const menuItems = await MenuItem.find({
      restaurant: restaurant._id,
      isAvailable: true
    }).sort({ category: 1, sortOrder: 1, name: 1 });

    // Group items by category
    const menu = {};
    menuItems.forEach(item => {
      const categoryName = item.getCategoryName();
      if (!menu[categoryName]) {
        menu[categoryName] = [];
      }
      menu[categoryName].push(item);
    });

    // Get cart from session
    const cart = req.session.cart || { items: [], total: 0 };

    res.render('customer/menu', {
      title: `${restaurant.name} - Menu`,
      restaurant,
      menu,
      cart,
      table: req.session.table
    });
  } catch (error) {
    console.error('View menu error:', error);
    res.status(500).render('error', {
      message: 'Error loading menu',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { itemId, quantity = 1, notes = '' } = req.body;
    const restaurant = req.restaurant || req.session.restaurant;

    if (!restaurant) {
      return res.json({ success: false, message: 'Restaurant not found' });
    }

    // Find menu item
    const menuItem = await MenuItem.findOne({
      _id: itemId,
      restaurant: restaurant._id,
      isAvailable: true
    });

    if (!menuItem) {
      return res.json({ success: false, message: 'Menu item not found' });
    }

    // Initialize cart if not exists
    if (!req.session.cart) {
      req.session.cart = { items: [], total: 0 };
    }

    // Check if item already in cart
    const existingIndex = req.session.cart.items.findIndex(
      item => item.menuItem.toString() === itemId
    );

    if (existingIndex > -1) {
      // Update quantity
      req.session.cart.items[existingIndex].quantity += parseInt(quantity);
      req.session.cart.items[existingIndex].subtotal =
        req.session.cart.items[existingIndex].quantity * menuItem.price;
    } else {
      // Add new item
      req.session.cart.items.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: parseInt(quantity),
        notes: notes,
        subtotal: menuItem.price * parseInt(quantity)
      });
    }

    // Calculate total
    req.session.cart.total = req.session.cart.items.reduce(
      (sum, item) => sum + item.subtotal, 0
    );

    res.json({
      success: true,
      cart: req.session.cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.json({ success: false, message: 'Error adding item to cart' });
  }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!req.session.cart) {
      return res.json({ success: false, message: 'Cart is empty' });
    }

    const itemIndex = req.session.cart.items.findIndex(
      item => item.menuItem.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.json({ success: false, message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      // Remove item
      req.session.cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      req.session.cart.items[itemIndex].quantity = parseInt(quantity);
      req.session.cart.items[itemIndex].subtotal =
        req.session.cart.items[itemIndex].quantity *
        req.session.cart.items[itemIndex].price;
    }

    // Recalculate total
    req.session.cart.total = req.session.cart.items.reduce(
      (sum, item) => sum + item.subtotal, 0
    );

    res.json({
      success: true,
      cart: req.session.cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.json({ success: false, message: 'Error updating cart' });
  }
};

// View cart
exports.viewCart = async (req, res) => {
  try {
    const restaurant = req.restaurant || req.session.restaurant;
    const cart = req.session.cart || { items: [], total: 0 };
    const table = req.session.table;

    res.render('customer/cart', {
      title: 'Your Order',
      restaurant,
      cart,
      table
    });
  } catch (error) {
    console.error('View cart error:', error);
    res.status(500).render('error', {
      message: 'Error loading cart',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Checkout page
exports.checkoutPage = async (req, res) => {
  try {
    const restaurant = req.restaurant || req.session.restaurant;
    const cart = req.session.cart || { items: [], total: 0 };
    const table = req.session.table;

    if (!cart.items || cart.items.length === 0) {
      return res.redirect(`/r/${restaurant.slug}/menu`);
    }

    res.render('customer/checkout', {
      title: 'Checkout',
      restaurant,
      cart,
      table,
      customer: req.session.customer
    });
  } catch (error) {
    console.error('Checkout page error:', error);
    res.status(500).render('error', {
      message: 'Error loading checkout',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Place order
exports.placeOrder = async (req, res) => {
  try {
    const { phone, notes = '' } = req.body;
    const restaurant = req.restaurant || req.session.restaurant;
    const cart = req.session.cart;
    const table = req.session.table;

    if (!restaurant || !table) {
      return res.json({
        success: false,
        message: 'Restaurant or table information missing'
      });
    }

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: 'Cart is empty' });
    }

    if (!phone) {
      return res.json({ success: false, message: 'Phone number is required' });
    }

    // Create or find customer
    let customer = await User.findOne({
      phone: phone,
      role: 'customer',
      restaurant: restaurant._id
    });

    if (!customer) {
      customer = new User({
        username: `customer_${phone}`,
        phone: phone,
        name: `Customer ${phone.slice(-4)}`,
        role: 'customer',
        restaurant: restaurant._id
      });
      await customer.save();
    }

    // Store customer in session
    req.session.customer = {
      _id: customer._id,
      phone: customer.phone,
      name: customer.name
    };

    // Generate order number
    const orderNumber = await Order.generateOrderNumber(restaurant._id);

    // Create order
    const order = new Order({
      restaurant: restaurant._id,
      table: table._id,
      customer: customer._id,
      customerPhone: phone,
      orderNumber: orderNumber,
      items: cart.items,
      notes: notes,
      status: 'pending'
    });

    await order.save();

    // Update table status
    await Table.findByIdAndUpdate(table._id, {
      status: 'occupied',
      currentOrder: order._id
    });

    // Clear cart
    req.session.cart = null;

    res.json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.json({ success: false, message: 'Error placing order' });
  }
};

// View order status
exports.viewOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const restaurant = req.restaurant || req.session.restaurant;

    const order = await Order.findOne({
      _id: orderId,
      restaurant: restaurant._id
    })
      .populate('items.menuItem', 'name')
      .populate('table', 'tableNumber');

    if (!order) {
      return res.status(404).render('error', {
        message: 'Order not found',
        error: {}
      });
    }

    res.render('customer/order-status', {
      title: `Order #${order.orderNumber}`,
      restaurant,
      order
    });
  } catch (error) {
    console.error('View order status error:', error);
    res.status(500).render('error', {
      message: 'Error loading order status',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Get order status (AJAX)
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const restaurant = req.restaurant || req.session.restaurant;

    const order = await Order.findOne({
      _id: orderId,
      restaurant: restaurant._id
    }, 'status orderNumber');

    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      status: order.status,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    console.error('Get order status error:', error);
    res.json({ success: false, message: 'Error fetching order status' });
  }
};

// View my orders (for logged-in customers)
exports.viewMyOrders = async (req, res) => {
  try {
    const restaurant = req.restaurant || req.session.restaurant;
    const customer = req.session.customer;

    if (!customer) {
      return res.render('customer/my-orders', {
        title: 'My Orders',
        restaurant,
        orders: []
      });
    }

    const orders = await Order.find({
      customer: customer._id,
      restaurant: restaurant._id
    })
      .sort({ createdAt: -1 })
      .populate('table', 'tableNumber')
      .populate('items.menuItem', 'name')
      .limit(20);

    res.render('customer/my-orders', {
      title: 'My Orders',
      restaurant,
      orders
    });
  } catch (error) {
    console.error('View my orders error:', error);
    res.status(500).render('error', {
      message: 'Error loading orders',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};