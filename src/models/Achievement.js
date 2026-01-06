// backend/src/models/Achievement.js
import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    achievementId: {
      type: String,
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
    icon: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'chat',
        'report',
        'vision',
        'symptom',  // Added missing category
        'streak',
        'special',
        // LazySense categories
        'running',
        'distance',
        'territory',
        'team',
        'challenge',
        'speed',
        'leaderboard'
      ]
    },
    target: {
      type: Number,
      required: true
    },
    progress: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    reward: {
      xp: {
        type: Number,
        required: true
      },
      badge: {
        type: String
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique achievements per user
achievementSchema.index({ user: 1, achievementId: 1 }, { unique: true });

export default mongoose.model('Achievement', achievementSchema);
