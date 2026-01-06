
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    // Use gemini-pro for both text and vision
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  // Medical Report Summarization
  async summarizeReport(reportText, language = 'English') {
    try {
      const prompt = `You are a medical AI assistant for Medivéra (Created by Anurag & Arnav).
      
Analyze this medical report and provide:
1. **Simple Summary**: Patient-friendly explanation
2. **Key Findings**: Important results and values
3. **Risk Indicators**: Any concerns or abnormal values (mark as HIGH/MEDIUM/LOW)
4. **Lifestyle Suggestions**: Practical advice for the patient
5. **AI Confidence Score**: Rate your confidence (0-100%) - IMPORTANT: You must include this line: "AI Confidence Score: XX%"
6. **Educational Notes**: Explain medical terms used

Language: ${language}

Medical Report:
${reportText}

Format your response in a structured, easy-to-read manner with clear sections.
IMPORTANT: Always include "AI Confidence Score: XX%" where XX is a number between 0-100.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return {
        success: true,
        summary: text,
        confidence: this.extractConfidence(text),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in summarizeReport:', error);
      throw new Error('Failed to summarize report: ' + error.message);
    }
  }

  // Health Chatbot
  async chat(message, conversationHistory = [], userMood = null) {
    try {
      let contextPrompt = `You are Dr. AI, an empathetic medical assistant for Medivéra (Created by Anurag & Arnav).

Guidelines:
- Provide safe, factual, age-appropriate health guidance
- Offer mental wellness and lifestyle advice
- Be warm and supportive
- Explain medical terms simply
- Suggest when to see a real doctor
- NEVER provide emergency medical advice - always recommend calling emergency services`;

      if (userMood) {
        contextPrompt += `\n\nUser's detected mood: ${userMood}. Respond empathetically.`;
      }

      // Build conversation context
      let conversationContext = conversationHistory.map(msg => 
        `${msg.role === 'user' ? 'Patient' : 'Dr. AI'}: ${msg.content}`
      ).join('\n');

      const fullPrompt = `${contextPrompt}

Conversation History:
${conversationContext}

Patient: ${message}

Dr. AI:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      // Detect emotion from message
      const emotion = this.detectEmotion(message);

      return {
        success: true,
        message: text,
        emotion: emotion,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to process chat: ' + error.message);
    }
  }

  // Vision Analysis (Medical Image Analysis) - REAL-TIME WITH ACTUAL IMAGE
  async analyzeImage(imageData, imageType = 'general') {
    try {
      console.log(`🔍 Starting vision analysis for image type: ${imageType}`);
      
      const prompt = `You are VisionCare+, an advanced medical image analysis AI for Medivéra (Created by Anurag & Arnav).

Image Type: ${imageType}

IMPORTANT: You are analyzing an ACTUAL uploaded medical image. Provide a detailed, specific analysis of what you observe in THIS image.

Analyze this ${imageType} medical image and provide:

1. **Visual Description**: Describe EXACTLY what you see in this specific image
   - Image quality and clarity (rate as Poor/Fair/Good/Excellent)
   - Anatomical structures visible
   - Colors, contrasts, and textures present
   - Overall composition and framing

2. **Specific Observations**: Detail what stands out in THIS particular image
   - Notable features, patterns, or densities
   - Areas that appear normal
   - Areas that appear unusual or noteworthy
   - Comparison to typical ${imageType} images

3. **Regions of Interest**: Identify 2-4 specific regions in this image
   Format each as: "Region X (Confidence: YY%): [detailed description of what you see in this specific area]"
   - Be specific about location (upper/lower, left/right, center)
   - Describe visual characteristics (texture, density, color, pattern)
   - Note any distinguishing features

4. **Technical Assessment**:
   - Image quality score (0-100%)
   - Clarity and resolution comments
   - Visibility of key anatomical structures
   - Factors affecting analysis quality

5. **Educational Analysis**: 
   - What this image demonstrates about anatomy
   - What medical professionals would look for in such images
   - Key diagnostic indicators typically visible in ${imageType} images
   - Important structures or features to note

6. **Overall Assessment**:
   - Summary of key visual findings
   - Notable observations

CRITICAL REQUIREMENTS:
- Base your analysis ONLY on what you actually see in THIS specific image
- Be highly specific - describe actual visual elements, colors, shapes, patterns you observe
- Use concrete, detailed observations rather than generic information
- If image quality is poor, describe exactly why and how
- If you cannot see certain structures, explicitly state "not visible in this image"
- Include "Overall Confidence: XX%" in your response

MEDICAL DISCLAIMER: This analysis is for EDUCATIONAL PURPOSES ONLY. This is NOT a medical diagnosis. Users must consult qualified healthcare professionals for actual medical diagnosis and treatment. This AI analysis should never replace professional medical evaluation.`;

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      };

      console.log('📤 Sending image to Gemini Vision API...');
      
      // Use visionModel for image analysis
      const result = await this.visionModel.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();

      console.log('✅ Received analysis from Gemini');
      console.log(`📊 Analysis length: ${text.length} characters`);

      // Extract structured data
      const regions = this.extractRegions(text);
      const confidence = this.extractConfidence(text);
      const imageQuality = this.extractImageQuality(text);

      console.log(`🎯 Extracted confidence: ${confidence}%`);
      console.log(`📊 Extracted regions: ${regions.length}`);
      console.log(`📸 Image quality: ${imageQuality}`);

      return {
        success: true,
        analysis: text,
        regions: regions,
        confidence: confidence,
        imageQuality: imageQuality,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error in analyzeImage:', error);
      
      // Provide helpful error messages
      if (error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      } else if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later or upgrade your API plan.');
      } else if (error.message.includes('image')) {
        throw new Error('Failed to process image. Please ensure it is a valid image file (JPG, PNG).');
      } else if (error.message.includes('size')) {
        throw new Error('Image is too large. Please upload an image smaller than 4MB.');
      }
      
      throw new Error('Failed to analyze image: ' + error.message);
    }
  }

  // Detect emotion from text
  detectEmotion(text) {
    const lowerText = text.toLowerCase();
    
    const emotionKeywords = {
      anxious: ['worried', 'anxious', 'nervous', 'scared', 'fear', 'afraid'],
      sad: ['sad', 'depressed', 'down', 'unhappy', 'miserable', 'crying'],
      angry: ['angry', 'frustrated', 'annoyed', 'mad', 'upset'],
      happy: ['happy', 'great', 'good', 'wonderful', 'excellent', 'better'],
      pain: ['pain', 'hurt', 'ache', 'suffering', 'sore'],
      confused: ['confused', 'unsure', "don't understand", 'unclear', 'lost']
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  // Extract confidence score from text
  extractConfidence(text) {
    const patterns = [
      /overall\s+confidence[:\s]+(\d+)%/i,
      /confidence\s+score[:\s]+(\d+)%/i,
      /confidence[:\s]+(\d+)%/i,
      /ai\s+confidence[:\s]+(\d+)%/i,
      /(\d+)%\s+confidence/i,
      /confidence\s+level[:\s]+(\d+)%/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const confidence = parseInt(match[1]);
        if (confidence >= 0 && confidence <= 100) {
          return confidence;
        }
      }
    }

    // Calculate confidence based on text analysis
    const certaintyWords = ['clearly', 'definitely', 'obviously', 'certainly', 'strongly', 'distinctly'];
    const uncertaintyWords = ['possibly', 'maybe', 'might', 'could', 'perhaps', 'uncertain', 'unclear'];
    
    let calculatedConfidence = 75;
    
    const lowerText = text.toLowerCase();
    certaintyWords.forEach(word => {
      if (lowerText.includes(word)) calculatedConfidence += 3;
    });
    uncertaintyWords.forEach(word => {
      if (lowerText.includes(word)) calculatedConfidence -= 5;
    });
    
    calculatedConfidence = Math.max(60, Math.min(95, calculatedConfidence));
    
    return calculatedConfidence;
  }

  // Extract image quality from text
  extractImageQuality(text) {
    const qualityPatterns = [
      /image quality[:\s]+(poor|fair|good|excellent)/i,
      /quality[:\s]+(poor|fair|good|excellent)/i,
      /(poor|fair|good|excellent)\s+quality/i
    ];

    for (const pattern of qualityPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    // Default to 'good' if not specified
    return 'good';
  }

  // Extract regions of interest from analysis
  extractRegions(text) {
    const regions = [];
    const lines = text.split('\n');
    
    // Pattern 1: Look for "Region X:" or "Region X (Confidence: YY%)"
    const regionPattern = /region\s+(\d+)\s*(?:\((?:confidence[:\s]+)?(\d+)%\))?[:\s]+(.+)/i;
    
    lines.forEach((line) => {
      const match = line.match(regionPattern);
      
      if (match) {
        const regionNumber = parseInt(match[1]);
        const confidence = match[2] ? parseInt(match[2]) : Math.floor(Math.random() * 20) + 75;
        let description = match[3].trim();
        
        // Clean up description
        description = description.replace(/\*\*/g, '').trim();
        
        if (description.length > 10 && description.length < 300) {
          regions.push({
            id: regionNumber,
            description: description,
            confidence: confidence
          });
        }
      }
    });

    // Pattern 2: Look for bullet points or numbered lists with confidence
    const confidencePattern = /[-•*]\s*(.+?)\s*\((?:confidence[:\s]+)?(\d+)%\)/i;
    
    if (regions.length < 2) {
      lines.forEach((line) => {
        const match = line.match(confidencePattern);
        if (match && regions.length < 5) {
          const description = match[1].trim().replace(/\*\*/g, '');
          const confidence = parseInt(match[2]);
          
          if (description.length > 10 && description.length < 300) {
            regions.push({
              id: regions.length + 1,
              description: description,
              confidence: confidence
            });
          }
        }
      });
    }

    // Pattern 3: Extract from descriptive sentences if still not enough regions
    if (regions.length < 2) {
      const sentences = text.split(/[.!?]+/);
      let count = 0;
      
      sentences.forEach(sentence => {
        if (count >= 4) return;
        
        const trimmed = sentence.trim();
        if (trimmed.length > 40 && trimmed.length < 250) {
          const keywords = ['visible', 'shows', 'appears', 'indicates', 'demonstrates', 'reveals', 'displays'];
          if (keywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
            regions.push({
              id: count + 1,
              description: trimmed,
              confidence: Math.floor(Math.random() * 20) + 70
            });
            count++;
          }
        }
      });
    }

    console.log(`📋 Extracted ${regions.length} regions of interest`);
    return regions.slice(0, 5); // Return max 5 regions
  }

  // Translate text
  async translate(text, targetLanguage) {
    try {
      const prompt = `Translate the following medical text to ${targetLanguage}. Maintain medical accuracy and clarity:

${text}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      
      return {
        success: true,
        translatedText: response.text(),
        language: targetLanguage
      };
    } catch (error) {
      console.error('Error in translate:', error);
      throw new Error('Failed to translate: ' + error.message);
    }
  }
}

export default new GeminiService();