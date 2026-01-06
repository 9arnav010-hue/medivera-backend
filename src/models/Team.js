import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Team name must be at least 3 characters'],
      maxlength: [50, 'Team name cannot exceed 50 characters']
    },
    description: {
      type: String,
      required: [true, 'Team description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        joinedAt: {
          type: Date,
          default: Date.now
        },
        contribution: {
          distance: { 
            type: Number, 
            default: 0,
            min: 0
          },
          points: { 
            type: Number, 
            default: 0,
            min: 0
          },
          runs: { 
            type: Number, 
            default: 0,
            min: 0
          }
        },
        role: {
          type: String,
          default: 'member',
          enum: ['member', 'co-captain']
        }
      }
    ],
    maxMembers: {
      type: Number,
      default: 10,
      min: [2, 'Minimum team size is 2'],
      max: [50, 'Maximum team size is 50']
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true
    },
    totalDistance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRuns: {
      type: Number,
      default: 0,
      min: 0
    },
    averagePace: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: 0,
      min: 0
    },
    achievements: [
      {
        name: String,
        description: String,
        earnedAt: Date,
        icon: String
      }
    ],
    logo: {
      type: String,
      default: ''
    },
    banner: {
      type: String,
      default: ''
    },
    tags: [{
      type: String,
      trim: true
    }],
    lastActivity: {
      type: Date,
      default: Date.now
    },
    location: {
      city: String,
      country: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for average distance per member
teamSchema.virtual('averageDistancePerMember').get(function() {
  if (this.members.length === 0) return 0;
  return this.totalDistance / this.members.length;
});

// Virtual for average points per member
teamSchema.virtual('averagePointsPerMember').get(function() {
  if (this.members.length === 0) return 0;
  return this.totalPoints / this.members.length;
});

// Indexes for better query performance
teamSchema.index({ name: 1 });
teamSchema.index({ captain: 1 });
teamSchema.index({ totalPoints: -1 });
teamSchema.index({ totalDistance: -1 });
teamSchema.index({ isPublic: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ createdAt: -1 });
teamSchema.index({ lastActivity: -1 });
teamSchema.index({ inviteCode: 1 });

// Generate invite code before saving
teamSchema.pre('save', async function (next) {
  if (this.isNew && !this.inviteCode) {
    const generateInviteCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    // Ensure unique invite code
    let isUnique = false;
    let code;
    while (!isUnique) {
      code = generateInviteCode();
      const existingTeam = await mongoose.models.Team.findOne({ inviteCode: code });
      if (!existingTeam) {
        isUnique = true;
      }
    }
    
    this.inviteCode = code;
  }
  
  // Add captain as first member if not already
  if (this.isNew && this.members.length === 0) {
    this.members.push({
      user: this.captain,
      joinedAt: Date.now(),
      contribution: {
        distance: 0,
        points: 0,
        runs: 0
      },
      role: 'member'
    });
  }
  
  // Update last activity on certain operations
  if (this.isModified('members') || 
      this.isModified('totalDistance') || 
      this.isModified('totalPoints') ||
      this.isModified('totalRuns') ||
      this.isModified('name') ||
      this.isModified('description')) {
    this.lastActivity = Date.now();
  }
  
  next();
});

// Middleware to update average pace
teamSchema.pre('save', function(next) {
  if (this.totalRuns > 0 && this.totalDistance > 0) {
    this.averagePace = (this.totalRuns * 60) / this.totalDistance;
  }
  next();
});

// Static method to update all team ranks
teamSchema.statics.updateRanks = async function() {
  const teams = await this.find()
    .sort({ totalPoints: -1, totalDistance: -1 })
    .select('_id totalPoints totalDistance');
  
  const bulkOps = teams.map((team, index) => ({
    updateOne: {
      filter: { _id: team._id },
      update: { rank: index + 1 }
    }
  }));
  
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
  
  return teams.length;
};

// Static method to find teams by location
teamSchema.statics.findByLocation = function(city, country) {
  const query = {};
  if (city) query['location.city'] = new RegExp(city, 'i');
  if (country) query['location.country'] = new RegExp(country, 'i');
  return this.find(query);
};

// Instance method to add achievement
teamSchema.methods.addAchievement = function(name, description, icon = '🏆') {
  this.achievements.push({
    name,
    description,
    earnedAt: Date.now(),
    icon
  });
  return this.save();
};

// Instance method to get top contributors
teamSchema.methods.getTopContributors = function(limit = 5) {
  return this.members
    .sort((a, b) => b.contribution.points - a.contribution.points)
    .slice(0, limit);
};

// Instance method to check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user && member.user.toString() === userId.toString()
  );
};

// Instance method to check if user is captain
teamSchema.methods.isCaptain = function(userId) {
  return this.captain && this.captain.toString() === userId.toString();
};

// Instance method to get member by user ID
teamSchema.methods.getMember = function(userId) {
  return this.members.find(member => 
    member.user && member.user.toString() === userId.toString()
  );
};

// Instance method to regenerate invite code
teamSchema.methods.regenerateInviteCode = async function() {
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  let isUnique = false;
  let code;
  while (!isUnique) {
    code = generateInviteCode();
    const existingTeam = await mongoose.models.Team.findOne({ inviteCode: code });
    if (!existingTeam) {
      isUnique = true;
    }
  }
  
  this.inviteCode = code;
  await this.save();
  return code;
};

export default mongoose.model('Team', teamSchema);