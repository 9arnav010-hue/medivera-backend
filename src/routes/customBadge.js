// backend/src/routes/customBadge.js
import express from 'express';
import {
  awardCustomBadge,
  getAllCustomBadges,
  removeCustomBadge,
  getUserCustomBadges,
  awardBadgeToSelf
} from '../controllers/CustomBadgecontroller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/all', getAllCustomBadges);

// Protected routes
router.use(protect);

// Award badge to yourself (for testing)
router.post('/award-self', awardBadgeToSelf);

// Admin routes (you can add admin middleware later)
router.post('/award', awardCustomBadge);
router.post('/remove', removeCustomBadge);
router.get('/user/:userId', getUserCustomBadges);


export default router;


