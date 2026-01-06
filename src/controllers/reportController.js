import geminiService from '../services/geminiService.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import pdfParse from 'pdf-parse';
import { checkAchievements } from './achievementController.js';

export const analyzeReport = async (req, res) => {
  try {
    const { reportText, language = 'English', reportType = 'general' } = req.body;

    if (!reportText) {
      return res.status(400).json({ error: 'Report text is required' });
    }

    // Call Gemini for analysis
    const analysis = await geminiService.summarizeReport(reportText, language);

    // Save to database
    const report = await Report.create({
      user: req.user._id,
      title: `Medical Report - ${new Date().toLocaleDateString()}`,
      originalText: reportText,
      summary: analysis.summary,
      confidenceScore: analysis.confidence,
      language,
      reportType
    });

    // Update user stats and check achievements
    const user = await User.findById(req.user._id);
    user.stats.totalReports += 1;
    await user.save();

    const unlockedAchievements = await checkAchievements(req.user._id, 'report', user.stats.totalReports);

    res.json({
      success: true,
      report: {
        id: report._id,
        title: report.title,
        summary: analysis.summary,
        confidence: analysis.confidence,
        timestamp: analysis.timestamp,
        createdAt: report.createdAt
      },
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined
    });
  } catch (error) {
    console.error('Error in analyzeReport:', error);
    res.status(500).json({ 
      error: 'Failed to analyze report',
      message: error.message 
    });
  }
};

export const analyzePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const reportText = pdfData.text;

    const { language = 'English' } = req.body;

    // Call Gemini for analysis
    const analysis = await geminiService.summarizeReport(reportText, language);

    // Save to database
    const report = await Report.create({
      user: req.user._id,
      title: `PDF Report - ${req.file.originalname}`,
      originalText: reportText,
      summary: analysis.summary,
      confidenceScore: analysis.confidence,
      language,
      reportType: 'general'
    });

    // Update user stats and check achievements
    const user = await User.findById(req.user._id);
    user.stats.totalReports += 1;
    await user.save();

    const unlockedAchievements = await checkAchievements(req.user._id, 'report', user.stats.totalReports);

    res.json({
      success: true,
      report: {
        id: report._id,
        title: report.title,
        summary: analysis.summary,
        confidence: analysis.confidence,
        extractedText: reportText.substring(0, 500) + '...',
        timestamp: analysis.timestamp,
        createdAt: report.createdAt
      },
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined
    });
  } catch (error) {
    console.error('Error in analyzePDF:', error);
    res.status(500).json({ 
      error: 'Failed to analyze PDF',
      message: error.message 
    });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('title summary confidenceScore reportType language createdAt');

    res.json({
      success: true,
      reports,
      total: reports.length
    });
  } catch (error) {
    console.error('Error in getReports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const getReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error in getReport:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const result = await Report.deleteOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteReport:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};