const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['appetizer', 'main_course', 'dessert', 'beverage', 'special', 'other'],
    default: 'other'
  },
  // Multiple images for the menu item
  images: [{
    type: String,
    trim: true
  }],
  // AR model files for different platforms
  arModel: {
    android: {
      type: String, // URL to .glb or .gltf file for Android AR
      default: ''
    },
    ios: {
      type: String, // URL to .usdz file for iOS AR
      default: ''
    }
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  spicyLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  allergens: [{
    type: String,
    trim: true
  }],
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for faster queries
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ restaurant: 1, isAvailable: 1 });
menuItemSchema.index({ restaurant: 1, name: 'text' }); // Text search on name

// Virtual for formatted price
menuItemSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Method to get category display name
menuItemSchema.methods.getCategoryName = function() {
  const categoryMap = {
    'appetizer': 'Appetizer',
    'main_course': 'Main Course',
    'dessert': 'Dessert',
    'beverage': 'Beverage',
    'special': 'Special',
    'other': 'Other'
  };
  return categoryMap[this.category] || this.category;
};

module.exports = mongoose.model('MenuItem', menuItemSchema);