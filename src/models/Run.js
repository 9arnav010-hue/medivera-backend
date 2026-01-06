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
  // 🚨 FIXED: Correct GeoJSON structure for LineString
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString',
      required: true  // Added required
    },
    coordinates: {
      type: [[Number]], // Array of [lng, lat] pairs
      required: true,
      validate: {
        validator: function(coords) {
          // Validate at least 2 points for a LineString
          return Array.isArray(coords) && coords.length >= 2;
        },
        message: 'LineString must have at least 2 coordinate points'
      }
    }
  },
  // 🚨 FIXED: Correct GeoJSON structure for Point
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true  // Added required
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: function(coords) {
          // Validate exactly 2 numbers [lng, lat]
          return Array.isArray(coords) && 
                 coords.length === 2 && 
                 typeof coords[0] === 'number' && 
                 typeof coords[1] === 'number';
        },
        message: 'Point coordinates must be an array of exactly 2 numbers [longitude, latitude]'
      }
    }
  },
  // 🚨 FIXED: Correct GeoJSON structure for Point
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true  // Added required
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: function(coords) {
          // Validate exactly 2 numbers [lng, lat]
          return Array.isArray(coords) && 
                 coords.length === 2 && 
                 typeof coords[0] === 'number' && 
                 typeof coords[1] === 'number';
        },
        message: 'Point coordinates must be an array of exactly 2 numbers [longitude, latitude]'
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
  // Important for GeoJSON queries
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🚨 CRITICAL FIX: Correct 2dsphere indexes for GeoJSON
// MongoDB expects the entire GeoJSON object, not just coordinates
runSchema.index({ startLocation: '2dsphere' });
runSchema.index({ endLocation: '2dsphere' });
runSchema.index({ route: '2dsphere' }); // Index the entire route object, not just coordinates

// 🚨 Add validation for coordinate ranges
runSchema.path('startLocation.coordinates').validate({
  validator: function(coords) {
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  },
  message: 'Coordinates must be valid: longitude [-180, 180], latitude [-90, 90]'
});

runSchema.path('endLocation.coordinates').validate({
  validator: function(coords) {
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  },
  message: 'Coordinates must be valid: longitude [-180, 180], latitude [-90, 90]'
});

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

// Pre-save middleware to ensure data consistency
runSchema.pre('save', function(next) {
  // Ensure coordinates are numbers
  if (this.startLocation && this.startLocation.coordinates) {
    this.startLocation.coordinates = [
      parseFloat(this.startLocation.coordinates[0]),
      parseFloat(this.startLocation.coordinates[1])
    ];
  }
  
  if (this.endLocation && this.endLocation.coordinates) {
    this.endLocation.coordinates = [
      parseFloat(this.endLocation.coordinates[0]),
      parseFloat(this.endLocation.coordinates[1])
    ];
  }
  
  // Ensure route coordinates are numbers
  if (this.route && this.route.coordinates) {
    this.route.coordinates = this.route.coordinates.map(coord => [
      parseFloat(coord[0]),
      parseFloat(coord[1])
    ]);
  }
  
  next();
});

// Method to get bounding box of route
runSchema.methods.getBoundingBox = function() {
  if (!this.route.coordinates || this.route.coordinates.length === 0) {
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
    northeast: [maxLng, maxLat]
  };
};

export default mongoose.model('Run', runSchema);
