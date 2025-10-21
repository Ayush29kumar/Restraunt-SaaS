const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  notes: {
    type: String,
    default: ''
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  }
});

const orderSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customerPhone: {
    type: String,
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'served', 'done', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    default: ''
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  servedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  placedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ restaurant: 1, table: 1 });
orderSchema.index({ restaurant: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ placedAt: -1 }); // For sorting recent orders

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => {
    item.subtotal = item.price * item.quantity;
    return sum + item.subtotal;
  }, 0);

  // Calculate tax (assuming 10% tax rate, can be made configurable)
  const taxRate = 0.10;
  this.tax = this.subtotal * taxRate;

  // Calculate total
  this.total = this.subtotal + this.tax;

  // Update completed time if status changed to done
  if (this.isModified('status') && this.status === 'done') {
    this.completedAt = new Date();
  }

  next();
});

// Method to add status history
orderSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: userId
  });
  return this.save();
};

// Method to calculate preparation time
orderSchema.methods.getPreparationTime = function() {
  if (!this.completedAt || !this.placedAt) return null;
  return Math.round((this.completedAt - this.placedAt) / 1000 / 60); // in minutes
};

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function(restaurantId) {
  const Restaurant = mongoose.model('Restaurant');
  const restaurant = await Restaurant.findById(restaurantId);
  const prefix = restaurant?.settings?.orderPrefix || 'ORD';

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's orders for this restaurant
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const count = await this.countDocuments({
    restaurant: restaurantId,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });

  const orderNum = String(count + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${orderNum}`;
};

module.exports = mongoose.model('Order', orderSchema);