// backend/src/routes/boost.js
import express from 'express';
import * as boostController from '../controllers/boostController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get active boosts in area
router.get('/active', protect, boostController.getActiveBoosts);

// Get user's active boosts
router.get('/user', protect, boostController.getUserBoosts);

// Create boost (admin only - add admin middleware if needed)
router.post('/', protect, boostController.createBoost);

// Activate boost for user
router.post('/:boostId/activate', protect, boostController.activateBoost);

// Generate random boosts (for cron jobs)
router.post('/generate', protect, boostController.generateRandomBoosts);

// Cleanup expired boosts
router.post('/cleanup', protect, boostController.cleanupExpiredBoosts);

// Get boost statistics
router.get('/stats', protect, boostController.getBoostStats);

export default router;