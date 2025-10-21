const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Password required for all except customer role
      return this.role !== 'customer';
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  phone: {
    type: String,
    sparse: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'staff', 'customer'],
    default: 'customer'
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() {
      // Restaurant required for admin, staff, and customer roles
      return this.role !== 'superadmin';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  permissions: [{
    type: String
  }]
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ username: 1 });
userSchema.index({ restaurant: 1, role: 1 });
userSchema.index({ phone: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  // Don't hash password for customers (they use phone login)
  if (this.role === 'customer') return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Customers don't have passwords
  if (this.role === 'customer') return false;

  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has permission
userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'superadmin') return true;
  if (this.role === 'admin') {
    // Admins have most permissions for their restaurant
    const adminPermissions = ['manage_menu', 'manage_tables', 'manage_staff', 'view_orders', 'manage_orders'];
    return adminPermissions.includes(permission);
  }
  if (this.role === 'staff') {
    // Staff can only view and update orders
    const staffPermissions = ['view_orders', 'update_order_status'];
    return staffPermissions.includes(permission);
  }
  return this.permissions && this.permissions.includes(permission);
};

module.exports = mongoose.model('User', userSchema);