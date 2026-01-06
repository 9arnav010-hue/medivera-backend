import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: {
      type: String,
      default: null
    },
    verificationCodeExpires: {
      type: Date,
      default: null
    },
    // Profile fields
    avatar: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    dateOfBirth: {
      type: String,
      default: ''
    },
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say', ''],
      default: ''
    },
    healthProfile: {
      bloodGroup: String,
      allergies: [String],
      conditions: [String],
      medications: [String]
    },
    preferences: {
      language: {
        type: String,
        default: 'English'
      },
      notifications: {
        type: Boolean,
        default: true
      }
    },
    stats: {
      totalChats: { type: Number, default: 0 },
      totalReports: { type: Number, default: 0 },
      totalVisionAnalysis: { type: Number, default: 0 },
      totalXP: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
      streak: { type: Number, default: 0 },
      totalSymptomChecks: { type: Number, default: 0 },
      lastActiveDate: { type: Date, default: Date.now },

      running: {
        totalRuns: { type: Number, default: 0 },
        totalDistance: { type: Number, default: 0 },
        totalDuration: { type: Number, default: 0 },
        totalCalories: { type: Number, default: 0 },
        totalSteps: { type: Number, default: 0 },
        totalTerritory: { type: Number, default: 0 },
        bestPace: { type: Number, default: 0 },
        longestRun: { type: Number, default: 0 },
        totalXPFromRuns: { type: Number, default: 0 }
      }
    },
    badges: [{
      badgeId: String,
      name: String,
      icon: String,
      rarity: String,
      description: String,
      earnedAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Verification code helpers
userSchema.methods.generateVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = code;
  this.verificationCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return code;
};

userSchema.methods.clearVerificationCode = function () {
  this.verificationCode = null;
  this.verificationCodeExpires = null;
};

userSchema.methods.isVerificationCodeValid = function (code) {
  return (
    this.verificationCode === code &&
    this.verificationCodeExpires > Date.now()
  );
};

// XP and leveling methods
userSchema.methods.addXP = function (xp) {
  this.stats.totalXP += xp;
  const newLevel = Math.floor(this.stats.totalXP / 100) + 1;
  if (newLevel > this.stats.level) {
    this.stats.level = newLevel;
    return { leveledUp: true, newLevel };
  }
  return { leveledUp: false };
};

export default mongoose.model('User', userSchema);