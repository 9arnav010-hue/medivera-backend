
import mongoose from 'mongoose';

const visionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageType: {
    type: String,
    enum: ['general', 'xray', 'skin', 'retinal', 'mri', 'ct'],
    default: 'general'
  },
  analysis: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    default: 0
  },
  regions: [{
    id: Number,
    description: String,
    confidence: Number
  }]
}, {
  timestamps: true
});

export default mongoose.model('Vision', visionSchema);