const User = require('../models/User');

// @desc    List all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a user (admin creates staff/admin accounts)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      username,
      password,
      name: name || username,
      email: email || '',
      role: role === 'admin' ? 'admin' : 'staff'
    });

    const { password: _p, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a user (name, email, role, password reset)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, role, password } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) {
      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      // Prevent removing your own admin role
      if (String(user._id) === String(req.user._id) && req.user.role === 'admin' && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot remove your own admin role' });
      }
      user.role = role;
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = password; // hashed by pre-save hook
    }

    await user.save();
    const { password: _p, ...safe } = user.toObject();
    res.json(safe);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Activate / deactivate a user
// @route   PUT /api/users/:id/toggle
// @access  Private/Admin
exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();
    res.json({ _id: user._id, username: user.username, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Guard: always keep at least one admin
    if (user.role === 'admin') {
      const admins = await User.countDocuments({ role: 'admin', _id: { $ne: user._id } });
      if (admins === 0) {
        return res.status(400).json({ message: 'Cannot delete the last admin account' });
      }
    }

    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
