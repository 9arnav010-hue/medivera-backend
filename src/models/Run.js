import mongoose from 'mongoose';

// CRITICAL FIX: Use typeKey option to avoid conflict with GeoJSON 'type' field
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
  // CRITICAL FIX: GeoJSON LineString - use proper nested schema
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      required: true,
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [lng, lat] pairs
      required: true
    }
  },
  // CRITICAL FIX: GeoJSON Point - use proper nested schema
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  },
  // CRITICAL FIX: GeoJSON Point - use proper nested schema
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
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
  timestamps: true,
  typeKey: '$type', // CRITICAL: Use $type instead of type to avoid GeoJSON conflicts
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// CRITICAL: Create 2dsphere indexes for geospatial queries
runSchema.index({ startLocation: '2dsphere' });
runSchema.index({ endLocation: '2dsphere' });
runSchema.index({ 'route': '2dsphere' });

// Additional useful indexes
runSchema.index({ userId: 1, createdAt: -1 });
runSchema.index({ distance: -1 });

// Virtual for formatted duration
runSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Virtual for formatted distance
runSchema.virtual('formattedDistance').get(function() {
  if (this.distance < 1) {
    return `${(this.distance * 1000).toFixed(0)}m`;
  }
  return `${this.distance.toFixed(2)}km`;
});

// Pre-save validation to ensure proper coordinate format
runSchema.pre('save', function(next) {
  // Validate startLocation
  if (this.startLocation && this.startLocation.coordinates) {
    if (!Array.isArray(this.startLocation.coordinates) || 
        this.startLocation.coordinates.length !== 2) {
      return next(new Error('startLocation.coordinates must be [longitude, latitude]'));
    }
    // Ensure numbers
    this.startLocation.coordinates = [
      Number(this.startLocation.coordinates[0]),
      Number(this.startLocation.coordinates[1])
    ];
  }
  
  // Validate endLocation
  if (this.endLocation && this.endLocation.coordinates) {
    if (!Array.isArray(this.endLocation.coordinates) || 
        this.endLocation.coordinates.length !== 2) {
      return next(new Error('endLocation.coordinates must be [longitude, latitude]'));
    }
    // Ensure numbers
    this.endLocation.coordinates = [
      Number(this.endLocation.coordinates[0]),
      Number(this.endLocation.coordinates[1])
    ];
  }
  
  // Validate route
  if (this.route && this.route.coordinates) {
    if (!Array.isArray(this.route.coordinates) || this.route.coordinates.length < 2) {
      return next(new Error('route.coordinates must have at least 2 points'));
    }
    // Ensure all coordinates are numbers
    this.route.coordinates = this.route.coordinates.map(coord => {
      if (!Array.isArray(coord) || coord.length !== 2) {
        throw new Error('Each route coordinate must be [longitude, latitude]');
      }
      return [Number(coord[0]), Number(coord[1])];
    });
  }
  
  next();
});

// Method to get bounding box
runSchema.methods.getBoundingBox = function() {
  if (!this.route || !this.route.coordinates || this.route.coordinates.length === 0) {
    return null;
  }
  
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  this.route.coordinates.forEach(coord => {
    const [lng, lat] = coord;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  return {
    southwest: [minLng, minLat],
    northeast: [maxLng, maxLat],
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  };
};

export default mongoose.model('Run', runSchema);
