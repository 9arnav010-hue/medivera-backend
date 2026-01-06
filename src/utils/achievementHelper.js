// backend/utils/achievementHelper.js
// Helper functions for managing achievements and badges

import Achievement from '../models/Achievement.js';
import User from '../models/User.js';

/**
 * Check and award achievement for a specific action
 * @param {string} userId - User ID
 * @param {string} category - Achievement category (chat, report, vision, runner, team)
 * @param {number} count - Progress increment (default: 1)
 */
export const checkAndAwardAchievement = async (userId, category, count = 1) => {
  try {
    // Find all incomplete achievements for this category
    const achievements = await Achievement.find({
      userId,
      category,
      completed: false
    });
    
    const awardedAchievements = [];
    
    for (const achievement of achievements) {
      // Increment progress
      achievement.progress += count;
      
      // Check if target reached
      if (achievement.progress >= achievement.target) {
        achievement.completed = true;
        achievement.completedAt = new Date();
        
        // Award XP to user
        const user = await User.findById(userId);
        if (user) {
          user.xp = (user.xp || 0) + achievement.reward.xp;
          user.level = Math.floor(user.xp / 100) + 1;
          await user.save();
        }
        
        awardedAchievements.push(achievement);
        console.log(`🏆 Achievement unlocked: ${achievement.title} (+${achievement.reward.xp} XP)`);
      }
      
      await achievement.save();
    }
    
    return awardedAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Initialize default achievements for a new user
 * @param {string} userId - User ID
 */
export const initializeUserAchievements = async (userId) => {
  try {
    const defaultAchievements = [
      // Chat Achievements
      {
        userId,
        title: "First Steps",
        description: "Complete your first health chat",
        icon: "💬",
        category: "chat",
        rarity: "common",
        target: 1,
        progress: 0,
        reward: { xp: 50, badge: "First Steps" }
      },
      {
        userId,
        title: "Chatty Cathy",
        description: "Complete 10 health chats",
        icon: "🗣️",
        category: "chat",
        rarity: "rare",
        target: 10,
        progress: 0,
        reward: { xp: 200, badge: "Chatty Cathy" }
      },
      {
        userId,
        title: "Health Guru",
        description: "Complete 50 health chats",
        icon: "🧘",
        category: "chat",
        rarity: "epic",
        target: 50,
        progress: 0,
        reward: { xp: 500, badge: "Health Guru" }
      },
      
      // Report Achievements
      {
        userId,
        title: "Report Rookie",
        description: "Analyze your first medical report",
        icon: "📄",
        category: "report",
        rarity: "common",
        target: 1,
        progress: 0,
        reward: { xp: 50, badge: "Report Rookie" }
      },
      {
        userId,
        title: "Report Master",
        description: "Analyze 10 medical reports",
        icon: "📊",
        category: "report",
        rarity: "rare",
        target: 10,
        progress: 0,
        reward: { xp: 250, badge: "Report Master" }
      },
      
      // Vision Achievements
      {
        userId,
        title: "Eagle Eye",
        description: "Complete your first vision analysis",
        icon: "👁️",
        category: "vision",
        rarity: "common",
        target: 1,
        progress: 0,
        reward: { xp: 50, badge: "Eagle Eye" }
      },
      {
        userId,
        title: "Vision Expert",
        description: "Complete 10 vision analyses",
        icon: "🔍",
        category: "vision",
        rarity: "epic",
        target: 10,
        progress: 0,
        reward: { xp: 300, badge: "Vision Expert" }
      },
      
      // Symptom Checker Achievements
      {
        userId,
        title: "Self Diagnosis",
        description: "Complete your first symptom check",
        icon: "🩺",
        category: "symptom",
        rarity: "common",
        target: 1,
        progress: 0,
        reward: { xp: 50, badge: "Self Diagnosis" }
      },
      {
        userId,
        title: "Health Detective",
        description: "Complete 10 symptom checks",
        icon: "🔬",
        category: "symptom",
        rarity: "rare",
        target: 10,
        progress: 0,
        reward: { xp: 250, badge: "Health Detective" }
      },
      {
        userId,
        title: "Symptom Savant",
        description: "Complete 25 symptom checks",
        icon: "🧠",
        category: "symptom",
        rarity: "epic",
        target: 25,
        progress: 0,
        reward: { xp: 500, badge: "Symptom Savant" }
      },
      
      // Team Achievements
      {
        userId,
        title: "Team Player",
        description: "Join your first team",
        icon: "🤝",
        category: "team",
        rarity: "common",
        target: 1,
        progress: 0,
        reward: { xp: 50, badge: "Team Player" }
      },
      {
        userId,
        title: "Team Captain",
        description: "Create your first team",
        icon: "👑",
        category: "team",
        rarity: "rare",
        target: 1,
        progress: 0,
        reward: { xp: 100, badge: "Team Captain" }
      },
      
      // Runner Achievements
      {
        userId,
        title: "First Run",
        description: "Complete your first run",
        icon: "🏃",
        category: "runner",
        rarity: "common",
        target: 1,
        progress: 0,
        reward: { xp: 50, badge: "First Run" }
      },
      {
        userId,
        title: "Marathon Runner",
        description: "Complete 10 runs",
        icon: "🏅",
        category: "runner",
        rarity: "epic",
        target: 10,
        progress: 0,
        reward: { xp: 500, badge: "Marathon Runner" }
      },
      
      // Special Achievements
      {
        userId,
        title: "Early Adopter",
        description: "Join during beta phase",
        icon: "⭐",
        category: "special",
        rarity: "rare",
        target: 1,
        progress: 0,
        reward: { xp: 100, badge: "Early Adopter" }
      },
      {
        userId,
        title: "Pioneer",
        description: "Be one of the first 100 users",
        icon: "🚀",
        category: "special",
        rarity: "epic",
        target: 1,
        progress: 0,
        reward: { xp: 200, badge: "Pioneer" }
      },
      {
        userId,
        title: "Completionist",
        description: "Try all major features",
        icon: "🏆",
        category: "special",
        rarity: "legendary",
        target: 1,
        progress: 0,
        reward: { xp: 500, badge: "Completionist" }
      }
    ];
    
    // Create all achievements
    await Achievement.insertMany(defaultAchievements);
    console.log(`✅ Initialized ${defaultAchievements.length} achievements for user ${userId}`);
    
    return defaultAchievements;
  } catch (error) {
    console.error('Error initializing achievements:', error);
    throw error;
  }
};

/**
 * Manually award a specific achievement
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID
 */
export const manuallyAwardAchievement = async (userId, achievementId) => {
  try {
    const achievement = await Achievement.findOne({
      _id: achievementId,
      userId
    });
    
    if (!achievement) {
      throw new Error('Achievement not found');
    }
    
    if (achievement.completed) {
      throw new Error('Achievement already completed');
    }
    
    // Complete the achievement
    achievement.completed = true;
    achievement.completedAt = new Date();
    achievement.progress = achievement.target;
    await achievement.save();
    
    // Award XP
    const user = await User.findById(userId);
    if (user) {
      user.xp = (user.xp || 0) + achievement.reward.xp;
      user.level = Math.floor(user.xp / 100) + 1;
      await user.save();
    }
    
    console.log(`🏆 Manually awarded: ${achievement.title}`);
    return { achievement, user };
  } catch (error) {
    console.error('Error manually awarding achievement:', error);
    throw error;
  }
};

/**
 * Award custom badge (not tied to achievements)
 * @param {string} userId - User ID
 * @param {object} badgeData - Badge data
 */
export const awardCustomBadge = async (userId, badgeData) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.customBadges) {
      user.customBadges = [];
    }
    
    const newBadge = {
      name: badgeData.name,
      description: badgeData.description,
      icon: badgeData.icon,
      rarity: badgeData.rarity || 'common',
      category: badgeData.category || 'special',
      earnedAt: new Date()
    };
    
    user.customBadges.push(newBadge);
    await user.save();
    
    console.log(`🎖️ Custom badge awarded: ${badgeData.name}`);
    return newBadge;
  } catch (error) {
    console.error('Error awarding custom badge:', error);
    throw error;
  }
};

/**
 * Get user's badge count (completed achievements + custom badges)
 * @param {string} userId - User ID
 */
export const getUserBadgeCount = async (userId) => {
  try {
    const [completedAchievements, user] = await Promise.all([
      Achievement.countDocuments({ userId, completed: true }),
      User.findById(userId).select('customBadges')
    ]);
    
    const customBadgeCount = user?.customBadges?.length || 0;
    const totalBadges = completedAchievements + customBadgeCount;
    
    return {
      achievementBadges: completedAchievements,
      customBadges: customBadgeCount,
      totalBadges
    };
  } catch (error) {
    console.error('Error getting badge count:', error);
    return { achievementBadges: 0, customBadges: 0, totalBadges: 0 };
  }
};

export default {
  checkAndAwardAchievement,
  initializeUserAchievements,
  manuallyAwardAchievement,
  awardCustomBadge,
  getUserBadgeCount
};