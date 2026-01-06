import mongoose from 'mongoose';

const boostSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['speed', 'expansion', 'points', 'visual', 'defense'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: {
    type: Number, // in meters
    default: 50
  },
  multiplier: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  spawnedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  collectedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectedAt: Date
  }]
}, {
  timestamps: true
});

boostSchema.index({ location: '2dsphere' });
boostSchema.index({ expiresAt: 1, isActive: 1 });

export default mongoose.model('Boost', boostSchema);