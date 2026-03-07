const express = require('express');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
// Add this temporary test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is reachable!', 
    time: new Date().toISOString(),
    headers: req.headers
  });
});

module.exports = router;