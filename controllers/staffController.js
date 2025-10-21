const Order = require('../models/Order');
const Table = require('../models/Table');

// View orders
exports.viewOrders = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const { status, tableId } = req.query;

    const query = { restaurant: restaurantId };

    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by table if provided
    if (tableId) {
      query.table = tableId;
    }

    // Get orders for today by default
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query.createdAt = { $gte: today };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('table', 'tableNumber')
      .populate('items.menuItem', 'name price');

    // Get all tables for filter dropdown
    const tables = await Table.find({ restaurant: restaurantId })
      .sort({ tableNumber: 1 });

    res.render('staff/orders', {
      title: 'Orders',
      orders,
      tables,
      filters: { status, tableId }
    });
  } catch (error) {
    console.error('View orders error:', error);
    res.status(500).render('error', {
      message: 'Error loading orders',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// View single order details
exports.viewOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    })
      .populate('table', 'tableNumber location')
      .populate('items.menuItem')
      .populate('customer', 'name phone')
      .populate('statusHistory.updatedBy', 'name');

    if (!order) {
      return res.status(404).render('error', {
        message: 'Order not found',
        error: {}
      });
    }

    res.render('staff/order-details', {
      title: `Order #${order.orderNumber}`,
      order
    });
  } catch (error) {
    console.error('View order details error:', error);
    res.status(500).render('error', {
      message: 'Error loading order details',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const userId = req.session.user._id;

    const order = await Order.findOne({
      _id: orderId,
      restaurant: req.session.user.restaurant
    });

    if (!order) {
      return res.json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['preparing', 'cancelled'],
      'preparing': ['served', 'cancelled'],
      'served': ['done'],
      'done': [],
      'cancelled': []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Update status using the model method
    await order.updateStatus(status, userId);

    // Update table status if order is completed or cancelled
    if (status === 'done' || status === 'cancelled') {
      await Table.findByIdAndUpdate(order.table, {
        status: 'available',
        currentOrder: null
      });
    }

    res.json({
      success: true,
      newStatus: status
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

// Dashboard for staff
exports.dashboard = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      pendingOrders: await Order.countDocuments({
        restaurant: restaurantId,
        status: 'pending',
        createdAt: { $gte: today }
      }),
      preparingOrders: await Order.countDocuments({
        restaurant: restaurantId,
        status: 'preparing',
        createdAt: { $gte: today }
      }),
      servedOrders: await Order.countDocuments({
        restaurant: restaurantId,
        status: 'served',
        createdAt: { $gte: today }
      }),
      completedOrders: await Order.countDocuments({
        restaurant: restaurantId,
        status: 'done',
        createdAt: { $gte: today }
      })
    };

    // Get active orders
    const activeOrders = await Order.find({
      restaurant: restaurantId,
      status: { $in: ['pending', 'preparing', 'served'] },
      createdAt: { $gte: today }
    })
      .sort({ createdAt: 1 })
      .populate('table', 'tableNumber')
      .limit(20);

    res.render('staff/dashboard', {
      title: 'Staff Dashboard',
      stats,
      activeOrders
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Get order by table (for quick access)
exports.getOrderByTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const restaurantId = req.session.user.restaurant;

    const table = await Table.findOne({
      restaurant: restaurantId,
      tableNumber: tableNumber
    });

    if (!table) {
      return res.json({
        success: false,
        message: 'Table not found'
      });
    }

    const order = await Order.findOne({
      restaurant: restaurantId,
      table: table._id,
      status: { $nin: ['done', 'cancelled'] }
    })
      .sort({ createdAt: -1 })
      .populate('items.menuItem', 'name price')
      .populate('table', 'tableNumber');

    if (!order) {
      return res.json({
        success: false,
        message: 'No active order for this table'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order by table error:', error);
    res.json({
      success: false,
      message: 'Error fetching order'
    });
  }
};