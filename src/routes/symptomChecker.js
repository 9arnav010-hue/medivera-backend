import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  analyzeSymptoms,
  getSymptomHistory
} from '../controllers/symptomCheckerController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/symptom-checker/analyze - Analyze symptoms
router.post('/analyze', analyzeSymptoms);

// GET /api/symptom-checker/history - Get symptom check history
router.get('/history', getSymptomHistory);

export default router;