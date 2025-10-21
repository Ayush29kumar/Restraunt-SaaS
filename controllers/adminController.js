const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { deleteUploadedFiles, deleteUploadedFile } = require('../middleware/upload');
const path = require('path');

// Dashboard
exports.dashboard = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;

    const stats = {
      totalMenuItems: await MenuItem.countDocuments({ restaurant: restaurantId }),
      totalTables: await Table.countDocuments({ restaurant: restaurantId }),
      totalStaff: await User.countDocuments({ restaurant: restaurantId, role: 'staff' }),
      totalOrders: await Order.countDocuments({ restaurant: restaurantId }),
      pendingOrders: await Order.countDocuments({ restaurant: restaurantId, status: 'pending' }),
      todaysOrders: await Order.countDocuments({
        restaurant: restaurantId,
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      })
    };

    const recentOrders = await Order.find({ restaurant: restaurantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('table', 'tableNumber');

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      recentOrders
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Menu Items Management
exports.listMenuItems = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const menuItems = await MenuItem.find({ restaurant: restaurantId })
      .sort({ category: 1, sortOrder: 1, name: 1 });

    res.render('admin/menu-items', {
      title: 'Menu Items',
      menuItems
    });
  } catch (error) {
    console.error('List menu items error:', error);
    res.status(500).render('error', {
      message: 'Error loading menu items',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

exports.createMenuItemForm = (req, res) => {
  res.render('admin/create-menu-item', {
    title: 'Add Menu Item'
  });
};

exports.createMenuItem = async (req, res) => {
  try {
    // Check for upload errors
    if (req.uploadError) {
      return res.render('admin/create-menu-item', {
        title: 'Add Menu Item',
        error: req.uploadError,
        formData: req.body
      });
    }

    const restaurantId = req.session.user.restaurant;
    const {
      name,
      description,
      price,
      category,
      isVegetarian,
      isVegan,
      isGlutenFree,
      spicyLevel,
      preparationTime,
      tags,
      allergens
    } = req.body;

    // Process uploaded images
    const imageUrls = [];
    if (req.files && Array.isArray(req.files)) {
      // Handle array of images
      req.files.forEach(file => {
        imageUrls.push(`/uploads/menu-images/${file.filename}`);
      });
    } else if (req.files && req.files.images) {
      // Handle images field specifically
      req.files.images.forEach(file => {
        imageUrls.push(`/uploads/menu-images/${file.filename}`);
      });
    }

    // Process AR models
    let androidArUrl = '';
    let iosArUrl = '';

    if (req.files) {
      if (req.files.androidArModel && req.files.androidArModel[0]) {
        androidArUrl = `/uploads/ar-models/android/${req.files.androidArModel[0].filename}`;
      }
      if (req.files.iosArModel && req.files.iosArModel[0]) {
        iosArUrl = `/uploads/ar-models/ios/${req.files.iosArModel[0].filename}`;
      }
    }

    const menuItem = new MenuItem({
      restaurant: restaurantId,
      name,
      description,
      price: parseFloat(price),
      category,
      images: imageUrls,
      arModel: {
        android: androidArUrl,
        ios: iosArUrl
      },
      isVegetarian: isVegetarian === 'true',
      isVegan: isVegan === 'true',
      isGlutenFree: isGlutenFree === 'true',
      spicyLevel: parseInt(spicyLevel || 0),
      preparationTime: parseInt(preparationTime || 15),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      allergens: allergens ? allergens.split(',').map(a => a.trim()) : []
    });

    await menuItem.save();
    res.redirect('/admin/menu-items?success=Menu item created successfully');
  } catch (error) {
    console.error('Create menu item error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      const filesToDelete = [];
      if (Array.isArray(req.files)) {
        req.files.forEach(file => filesToDelete.push(file.path));
      } else {
        Object.values(req.files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach(file => filesToDelete.push(file.path));
          }
        });
      }
      deleteUploadedFiles(filesToDelete);
    }

    res.render('admin/create-menu-item', {
      title: 'Add Menu Item',
      error: 'Error creating menu item',
      formData: req.body
    });
  }
};

exports.editMenuItemForm = async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    });

    if (!menuItem) {
      return res.status(404).render('error', {
        message: 'Menu item not found',
        error: {}
      });
    }

    res.render('admin/edit-menu-item', {
      title: 'Edit Menu Item',
      menuItem
    });
  } catch (error) {
    console.error('Edit menu item form error:', error);
    res.status(500).render('error', {
      message: 'Error loading menu item',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    // Check for upload errors
    if (req.uploadError) {
      const menuItem = await MenuItem.findById(req.params.id);
      return res.render('admin/edit-menu-item', {
        title: 'Edit Menu Item',
        error: req.uploadError,
        menuItem
      });
    }

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    });

    if (!menuItem) {
      return res.status(404).render('error', {
        message: 'Menu item not found',
        error: {}
      });
    }

    const {
      name,
      description,
      price,
      category,
      existingImages,
      keepAndroidModel,
      keepIosModel,
      isVegetarian,
      isVegan,
      isGlutenFree,
      spicyLevel,
      preparationTime,
      isAvailable,
      tags,
      allergens
    } = req.body;

    // Handle images - combine existing (not removed) with new uploads
    let imageUrls = [];

    // Process existing images (filter out removed ones)
    if (existingImages) {
      const existingImageList = existingImages.split(',').filter(img => img.trim());
      imageUrls = [...existingImageList];
    }

    // Add new uploaded images
    if (req.files && req.files.newImages) {
      req.files.newImages.forEach(file => {
        imageUrls.push(`/uploads/menu-images/${file.filename}`);
      });
    } else if (req.files && Array.isArray(req.files)) {
      // Handle if files come as array
      req.files.forEach(file => {
        if (file.fieldname === 'newImages') {
          imageUrls.push(`/uploads/menu-images/${file.filename}`);
        }
      });
    }

    // Handle AR models
    let androidArUrl = menuItem.arModel.android;
    let iosArUrl = menuItem.arModel.ios;

    // Check if we should keep or remove existing models
    if (keepAndroidModel === 'false') {
      // Remove the old file if it exists
      if (androidArUrl && androidArUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', androidArUrl);
        deleteUploadedFile(filePath);
      }
      androidArUrl = '';
    }

    if (keepIosModel === 'false') {
      // Remove the old file if it exists
      if (iosArUrl && iosArUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', iosArUrl);
        deleteUploadedFile(filePath);
      }
      iosArUrl = '';
    }

    // Handle new AR model uploads
    if (req.files) {
      if (req.files.androidArModel && req.files.androidArModel[0]) {
        // Delete old file if replacing
        if (androidArUrl && androidArUrl.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', androidArUrl);
          deleteUploadedFile(filePath);
        }
        androidArUrl = `/uploads/ar-models/android/${req.files.androidArModel[0].filename}`;
      }

      if (req.files.iosArModel && req.files.iosArModel[0]) {
        // Delete old file if replacing
        if (iosArUrl && iosArUrl.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', iosArUrl);
          deleteUploadedFile(filePath);
        }
        iosArUrl = `/uploads/ar-models/ios/${req.files.iosArModel[0].filename}`;
      }
    }

    // Update menu item
    menuItem.name = name;
    menuItem.description = description;
    menuItem.price = parseFloat(price);
    menuItem.category = category;
    menuItem.images = imageUrls;
    menuItem.arModel = {
      android: androidArUrl,
      ios: iosArUrl
    };
    menuItem.isVegetarian = isVegetarian === 'true';
    menuItem.isVegan = isVegan === 'true';
    menuItem.isGlutenFree = isGlutenFree === 'true';
    menuItem.spicyLevel = parseInt(spicyLevel || 0);
    menuItem.preparationTime = parseInt(preparationTime || 15);
    menuItem.isAvailable = isAvailable === 'true';
    menuItem.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    menuItem.allergens = allergens ? allergens.split(',').map(a => a.trim()) : [];

    await menuItem.save();
    res.redirect('/admin/menu-items?success=Menu item updated successfully');
  } catch (error) {
    console.error('Update menu item error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      const filesToDelete = [];
      if (Array.isArray(req.files)) {
        req.files.forEach(file => filesToDelete.push(file.path));
      } else {
        Object.values(req.files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach(file => filesToDelete.push(file.path));
          }
        });
      }
      deleteUploadedFiles(filesToDelete);
    }

    const menuItem = await MenuItem.findById(req.params.id);
    res.render('admin/edit-menu-item', {
      title: 'Edit Menu Item',
      error: 'Error updating menu item',
      menuItem
    });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    });

    if (!menuItem) {
      return res.json({ success: false, message: 'Menu item not found' });
    }

    // Delete uploaded files before deleting the menu item
    const filesToDelete = [];

    // Delete image files
    if (menuItem.images && menuItem.images.length > 0) {
      menuItem.images.forEach(imageUrl => {
        if (imageUrl && imageUrl.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', imageUrl);
          filesToDelete.push(filePath);
        }
      });
    }

    // Delete AR model files
    if (menuItem.arModel) {
      if (menuItem.arModel.android && menuItem.arModel.android.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', menuItem.arModel.android);
        filesToDelete.push(filePath);
      }
      if (menuItem.arModel.ios && menuItem.arModel.ios.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', menuItem.arModel.ios);
        filesToDelete.push(filePath);
      }
    }

    // Delete all files
    deleteUploadedFiles(filesToDelete);

    // Now delete the menu item from database
    await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.json({ success: false, message: 'Error deleting menu item' });
  }
};

