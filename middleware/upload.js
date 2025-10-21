const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create upload directories
ensureDirectoryExists('uploads/menu-images');
ensureDirectoryExists('uploads/ar-models/android');
ensureDirectoryExists('uploads/ar-models/ios');

// Configure storage for menu images
const menuImageStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/menu-images');
  },
  filename: function(req, file, cb) {
    // Generate unique filename: restaurantId-timestamp-originalname
    const restaurantId = req.session.user.restaurant;
    const uniqueName = `${restaurantId}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Configure storage for AR models
const arModelStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Determine destination based on field name
    if (file.fieldname === 'androidArModel') {
      cb(null, 'uploads/ar-models/android');
    } else if (file.fieldname === 'iosArModel') {
      cb(null, 'uploads/ar-models/ios');
    } else {
      cb(new Error('Invalid field name for AR model'));
    }
  },
  filename: function(req, file, cb) {
    // Generate unique filename
    const restaurantId = req.session.user.restaurant;
    const uniqueName = `${restaurantId}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// File filter for AR models
const arModelFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'androidArModel') {
    // Accept .glb and .gltf files for Android
    if (ext === '.glb' || ext === '.gltf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid Android AR model format. Only .glb and .gltf files are allowed.'), false);
    }
  } else if (file.fieldname === 'iosArModel') {
    // Accept .usdz files for iOS
    if (ext === '.usdz') {
      cb(null, true);
    } else {
      cb(new Error('Invalid iOS AR model format. Only .usdz files are allowed.'), false);
    }
  } else {
    cb(new Error('Invalid field name for AR model'), false);
  }
};

// Create multer upload instances
const uploadMenuImages = multer({
  storage: menuImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for images
    files: 10 // Maximum 10 images per menu item
  },
  fileFilter: imageFileFilter
});

const uploadArModels = multer({
  storage: arModelStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for AR models
  },
  fileFilter: arModelFileFilter
});

// Combined upload middleware for menu items
const uploadMenuItemFiles = (req, res, next) => {
  // Handle both 'images' (for create) and 'newImages' (for edit) fields
  uploadMenuImages.fields([
    { name: 'images', maxCount: 10 },
    { name: 'newImages', maxCount: 10 }
  ])(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          req.uploadError = 'Image file size too large. Maximum size is 5MB per image.';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          req.uploadError = 'Too many images. Maximum 10 images allowed.';
        } else {
          req.uploadError = err.message;
        }
      } else {
        req.uploadError = err.message;
      }
      return next();
    }

    // Then handle AR models
    uploadArModels.fields([
      { name: 'androidArModel', maxCount: 1 },
      { name: 'iosArModel', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            req.uploadError = 'AR model file size too large. Maximum size is 50MB.';
          } else {
            req.uploadError = err.message;
          }
        } else {
          req.uploadError = err.message;
        }
      }
      next();
    });
  });
};

// Helper function to delete uploaded files
const deleteUploadedFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Helper function to delete multiple files
const deleteUploadedFiles = (filePaths) => {
  filePaths.forEach(filePath => {
    deleteUploadedFile(filePath);
  });
};

module.exports = {
  uploadMenuImages,
  uploadArModels,
  uploadMenuItemFiles,
  deleteUploadedFile,
  deleteUploadedFiles
};