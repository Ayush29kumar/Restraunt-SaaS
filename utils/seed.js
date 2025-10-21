const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/restaurants?retryWrites=true&w=majority", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await Restaurant.deleteMany({});
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await Order.deleteMany({});

    console.log('Creating seed data...');

    // Create Super Admin
    const superAdmin = new User({
      username: 'superadmin',
      password: 'superadmin123',
      name: 'Super Administrator',
      email: 'superadmin@restaurant-saas.com',
      role: 'superadmin',
      isActive: true
    });
    await superAdmin.save();
    console.log('Super Admin created');

    // Create Demo Restaurant
    const demoRestaurant = new Restaurant({
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      subdomain: 'demo',
      address: '123 Main Street, Demo City',
      phone: '+1 234-567-8900',
      email: 'info@demo-restaurant.com',
      createdBy: superAdmin._id,
      isActive: true,
      settings: {
        currency: '$',
        timezone: 'UTC',
        orderPrefix: 'DEMO'
      }
    });
    await demoRestaurant.save();
    console.log('Demo Restaurant created');

    // Create Restaurant Admin
    const restaurantAdmin = new User({
      username: 'admin',
      password: 'admin123',
      name: 'Restaurant Admin',
      email: 'admin@demo-restaurant.com',
      role: 'admin',
      restaurant: demoRestaurant._id,
      isActive: true
    });
    await restaurantAdmin.save();
    console.log('Restaurant Admin created');

    // Create Staff Members
    const staff1 = new User({
      username: 'staff1',
      password: 'staff123',
      name: 'John Staff',
      email: 'john@demo-restaurant.com',
      phone: '+1 234-567-8901',
      role: 'staff',
      restaurant: demoRestaurant._id,
      isActive: true
    });
    await staff1.save();

    const staff2 = new User({
      username: 'staff2',
      password: 'staff123',
      name: 'Jane Staff',
      email: 'jane@demo-restaurant.com',
      phone: '+1 234-567-8902',
      role: 'staff',
      restaurant: demoRestaurant._id,
      isActive: true
    });
    await staff2.save();
    console.log('Staff members created');

    // Create Menu Items
    const menuItems = [
      // Appetizers
      {
        restaurant: demoRestaurant._id,
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with caesar dressing, croutons, and parmesan',
        price: 8.99,
        category: 'appetizer',
        isVegetarian: true,
        preparationTime: 10,
        tags: ['salad', 'healthy'],
        sortOrder: 1
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Chicken Wings',
        description: 'Crispy wings with choice of buffalo, BBQ, or honey garlic sauce',
        price: 12.99,
        category: 'appetizer',
        spicyLevel: 2,
        preparationTime: 15,
        tags: ['popular', 'spicy'],
        sortOrder: 2
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Vegetable Spring Rolls',
        description: 'Crispy rolls filled with fresh vegetables, served with sweet chili sauce',
        price: 7.99,
        category: 'appetizer',
        isVegetarian: true,
        isVegan: true,
        preparationTime: 12,
        tags: ['vegan', 'crispy'],
        sortOrder: 3
      },

      // Main Courses
      {
        restaurant: demoRestaurant._id,
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with lemon herb butter, served with vegetables and rice',
        price: 24.99,
        category: 'main_course',
        isGlutenFree: true,
        preparationTime: 20,
        tags: ['seafood', 'healthy'],
        sortOrder: 1
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Beef Steak',
        description: '10oz sirloin steak cooked to perfection, served with mashed potatoes',
        price: 32.99,
        category: 'main_course',
        preparationTime: 25,
        tags: ['premium', 'popular'],
        sortOrder: 2
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
        price: 16.99,
        category: 'main_course',
        isVegetarian: true,
        preparationTime: 18,
        tags: ['italian', 'cheese'],
        sortOrder: 3
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Pasta Carbonara',
        description: 'Creamy pasta with bacon, egg, and parmesan cheese',
        price: 18.99,
        category: 'main_course',
        preparationTime: 15,
        tags: ['italian', 'creamy'],
        sortOrder: 4
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Vegan Buddha Bowl',
        description: 'Quinoa, roasted vegetables, chickpeas, and tahini dressing',
        price: 15.99,
        category: 'main_course',
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        preparationTime: 15,
        tags: ['vegan', 'healthy', 'bowl'],
        sortOrder: 5
      },

      // Desserts
      {
        restaurant: demoRestaurant._id,
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
        price: 8.99,
        category: 'dessert',
        isVegetarian: true,
        preparationTime: 10,
        tags: ['chocolate', 'popular'],
        sortOrder: 1
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
        price: 7.99,
        category: 'dessert',
        isVegetarian: true,
        preparationTime: 5,
        tags: ['italian', 'coffee'],
        sortOrder: 2
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Fresh Fruit Salad',
        description: 'Seasonal fresh fruits with honey lime dressing',
        price: 6.99,
        category: 'dessert',
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        preparationTime: 5,
        tags: ['healthy', 'fresh'],
        sortOrder: 3
      },

      // Beverages
      {
        restaurant: demoRestaurant._id,
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice',
        price: 4.99,
        category: 'beverage',
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        preparationTime: 5,
        tags: ['fresh', 'juice'],
        sortOrder: 1
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Coffee',
        description: 'Freshly brewed arabica coffee',
        price: 3.99,
        category: 'beverage',
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        preparationTime: 3,
        tags: ['hot', 'caffeine'],
        sortOrder: 2
      },
      {
        restaurant: demoRestaurant._id,
        name: 'Soft Drinks',
        description: 'Coca-Cola, Sprite, Fanta, or Ginger Ale',
        price: 3.49,
        category: 'beverage',
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        preparationTime: 1,
        tags: ['cold', 'soda'],
        sortOrder: 3
      }
    ];

    for (const item of menuItems) {
      const menuItem = new MenuItem(item);
      await menuItem.save();
    }
    console.log('Menu items created');

    // Create Tables
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      const table = new Table({
        restaurant: demoRestaurant._id,
        tableNumber: i.toString(),
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
        location: i <= 6 ? 'indoor' : 'outdoor',
        status: 'available',
        isActive: true,
        qrCode: `http://localhost:3000/r/demo-restaurant/table/${i}`
      });
      await table.save();
      tables.push(table);
    }
    console.log('Tables created');

    // Create a second restaurant
    const italianRestaurant = new Restaurant({
      name: 'Italian Bistro',
      slug: 'italian-bistro',
      subdomain: 'italian',
      address: '456 Pasta Lane, Rome District',
      phone: '+1 234-567-8999',
      email: 'info@italian-bistro.com',
      createdBy: superAdmin._id,
      isActive: true,
      settings: {
        currency: '$',
        timezone: 'UTC',
        orderPrefix: 'ITL'
      }
    });
    await italianRestaurant.save();

    // Create admin for Italian restaurant
    const italianAdmin = new User({
      username: 'italian_admin',
      password: 'admin123',
      name: 'Italian Admin',
      email: 'admin@italian-bistro.com',
      role: 'admin',
      restaurant: italianRestaurant._id,
      isActive: true
    });
    await italianAdmin.save();
    console.log('Second restaurant created');

    console.log('\n========================================');
    console.log('Seed data created successfully!');
    console.log('========================================\n');
    console.log('Login credentials:');
    console.log('------------------');
    console.log('Super Admin:');
    console.log('  Username: superadmin');
    console.log('  Password: superadmin123\n');
    console.log('Restaurant Admin (Demo Restaurant):');
    console.log('  Username: admin');
    console.log('  Password: admin123\n');
    console.log('Staff (Demo Restaurant):');
    console.log('  Username: staff1 or staff2');
    console.log('  Password: staff123\n');
    console.log('Customer Access:');
    console.log('  URL: http://localhost:3000/r/demo-restaurant/table/1');
    console.log('  (Replace table number 1 with any number from 1-10)\n');
    console.log('========================================\n');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run seed
connectDB().then(() => seedData());