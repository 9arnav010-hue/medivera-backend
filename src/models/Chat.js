import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    emotion: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  summary: String
}, {
  timestamps: true
});

export default mongoose.model('Chat', chatSchema);