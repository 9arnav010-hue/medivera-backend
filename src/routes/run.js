// backend/src/routes/run.js
import express from 'express';
import * as runController from '../controllers/runController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create a new run
router.post('/', protect, runController.createRun);

// Get user's runs
router.get('/user/:userId?', protect, runController.getUserRuns);

// Get run statistics
router.get('/stats/user', protect, runController.getRunStats);

// Get nearby runs
router.get('/nearby', protect, runController.getNearbyRuns);

// Get run details
router.get('/:runId', protect, runController.getRunDetails);

// Update run
router.put('/:runId', protect, runController.updateRun);

// Delete run
router.delete('/:runId', protect, runController.deleteRun);

export default router;
