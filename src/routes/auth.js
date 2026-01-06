import express from 'express';
import User from '../models/User.js'; // ✅ ADD THIS
import { register, login, getProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

import {  
  verifyEmailCode,
  resendVerificationCode,
  checkVerificationStatus
} from '../controllers/authController.js';

const router = express.Router();

// ================= PUBLIC ROUTES =================
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email-code', verifyEmailCode);
router.post('/resend-verification-code', resendVerificationCode);
router.post('/check-verification-status', checkVerificationStatus);

// ================= PROTECTED ROUTES =================
router.get('/profile', protect, getProfile);

router.get('/me', protect, async (req, res) => {
  try {
    // ✅ SAFE ACCESS (works with standard protect middleware)
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('GET /me error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
