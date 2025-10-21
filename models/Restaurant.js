const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  address: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    currency: {
      type: String,
      default: '$'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    orderPrefix: {
      type: String,
      default: 'ORD'
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
restaurantSchema.index({ slug: 1 });
restaurantSchema.index({ subdomain: 1 });

// Method to generate slug from name
restaurantSchema.statics.generateSlug = function(name) {
  return name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

module.exports = mongoose.model('Restaurant', restaurantSchema);