import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['distance', 'duration', 'pace', 'territory', 'landmark', 'streak', 'special'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'extreme'],
    default: 'medium'
  },
  target: {
    value: Number,
    unit: String // 'km', 'minutes', 'sqm', 'count'
  },
  progress: {
    type: Number,
    default: 0
  },
  reward: {
    xp: {
      type: Number,
      default: 0
    },
    boost: String,
    badge: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'failed'],
    default: 'active'
  },
  expiresAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

challengeSchema.index({ user: 1, status: 1 });

export default mongoose.model('Challenge', challengeSchema);