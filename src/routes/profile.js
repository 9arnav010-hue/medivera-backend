// backend/src/routes/profile.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAccount,
  getUserStats
} from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/', getProfile);                    // Get user profile
router.put('/', updateProfile);                 // Update profile info
router.put('/change-password', changePassword); // Change password
router.post('/avatar', uploadAvatar);           // Upload avatar (accepts base64 in JSON body)
router.delete('/', deleteAccount);              // Delete account
router.get('/stats', getUserStats);             // Get user statistics

export default router;