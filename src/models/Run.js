import mongoose from 'mongoose';

const runSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  pace: {
    type: Number,
    required: true
  },
  calories: {
    type: Number,
    default: 0
  },
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]],
      required: true
    }
  },
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  avgHeartRate: Number,
  maxHeartRate: Number,
  elevationGain: {
    type: Number,
    default: 0
  },
  weather: {
    temperature: Number,
    condition: String,
    humidity: Number
  },
  notes: String,
  feeling: String,
  tags: [String]
}, {
  timestamps: true
});

runSchema.index({ startLocation: '2dsphere' });
runSchema.index({ 'route.coordinates': '2dsphere' });

export default mongoose.model('Run', runSchema);