const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require('fs');
const os = require('os');

dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Get all local network IPs
const getNetworkIps = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
};

const NETWORK_IPS = getNetworkIps();
console.log('🌐 Network IPs detected:', NETWORK_IPS);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://porichoy-store-pos.vercel.app',
  'https://porichoy-store.vercel.app',
  ...NETWORK_IPS.map(ip => `http://${ip}:5173`)
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    if (origin.includes('vercel.app')) return callback(null, true);
    if (origin.match(/^http:\/\/(192\.168\.|172\.|10\.)/)) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    
    console.log('🚫 Blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    // Only initialize categories, NOT admin user
    initializeCategories();
  })
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Initialize only default categories (NO admin user)
const initializeCategories = async () => {
  try {
    const Category = require("./models/Category");
    
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
    } else {
      console.log("ℹ️ Categories already exist:", categoryCount);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log("\n🚀 ==================================");
  console.log(`   🖥️  Server is running!`);
  console.log("   ==================================");
  console.log(`   📱 Port: ${PORT}`);
  console.log(`   📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   📱 Uploads directory: ${uploadsDir}`);
  console.log("   ==================================\n");
});