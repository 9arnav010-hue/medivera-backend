import geminiService from '../services/geminiService.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { checkAchievements } from './achievementController.js';

export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const currentSessionId = sessionId || crypto.randomUUID();

    // Get conversation history
    let chat = await Chat.findOne({
      user: req.user._id,
      sessionId: currentSessionId
    });

    const conversationHistory = chat ? chat.messages : [];

    // Get AI response
    const response = await geminiService.chat(
      message,
      conversationHistory
    );

    // Save or update chat
    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        sessionId: currentSessionId,
        messages: [
          { role: 'user', content: message, emotion: response.emotion },
          { role: 'assistant', content: response.message }
        ]
      });

      // Update user stats and check achievements
      const user = await User.findById(req.user._id);
      user.stats.totalChats += 1;
      await user.save();

      const unlockedAchievements = await checkAchievements(req.user._id, 'chat', user.stats.totalChats);
      
      return res.json({
        success: true,
        response: response.message,
        emotion: response.emotion,
        sessionId: currentSessionId,
        timestamp: response.timestamp,
        unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined
      });
    } else {
      chat.messages.push(
        { role: 'user', content: message, emotion: response.emotion },
        { role: 'assistant', content: response.message }
      );
      await chat.save();

      return res.json({
        success: true,
        response: response.message,
        emotion: response.emotion,
        sessionId: currentSessionId,
        timestamp: response.timestamp
      });
    }
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: error.message 
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const chat = await Chat.findOne({
      user: req.user._id,
      sessionId
    });

    if (!chat) {
      return res.json({
        success: true,
        messages: []
      });
    }

    res.json({
      success: true,
      messages: chat.messages,
      createdAt: chat.createdAt
    });
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      chats: chats.map(chat => ({
        sessionId: chat.sessionId,
        messageCount: chat.messages.length,
        firstMessage: chat.messages[0]?.content.substring(0, 100),
        lastMessage: chat.messages[chat.messages.length - 1]?.content.substring(0, 100),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      })),
      total: chats.length
    });
  } catch (error) {
    console.error('Error in getAllChats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Chat.deleteOne({
      user: req.user._id,
      sessionId
    });

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteChat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};