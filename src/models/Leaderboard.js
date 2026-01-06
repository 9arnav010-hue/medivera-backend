import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'alltime'],
    required: true
  },
  category: {
    type: String,
    enum: ['distance', 'territory', 'xp', 'runs'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  entries: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rank: Number,
    value: Number,
    change: Number // position change from last period
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

leaderboardSchema.index({ period: 1, category: 1, isActive: 1 });

export default mongoose.model('Leaderboard', leaderboardSchema);