// Tables Management
exports.listTables = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const tables = await Table.find({ restaurant: restaurantId })
      .sort({ tableNumber: 1 })
      .populate('currentOrder');

    res.render('admin/tables', {
      title: 'Tables',
      tables
    });
  } catch (error) {
    console.error('List tables error:', error);
    res.status(500).render('error', {
      message: 'Error loading tables',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

exports.createTableForm = (req, res) => {
  res.render('admin/create-table', {
    title: 'Add Table'
  });
};

exports.createTable = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const { tableNumber, capacity, location, notes } = req.body;

    // Check if table number already exists
    const existingTable = await Table.findOne({
      restaurant: restaurantId,
      tableNumber
    });

    if (existingTable) {
      return res.render('admin/create-table', {
        title: 'Add Table',
        error: 'Table number already exists',
        formData: req.body
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    const table = new Table({
      restaurant: restaurantId,
      tableNumber,
      capacity: parseInt(capacity),
      location,
      notes
    });

    // Generate QR data
    table.qrCode = table.generateQRData(restaurant.slug);

    await table.save();
    res.redirect('/admin/tables?success=Table created successfully');
  } catch (error) {
    console.error('Create table error:', error);
    res.render('admin/create-table', {
      title: 'Add Table',
      error: 'Error creating table',
      formData: req.body
    });
  }
};

exports.updateTableStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const table = await Table.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    });

    if (!table) {
      return res.json({ success: false, message: 'Table not found' });
    }

    table.status = status;

    // Clear current order if status is available
    if (status === 'available') {
      table.currentOrder = null;
    }

    await table.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Update table status error:', error);
    res.json({ success: false, message: 'Error updating table status' });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    await Table.findOneAndDelete({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete table error:', error);
    res.json({ success: false, message: 'Error deleting table' });
  }
};

// Staff Management
exports.listStaff = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const staff = await User.find({
      restaurant: restaurantId,
      role: 'staff'
    }).sort({ name: 1 });

    res.render('admin/staff', {
      title: 'Staff Management',
      staff
    });
  } catch (error) {
    console.error('List staff error:', error);
    res.status(500).render('error', {
      message: 'Error loading staff',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

exports.createStaffForm = (req, res) => {
  res.render('admin/create-staff', {
    title: 'Add Staff Member'
  });
};

exports.createStaff = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const { username, password, name, email, phone } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('admin/create-staff', {
        title: 'Add Staff Member',
        error: 'Username already exists',
        formData: req.body
      });
    }

    const staffMember = new User({
      username,
      password,
      name,
      email,
      phone,
      role: 'staff',
      restaurant: restaurantId
    });

    await staffMember.save();
    res.redirect('/admin/staff?success=Staff member created successfully');
  } catch (error) {
    console.error('Create staff error:', error);
    res.render('admin/create-staff', {
      title: 'Add Staff Member',
      error: 'Error creating staff member',
      formData: req.body
    });
  }
};

exports.toggleStaffStatus = async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant,
      role: 'staff'
    });

    if (!staff) {
      return res.json({ success: false, message: 'Staff member not found' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    res.json({ success: true, isActive: staff.isActive });
  } catch (error) {
    console.error('Toggle staff status error:', error);
    res.json({ success: false, message: 'Error updating staff status' });
  }
};

// Orders Management
exports.listOrders = async (req, res) => {
  try {
    const restaurantId = req.session.user.restaurant;
    const { status, date } = req.query;

    const query = { restaurant: restaurantId };

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('table', 'tableNumber')
      .populate('customer', 'name phone')
      .populate('items.menuItem', 'name');

    res.render('admin/orders', {
      title: 'Orders',
      orders,
      filters: { status, date }
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).render('error', {
      message: 'Error loading orders',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

exports.viewOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      restaurant: req.session.user.restaurant
    })
      .populate('table', 'tableNumber')
      .populate('customer', 'name phone')
      .populate('items.menuItem')
      .populate('statusHistory.updatedBy', 'name');

    if (!order) {
      return res.status(404).render('error', {
        message: 'Order not found',
        error: {}
      });
    }

    res.render('admin/view-order', {
      title: `Order #${order.orderNumber}`,
      order
    });
  } catch (error) {
    console.error('View order error:', error);
    res.status(500).render('error', {
      message: 'Error loading order',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};