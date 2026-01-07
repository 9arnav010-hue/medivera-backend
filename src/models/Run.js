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
  // GeoJSON LineString for route path
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      required: true
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude] pairs
      required: true,
      validate: {
        validator: function(coords) {
          return Array.isArray(coords) && 
                 coords.length >= 2 &&
                 coords.every(coord => 
                   Array.isArray(coord) && 
                   coord.length === 2 &&
                   typeof coord[0] === 'number' && 
                   typeof coord[1] === 'number'
                 );
        },
        message: 'LineString must have at least 2 coordinate pairs [longitude, latitude]'
      }
    }
  },
  // GeoJSON Point for start location
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return Array.isArray(coords) && 
                 coords.length === 2 && 
                 typeof coords[0] === 'number' && 
                 typeof coords[1] === 'number' &&
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Point coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },
  // GeoJSON Point for end location
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return Array.isArray(coords) && 
                 coords.length === 2 && 
                 typeof coords[0] === 'number' && 
                 typeof coords[1] === 'number' &&
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Point coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },
  avgHeartRate: {
    type: Number,
    min: 0
  },
  maxHeartRate: {
    type: Number,
    min: 0
  },
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// CRITICAL: 2dsphere indexes for geospatial queries
runSchema.index({ startLocation: '2dsphere' });
runSchema.index({ endLocation: '2dsphere' });
runSchema.index({ route: '2dsphere' });

// Additional indexes for queries
runSchema.index({ userId: 1, createdAt: -1 });
runSchema.index({ distance: -1 });
runSchema.index({ duration: -1 });

// Virtual for formatted duration (HH:MM:SS)
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

// Virtual for average speed (km/h)
runSchema.virtual('averageSpeed').get(function() {
  if (this.duration === 0) return 0;
  return (this.distance / (this.duration / 3600)).toFixed(2);
});

// Pre-save middleware to ensure coordinate data types
runSchema.pre('save', function(next) {
  // Ensure startLocation coordinates are Numbers
  if (this.startLocation && this.startLocation.coordinates) {
    this.startLocation.coordinates = [
      Number(this.startLocation.coordinates[0]),
      Number(this.startLocation.coordinates[1])
    ];
  }
  
  // Ensure endLocation coordinates are Numbers
  if (this.endLocation && this.endLocation.coordinates) {
    this.endLocation.coordinates = [
      Number(this.endLocation.coordinates[0]),
      Number(this.endLocation.coordinates[1])
    ];
  }
  
  // Ensure route coordinates are Numbers
  if (this.route && this.route.coordinates) {
    this.route.coordinates = this.route.coordinates.map(coord => [
      Number(coord[0]),
      Number(coord[1])
    ]);
  }
  
  next();
});

// Method to get bounding box of route
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

// Static method to find runs near a location
runSchema.statics.findNearby = function(lng, lat, maxDistance = 5000) {
  return this.find({
    startLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Static method to get user stats
runSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: 1 },
        totalDistance: { $sum: '$distance' },
        totalDuration: { $sum: '$duration' },
        totalCalories: { $sum: '$calories' },
        avgDistance: { $avg: '$distance' },
        avgPace: { $avg: '$pace' },
        maxDistance: { $max: '$distance' },
        maxDuration: { $max: '$duration' }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : null;
};

export default mongoose.model('Run', runSchema);
