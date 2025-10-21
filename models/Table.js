const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    default: 4
  },
  location: {
    type: String,
    enum: ['indoor', 'outdoor', 'patio', 'terrace', 'vip'],
    default: 'indoor'
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    default: 'available'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  qrCode: {
    type: String,
    default: '' // Will store QR code data or URL
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index for unique table numbers per restaurant
tableSchema.index({ restaurant: 1, tableNumber: 1 }, { unique: true });
tableSchema.index({ restaurant: 1, status: 1 });

// Method to generate QR code data
tableSchema.methods.generateQRData = function(restaurantSlug) {
  // In production, this would be the actual domain
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/r/${restaurantSlug}/table/${this.tableNumber}`;
};

// Method to check if table is available
tableSchema.methods.isAvailable = function() {
  return this.status === 'available' && this.isActive;
};

// Static method to find available tables for a restaurant
tableSchema.statics.findAvailable = function(restaurantId) {
  return this.find({
    restaurant: restaurantId,
    status: 'available',
    isActive: true
  });
};

module.exports = mongoose.model('Table', tableSchema);