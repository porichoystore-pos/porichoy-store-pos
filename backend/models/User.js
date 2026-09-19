const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff"
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

// Hash password before save - FIXED VERSION (no next() in async function)
userSchema.pre("save", async function () {
  // Only hash the password if it's modified (or new)
  if (!this.isModified("password")) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login - Using updateOne to avoid triggering pre-save hooks
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastLogin: new Date() } }
  );
  return this;
};

module.exports = mongoose.model("User", userSchema);