const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

// CORS Configuration - Allow Vercel frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://porichoy-store.vercel.app', // Your frontend on Vercel
  'https://porichoy-store-git-main-yourusername.vercel.app' // Preview deployments
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);
      
      // Allow all localhost in development
      if (origin.includes('localhost')) return callback(null, true);
      
      // Allow any Vercel app
      if (origin.includes('vercel.app')) return callback(null, true);
      
      // Check against allowed origins
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('🚫 Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
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
    
    // Create admin user if not exists
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

    // Create default categories if none exist
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

// Health check route for Render
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

// Error handling middleware
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
  console.log("   ==================================\n");
});