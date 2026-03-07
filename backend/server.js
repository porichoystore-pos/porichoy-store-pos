const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const os = require('os');

dotenv.config();

const app = express();

// Get local network IP address
const getNetworkIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const NETWORK_IP = getNetworkIp();

// CORS Configuration - Allow ALL local network IPs
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      // Allow localhost
      if (origin.includes('localhost')) return callback(null, true);
      
      // Allow any local network IP (192.168.x.x, 172.x.x.x, 10.x.x.x)
      if (origin.match(/^http:\/\/(192\.168\.|172\.|10\.)/)) {
        return callback(null, true);
      }
      
      // Allow the specific network IP
      if (origin.includes(NETWORK_IP)) return callback(null, true);
      
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
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

// Add a test route to verify CORS is working
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "CORS is working!",
    yourIP: req.ip,
    headers: req.headers
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// Start server - Listen on all network interfaces
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log("\n🚀 ==================================");
  console.log(`   🖥️  Server is running!`);
  console.log("   ==================================");
  console.log(`   📱 Local: http://localhost:${PORT}`);
  console.log(`   📱 Network: http://${NETWORK_IP}:${PORT}`);
  console.log("   ==================================\n");
});