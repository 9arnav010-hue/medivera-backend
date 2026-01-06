import express from 'express';
import multer from 'multer';
import { analyzeReport, analyzePDF, getReports, getReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', protect, analyzeReport);
router.post('/analyze-pdf', protect, upload.single('pdf'), analyzePDF);
router.get('/', protect, getReports);
router.get('/:id', protect, getReport);

export default router;