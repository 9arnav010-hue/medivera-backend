// backend/src/routes/leaderboard.js
import express from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get global leaderboard
router.get('/global', protect, leaderboardController.getGlobalLeaderboard);

// Get team leaderboard
router.get('/teams', protect, leaderboardController.getTeamLeaderboard);

// Get local leaderboard (nearby users)
router.get('/local', protect, leaderboardController.getLocalLeaderboard);

// Get friends leaderboard
router.get('/friends', protect, leaderboardController.getFriendsLeaderboard);

// Get user rank
router.get('/rank', protect, leaderboardController.getUserRank);

// Get leaderboard statistics
router.get('/stats', protect, leaderboardController.getLeaderboardStats);

// Update leaderboard (internal use)
router.post('/update', protect, leaderboardController.updateLeaderboard);

export default router;