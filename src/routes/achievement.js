import express from 'express';
import { getAchievements, getUserStats } from '../controllers/achievementController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getAchievements);
router.get('/stats', protect, getUserStats);

export default router;