import mongoose from 'mongoose';

const territorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    default: 'Unnamed Territory'
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of coordinate arrays [longitude, latitude]
      required: true
    }
  },
  area: {
    type: Number, // in square meters
    required: true
  },
  center: {
    latitude: Number,
    longitude: Number
  },
  level: {
    type: Number,
    default: 1
  },
  type: {
    type: String,
    enum: ['basic', 'castle', 'city', 'fortress'],
    default: 'basic'
  },
  color: {
    type: String,
    default: '#8B5CF6' // purple
  },
  stats: {
    totalRuns: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number,
      default: 0
    },
    totalCalories: {
      type: Number,
      default: 0
    },
    expansions: {
      type: Number,
      default: 0
    }
  },
  boosts: [{
    type: {
      type: String,
      enum: ['speed', 'expansion', 'points', 'visual']
    },
    multiplier: Number,
    expiresAt: Date
  }],
  captured: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for geospatial queries
territorySchema.index({ coordinates: '2dsphere' });
territorySchema.index({ user: 1, lastActivity: -1 });

export default mongoose.model('Territory', territorySchema);