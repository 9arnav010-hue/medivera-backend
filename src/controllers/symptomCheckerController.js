import User from '../models/User.js';
import { checkAchievements } from './achievementController.js';
import axios from 'axios';

// Analyze symptoms using AI
export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, patientDetails } = req.body;
    const userId = req.user._id;

    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one symptom'
      });
    }

    // 1. Construct the prompt with clear instructions
    const prompt = `
      You are an experienced medical professional providing preliminary health insights.
      Patient: Age ${patientDetails.age}, ${patientDetails.gender}, Duration: ${patientDetails.duration}, Severity: ${patientDetails.severity}.
      Symptoms: ${symptoms.join(', ')}.
      Additional Info: ${patientDetails.additionalInfo || 'None'}.

      Provide a JSON analysis with: summary, possibleConditions (name, description, likelihood), 
      recommendations (list), warningSignsToWatch (string), and whenToSeeDoctor (string).
      Guidelines: Empathetic tone, emphasize results are preliminary, suggest professional consultation.
    `.trim();

    // 2. Call Google Gemini API (Stable version + JSON config)
    const aiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json" // Native JSON mode (prevents markdown wrapper ```json)
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // 3. Extract and Parse Response
    let analysis;
    try {
      const rawText = aiResponse.data.candidates[0].content.parts[0].text;
      analysis = JSON.parse(rawText);
    } catch (parseError) {
      console.error('AI Parsing failed, using fallback:', parseError);
      analysis = getFallbackAnalysis(symptoms);
    }

    // 4. Update Database & Achievements
    const user = await User.findById(userId);
    user.stats.totalSymptomChecks = (user.stats.totalSymptomChecks || 0) + 1;
    await user.save();

    const newAchievements = await checkAchievements(userId, 'symptom', user.stats.totalSymptomChecks);

    res.json({
      success: true,
      analysis,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
      totalChecks: user.stats.totalSymptomChecks
    });

  } catch (error) {
    console.error('❌ Symptom Analysis Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again.',
      error: error.message
    });
  }
};

// Helper for symptom history
export const getSymptomHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats.totalSymptomChecks');
    res.json({ success: true, totalChecks: user?.stats?.totalSymptomChecks || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
};

// Extracted Fallback Logic for Cleanliness
function getFallbackAnalysis(symptoms) {
  return {
    summary: `Analysis for ${symptoms.join(', ')} is currently unavailable.`,
    possibleConditions: [{ name: 'Undetermined', description: 'Please see a doctor.', likelihood: 'low' }],
    recommendations: ['Consult a healthcare professional', 'Stay hydrated'],
    warningSignsToWatch: 'Severe pain, difficulty breathing, or high fever.',
    whenToSeeDoctor: 'Immediately if symptoms worsen.'
  };
}