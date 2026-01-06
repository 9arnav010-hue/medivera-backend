import express from 'express';
import { sendMessage, getChatHistory, getAllChats, deleteChat } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/message', protect, sendMessage);
router.get('/history/:sessionId', protect, getChatHistory);
router.get('/all', protect, getAllChats);
router.delete('/:sessionId', protect, deleteChat);

export default router;