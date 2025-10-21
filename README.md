# Restaurant SaaS Platform

A minimal full-stack multi-tenant restaurant management web application built with Node.js, Express, MongoDB, and EJS.

## Features

### 👑 Super Admin
- Create and manage multiple restaurants
- Each restaurant gets its own subdomain (simulated with URL slugs)
- Manage restaurant admins and settings
- View all restaurants and their statistics

### 🍽️ Restaurant Admin
- Manage menu items (CRUD operations)
  - Name, description, price, category
  - Dietary tags (vegetarian, vegan, gluten-free)
  - Spicy levels and preparation times
  - Image URLs for future AR implementation
- Manage tables with QR code support
- Manage staff accounts
- View and manage all orders
- Update menu prices in real-time

### 👨‍🍳 Staff
- View orders assigned to the restaurant
- Update order status (pending → preparing → served → done)
- View order details including table number, items, and totals
- Real-time dashboard with active orders

### 👤 Customer
- Access menu via QR code (containing restaurant + table info)
- Browse restaurant menu by categories
- Add items to cart with quantity selection
- View cart and order summary
- Login with phone number (no OTP required)
- Place orders
- Track order status in real-time

## Tech Stack

- **Backend:** Node.js with Express
- **Database:** MongoDB with Mongoose ODM
- **Templating:** EJS
- **Session Management:** express-session with MongoDB store
- **Authentication:** bcryptjs for password hashing
- **Styling:** Plain CSS (minimal, focused on functionality)

## Project Structure

```
restaurant-saas/
├── models/              # Mongoose models
│   ├── Restaurant.js
│   ├── User.js
│   ├── MenuItem.js
│   ├── Table.js
│   └── Order.js
├── controllers/         # Business logic
│   ├── superAdminController.js
│   ├── adminController.js
│   ├── staffController.js
│   └── customerController.js
├── routes/              # Express routes
│   ├── superadmin.js
│   ├── admin.js
│   ├── staff.js
│   ├── customer.js
│   └── auth.js
├── views/               # EJS templates
│   ├── partials/
│   ├── superadmin/
│   ├── admin/
│   ├── staff/
│   ├── customer/
│   └── auth/
├── public/              # Static files
│   ├── css/
│   └── js/
├── middleware/          # Custom middleware
│   └── auth.js
├── utils/               # Utility scripts
│   └── seed.js
├── server.js            # Main application file
├── package.json
├── .env                 # Environment variables
└── README.md

```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Step 1: Clone or Download

```bash
cd restaurant-saas
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

The `.env` file is already created with default settings:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/restaurant-saas
SESSION_SECRET=restaurant-saas-secret-key-2024
NODE_ENV=development
```

Modify these values if needed for your environment.

### Step 4: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# On Windows
# MongoDB should start automatically if installed as a service
```

### Step 5: Seed the Database

Run the seed script to populate initial data:

```bash
npm run seed
```

This will create:
- A super admin account
- Two demo restaurants with admins
- Staff accounts
- Menu items for the demo restaurant
- 10 tables for the demo restaurant

### Step 6: Start the Application

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## Default Login Credentials

### Super Admin
- **Username:** superadmin
- **Password:** superadmin123
- **Access:** http://localhost:3000/auth/login

### Restaurant Admin (Demo Restaurant)
- **Username:** admin
- **Password:** admin123
- **Access:** http://localhost:3000/auth/login

### Staff (Demo Restaurant)
- **Username:** staff1 or staff2
- **Password:** staff123
- **Access:** http://localhost:3000/auth/login

### Customer Access
- **Direct URL:** http://localhost:3000/r/demo-restaurant/table/1
- Replace table number (1-10) to simulate different tables
- Customers login with phone number only (no password required)

## Usage Guide

### Super Admin Workflow
1. Login as super admin
2. Create new restaurants with admin credentials
3. View and manage all restaurants
4. Toggle restaurant active/inactive status

### Restaurant Admin Workflow
1. Login as restaurant admin
2. Add menu items with categories, prices, and dietary information
3. Create tables and generate QR codes
4. Add staff members
5. Monitor orders and update statuses

### Staff Workflow
1. Login as staff
2. View incoming orders on dashboard
3. Update order status as they progress
4. Filter orders by status or table

### Customer Workflow
1. Scan QR code or visit table URL
2. Browse menu by categories
3. Add items to cart with quantity
4. Enter phone number for order tracking
5. Place order
6. Track order status in real-time

## API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Process login
- `GET /auth/logout` - Logout
- `POST /auth/customer-login` - Customer phone login

### Super Admin
- `GET /superadmin/dashboard` - Dashboard
- `GET /superadmin/restaurants` - List restaurants
- `POST /superadmin/restaurants/create` - Create restaurant

### Restaurant Admin
- `GET /admin/dashboard` - Dashboard
- `GET /admin/menu-items` - List menu items
- `POST /admin/menu-items/create` - Create menu item
- `GET /admin/tables` - List tables
- `GET /admin/staff` - List staff
- `GET /admin/orders` - List orders

### Staff
- `GET /staff/dashboard` - Dashboard
- `GET /staff/orders` - View orders
- `POST /staff/orders/:id/status` - Update order status

### Customer
- `GET /r/:restaurantSlug/menu` - View menu
- `POST /r/:restaurantSlug/cart/add` - Add to cart
- `GET /r/:restaurantSlug/cart` - View cart
- `POST /r/:restaurantSlug/order/place` - Place order
- `GET /r/:restaurantSlug/order/:orderId` - View order status

## Features Not Implemented (Future Scope)

- Real subdomains (currently using URL slugs)
- Payment integration
- Email/SMS notifications
- OTP verification for customers
- AR menu display (imageURL field ready)
- Advanced analytics and reporting
- Inventory management
- Kitchen display system
- Multi-language support

## Development Notes

- The application uses session-based authentication
- Passwords are hashed using bcrypt
- MongoDB sessions are stored for persistence
- Restaurant data is isolated using restaurantId fields
- The UI is minimal and functional, focusing on core features

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `sudo systemctl status mongod`
- Check MongoDB URI in `.env` file
- Verify MongoDB port (default: 27017)

### Port Already in Use
- Change PORT in `.env` file
- Or kill the process using port 3000: `lsof -i :3000` and `kill -9 <PID>`

### Seed Script Fails
- Ensure MongoDB is running
- Check database connection string
- Clear database manually if needed: `mongo restaurant-saas --eval "db.dropDatabase()"`

## Contributing

This is a demonstration project. Feel free to fork and modify for your needs.

## License

MIT

---

**Note:** This is a minimal implementation focusing on core functionality. For production use, additional features like proper error handling, input validation, security measures, and testing should be implemented.# Restraunt-SaaS
