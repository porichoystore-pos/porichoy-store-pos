const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require('fs');

dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://porichoy-store-pos.vercel.app',
  'https://porichoy-store.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost')) return callback(null, true);
    if (origin.includes('vercel.app')) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with proper headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

// Add a route to check if an image exists
app.get('/api/image-check/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.json({ exists: true, filename: req.params.filename });
  } else {
    res.json({ exists: false, filename: req.params.filename });
  }
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    initializeDatabase();
  })
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Initialize Database with default data
const initializeDatabase = async () => {
  try {
    const User = require("./models/User");
    const Category = require("./models/Category");
    
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      await User.create({
        username: "admin",
        password: "adminissuhel06",
        role: "admin"
      });
      console.log("✅ Admin user created (admin/adminissuhel06)");
    } else {
      console.log("✅ Admin user already exists");
    }

    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      const defaultCategories = [
        { name: "Face Care", type: "main", description: "Face care products" },
        { name: "Hair Care", type: "main", description: "Hair care products" },
        { name: "Skin Care", type: "main", description: "Skin care products" },
        { name: "Makeup", type: "main", description: "Makeup products" },
        { name: "Jewelry", type: "main", description: "Jewelry items" }
      ];
      await Category.insertMany(defaultCategories);
      console.log("✅ Default categories created");
    }
  } catch (error) {
    console.log("⚠️ Database initialization error:", error.message);
  }
};

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/reports", require("./routes/reports"));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "Backend is working!",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong!", 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("\n🚀 ==================================");
  console.log(`   🖥️  Server is running!`);
  console.log("   ==================================");
  console.log(`   📱 Port: ${PORT}`);
  console.log(`   📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   📱 Uploads directory: ${uploadsDir}`);
  console.log("   ==================================\n");
});