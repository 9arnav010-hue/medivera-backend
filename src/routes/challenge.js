// backend/src/routes/challenge.js
import express from 'express';
import * as challengeController from '../controllers/challengeController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get active challenges
router.get('/active', protect, challengeController.getActiveChallenges);

// Get user's challenges
router.get('/user', protect, challengeController.getUserChallenges);

// Create challenge
router.post('/', protect, challengeController.createChallenge);

// Generate AI-powered personal challenges
router.post('/generate-personal', protect, challengeController.generatePersonalChallenges);

// Join challenge
router.post('/:challengeId/join', protect, challengeController.joinChallenge);

// Leave challenge
router.delete('/:challengeId/leave', protect, challengeController.leaveChallenge);

// Update challenge progress
router.put('/:challengeId/progress', protect, challengeController.updateChallengeProgress);

// Get challenge leaderboard
router.get('/:challengeId/leaderboard', protect, challengeController.getChallengeLeaderboard);

export default router;