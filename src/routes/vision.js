import express from 'express';
import { 
  analyzeImage, 
  getVisionHistory, 
  getVisionAnalysis, 
  deleteVisionAnalysis 
} from '../controllers/visionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/analyze', protect, analyzeImage);
router.get('/history', protect, getVisionHistory);
router.get('/:id', protect, getVisionAnalysis);
router.delete('/:id', protect, deleteVisionAnalysis);

export default router;