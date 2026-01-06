import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  keyFindings: [String],
  riskIndicators: [{
    level: String,
    description: String
  }],
  lifestyleSuggestions: [String],
  confidenceScore: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    default: 'English'
  },
  reportType: {
    type: String,
    enum: ['blood_test', 'xray', 'mri', 'general', 'other'],
    default: 'general'
  }
}, {
  timestamps: true
});

export default mongoose.model('Report', reportSchema);