import geminiService from '../services/geminiService.js';
import User from '../models/User.js';
import Vision from '../models/Vision.js';
import { checkAchievements } from './achievementController.js';

export const analyzeImage = async (req, res) => {
  try {
    const { imageData, imageType = 'general' } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    console.log(`📸 Vision analysis request - Type: ${imageType}`);
    console.log(`👤 User: ${req.user._id}`);

    // Validate image data
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Please upload a valid image.' });
    }

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Validate base64 data
    if (!base64Data || base64Data.length < 100) {
      return res.status(400).json({ error: 'Image data is too small or corrupted.' });
    }

    console.log(`📊 Image size: ${Math.round(base64Data.length / 1024)} KB`);

    // Call Gemini Vision API
    console.log('🤖 Calling Gemini Vision API...');
    const analysis = await geminiService.analyzeImage(base64Data, imageType);

    // Save analysis to database
    const visionRecord = await Vision.create({
      user: req.user._id,
      imageType,
      analysis: analysis.analysis,
      confidence: analysis.confidence,
      regions: analysis.regions
    });

    console.log(`✅ Analysis saved with ID: ${visionRecord._id}`);

    // Update user stats and check achievements
    const user = await User.findById(req.user._id);
    user.stats.totalVisionAnalysis += 1;
    await user.save();

    console.log(`📈 User stats updated - Total vision: ${user.stats.totalVisionAnalysis}`);

    const unlockedAchievements = await checkAchievements(req.user._id, 'vision', user.stats.totalVisionAnalysis);

    if (unlockedAchievements.length > 0) {
      console.log(`🎉 Unlocked ${unlockedAchievements.length} achievements!`);
    }

    res.json({
      success: true,
      analysis: analysis.analysis,
      regions: analysis.regions,
      confidence: analysis.confidence,
      timestamp: analysis.timestamp,
      analysisId: visionRecord._id,
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined
    });
  } catch (error) {
    console.error('❌ Error in analyzeImage:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze image',
      message: error.message 
    });
  }
};

// Get all vision analyses for user
export const getVisionHistory = async (req, res) => {
  try {
    const analyses = await Vision.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('imageType confidence createdAt');

    res.json({
      success: true,
      analyses,
      total: analyses.length
    });
  } catch (error) {
    console.error('Error in getVisionHistory:', error);
    res.status(500).json({ error: 'Failed to fetch vision history' });
  }
};

// Get single vision analysis
export const getVisionAnalysis = async (req, res) => {
  try {
    const analysis = await Vision.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error in getVisionAnalysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};

// Delete vision analysis
export const deleteVisionAnalysis = async (req, res) => {
  try {
    const result = await Vision.deleteOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteVisionAnalysis:', error);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
};