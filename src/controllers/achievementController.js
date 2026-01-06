import Achievement from '../models/Achievement.js';
import User from '../models/User.js';

// Achievement definitions
const ACHIEVEMENTS = [
  // Chat Achievements
  { id: 'first_chat', title: 'First Steps', description: 'Send your first message to Dr. AI', icon: '💬', category: 'chat', target: 1, xp: 10 },
  { id: 'chat_5', title: 'Getting Started', description: 'Have 5 chat sessions', icon: '🗣️', category: 'chat', target: 5, xp: 25 },
  { id: 'chat_10', title: 'Regular Visitor', description: 'Have 10 chat sessions', icon: '💭', category: 'chat', target: 10, xp: 50 },
  { id: 'chat_25', title: 'Health Enthusiast', description: 'Have 25 chat sessions', icon: '🎯', category: 'chat', target: 25, xp: 100 },
  { id: 'chat_50', title: 'Wellness Warrior', description: 'Have 50 chat sessions', icon: '⚔️', category: 'chat', target: 50, xp: 200 },
  
  // Report Achievements
  { id: 'first_report', title: 'Report Rookie', description: 'Analyze your first medical report', icon: '📄', category: 'report', target: 1, xp: 15 },
  { id: 'report_5', title: 'Data Collector', description: 'Analyze 5 medical reports', icon: '📊', category: 'report', target: 5, xp: 50 },
  { id: 'report_10', title: 'Health Tracker', description: 'Analyze 10 medical reports', icon: '📈', category: 'report', target: 10, xp: 100 },
  { id: 'report_25', title: 'Master Analyst', description: 'Analyze 25 medical reports', icon: '🎓', category: 'report', target: 25, xp: 250 },
  
  // Vision Achievements
  { id: 'first_vision', title: 'Eagle Eye', description: 'Use VisionCare+ for the first time', icon: '👁️', category: 'vision', target: 1, xp: 20 },
  { id: 'vision_5', title: 'Image Explorer', description: 'Analyze 5 medical images', icon: '🔍', category: 'vision', target: 5, xp: 75 },
  { id: 'vision_10', title: 'Vision Master', description: 'Analyze 10 medical images', icon: '🦅', category: 'vision', target: 10, xp: 150 },
  
  // Symptom Checker Achievements - NEW!
  { id: 'first_symptom', title: 'Self Diagnosis', description: 'Complete your first symptom check', icon: '🩺', category: 'symptom', target: 1, xp: 15 },
  { id: 'symptom_5', title: 'Health Detective', description: 'Complete 5 symptom checks', icon: '🔬', category: 'symptom', target: 5, xp: 50 },
  { id: 'symptom_10', title: 'Symptom Tracker', description: 'Complete 10 symptom checks', icon: '📋', category: 'symptom', target: 10, xp: 100 },
  { id: 'symptom_25', title: 'Symptom Savant', description: 'Complete 25 symptom checks', icon: '🧠', category: 'symptom', target: 25, xp: 250 },
  
  // LazySense - Running Achievements
  { id: 'first_run', title: 'First Steps', description: 'Complete your first run', icon: '👟', category: 'running', target: 1, xp: 25 },
  { id: 'run_5', title: 'Getting Active', description: 'Complete 5 runs', icon: '🏃', category: 'running', target: 5, xp: 50 },
  { id: 'run_10', title: 'Regular Runner', description: 'Complete 10 runs', icon: '🏃‍♂️', category: 'running', target: 10, xp: 100 },
  { id: 'run_25', title: 'Dedicated Runner', description: 'Complete 25 runs', icon: '💪', category: 'running', target: 25, xp: 200 },
  { id: 'run_50', title: 'Marathon Spirit', description: 'Complete 50 runs', icon: '🎽', category: 'running', target: 50, xp: 400 },
  { id: 'run_100', title: 'Century Club', description: 'Complete 100 runs', icon: '💯', category: 'running', target: 100, xp: 800 },
  
  // LazySense - Distance Achievements
  { id: 'distance_1km', title: 'First Kilometer', description: 'Run your first kilometer', icon: '🎯', category: 'distance', target: 1, xp: 20 },
  { id: 'distance_5km', title: '5K Achiever', description: 'Run a total of 5 kilometers', icon: '🏅', category: 'distance', target: 5, xp: 50 },
  { id: 'distance_10km', title: '10K Champion', description: 'Run a total of 10 kilometers', icon: '🥇', category: 'distance', target: 10, xp: 100 },
  { id: 'distance_25km', title: 'Quarter Century', description: 'Run a total of 25 kilometers', icon: '⭐', category: 'distance', target: 25, xp: 200 },
  { id: 'distance_50km', title: 'Half Century', description: 'Run a total of 50 kilometers', icon: '🌟', category: 'distance', target: 50, xp: 400 },
  { id: 'distance_100km', title: 'Century Runner', description: 'Run a total of 100 kilometers', icon: '👑', category: 'distance', target: 100, xp: 800 },
  { id: 'distance_250km', title: 'Ultra Runner', description: 'Run a total of 250 kilometers', icon: '🦸', category: 'distance', target: 250, xp: 1500 },
  { id: 'distance_500km', title: 'Legend', description: 'Run a total of 500 kilometers', icon: '🔥', category: 'distance', target: 500, xp: 3000 },
  
  // LazySense - Territory Achievements
  { id: 'first_territory', title: 'Territory Hunter', description: 'Capture your first territory', icon: '🗺️', category: 'territory', target: 1, xp: 30 },
  { id: 'territory_5', title: 'Land Grabber', description: 'Capture 5 territories', icon: '🏰', category: 'territory', target: 5, xp: 75 },
  { id: 'territory_10', title: 'Territory Master', description: 'Capture 10 territories', icon: '🏛️', category: 'territory', target: 10, xp: 150 },
  { id: 'territory_25', title: 'Empire Builder', description: 'Capture 25 territories', icon: '🌍', category: 'territory', target: 25, xp: 350 },
  { id: 'territory_50', title: 'Conqueror', description: 'Capture 50 territories', icon: '⚔️', category: 'territory', target: 50, xp: 700 },
  
  // LazySense - Team Achievements
  { id: 'first_team', title: 'Team Player', description: 'Join your first team', icon: '👥', category: 'team', target: 1, xp: 25 },
  { id: 'team_captain', title: 'Team Captain', description: 'Create your own team', icon: '👑', category: 'team', target: 1, xp: 50 },
  { id: 'team_contributor', title: 'Team Contributor', description: 'Contribute 10km to your team', icon: '🤝', category: 'team', target: 10, xp: 100 },
  { id: 'team_champion', title: 'Team Champion', description: 'Contribute 50km to your team', icon: '🏆', category: 'team', target: 50, xp: 300 },
  { id: 'team_legend', title: 'Team Legend', description: 'Contribute 100km to your team', icon: '💎', category: 'team', target: 100, xp: 600 },
  
  // LazySense - Challenge Achievements
  { id: 'first_challenge', title: 'Challenge Accepted', description: 'Complete your first challenge', icon: '🎯', category: 'challenge', target: 1, xp: 30 },
  { id: 'challenge_5', title: 'Challenge Seeker', description: 'Complete 5 challenges', icon: '🔍', category: 'challenge', target: 5, xp: 100 },
  { id: 'challenge_10', title: 'Challenge Master', description: 'Complete 10 challenges', icon: '🎖️', category: 'challenge', target: 10, xp: 200 },
  { id: 'challenge_25', title: 'Challenge Dominator', description: 'Complete 25 challenges', icon: '⚡', category: 'challenge', target: 25, xp: 500 },
  
  // LazySense - Speed Achievements
  { id: 'speed_10kmh', title: 'Speed Walker', description: 'Reach 10 km/h speed', icon: '🚶‍♂️', category: 'speed', target: 10, xp: 50 },
  { id: 'speed_15kmh', title: 'Jogger', description: 'Reach 15 km/h speed', icon: '🏃', category: 'speed', target: 15, xp: 100 },
  { id: 'speed_20kmh', title: 'Sprinter', description: 'Reach 20 km/h speed', icon: '💨', category: 'speed', target: 20, xp: 200 },
  
  // LazySense - Leaderboard Achievements
  { id: 'top_100', title: 'Top 100', description: 'Reach top 100 on global leaderboard', icon: '📊', category: 'leaderboard', target: 100, xp: 100 },
  { id: 'top_50', title: 'Top 50', description: 'Reach top 50 on global leaderboard', icon: '📈', category: 'leaderboard', target: 50, xp: 200 },
  { id: 'top_10', title: 'Top 10', description: 'Reach top 10 on global leaderboard', icon: '🥉', category: 'leaderboard', target: 10, xp: 500 },
  { id: 'top_3', title: 'Podium Finish', description: 'Reach top 3 on global leaderboard', icon: '🥈', category: 'leaderboard', target: 3, xp: 1000 },
  { id: 'rank_1', title: 'Number One', description: 'Reach #1 on global leaderboard', icon: '🥇', category: 'leaderboard', target: 1, xp: 2000 },
  
  // Streak Achievements
  { id: 'streak_3', title: 'Consistent Care', description: 'Use Medivéra for 3 days in a row', icon: '🔥', category: 'streak', target: 3, xp: 50 },
  { id: 'streak_7', title: 'Week Warrior', description: 'Use Medivéra for 7 days in a row', icon: '⭐', category: 'streak', target: 7, xp: 100 },
  { id: 'streak_30', title: 'Monthly Master', description: 'Use Medivéra for 30 days in a row', icon: '👑', category: 'streak', target: 30, xp: 500 },
  
  // Special Achievements
  { id: 'early_adopter', title: 'Early Adopter', description: 'Join Medivéra in its early days', icon: '🌟', category: 'special', target: 1, xp: 100 },
  { id: 'completionist', title: 'Completionist', description: 'Use all main features', icon: '🏆', category: 'special', target: 4, xp: 150 },
  { id: 'health_guru', title: 'Health Guru', description: 'Reach level 10', icon: '🧘', category: 'special', target: 10, xp: 300 },
  { id: 'dedicated', title: 'Dedicated User', description: 'Use Medivéra for 50 total sessions', icon: '💎', category: 'special', target: 50, xp: 400 },
  { id: 'pioneer', title: 'Pioneer', description: 'Be among the first 100 users', icon: '🚀', category: 'special', target: 1, xp: 200 }
];

// Initialize achievements for new user
export const initializeAchievements = async (userId) => {
  try {
    console.log(`🎯 Initializing achievements for user: ${userId}`);
    
    // Check if achievements already exist
    const existingCount = await Achievement.countDocuments({ user: userId });
    if (existingCount > 0) {
      console.log(`✅ User already has ${existingCount} achievements, skipping initialization`);
      return { success: true, message: 'Achievements already exist', count: existingCount };
    }

    const achievements = ACHIEVEMENTS.map(ach => ({
      user: userId,
      achievementId: ach.id,
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      category: ach.category,
      target: ach.target,
      progress: 0,
      completed: false,
      reward: {
        xp: ach.xp,
        badge: ach.icon
      }
    }));

    // Get user to award XP for special achievements
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check for early adopter and pioneer
    const userCount = await User.countDocuments();
    console.log(`📊 Total users: ${userCount}`);
    
    let totalBonusXP = 0;
    
    // Pioneer achievement (first 100 users)
    if (userCount <= 100) {
      const pioneerIndex = achievements.findIndex(a => a.achievementId === 'pioneer');
      if (pioneerIndex >= 0) {
        achievements[pioneerIndex].progress = 1;
        achievements[pioneerIndex].completed = true;
        achievements[pioneerIndex].completedAt = new Date();
        totalBonusXP += achievements[pioneerIndex].reward.xp;
        console.log(`🚀 Pioneer achievement unlocked! +${achievements[pioneerIndex].reward.xp} XP`);
        
        // Add badge
        if (!user.badges) user.badges = [];
        user.badges.push({
          name: achievements[pioneerIndex].title,
          earnedAt: new Date(),
          icon: achievements[pioneerIndex].icon
        });
      }
    }

    // Early Adopter achievement (everyone gets this initially)
    const earlyAdopterIndex = achievements.findIndex(a => a.achievementId === 'early_adopter');
    if (earlyAdopterIndex >= 0) {
      achievements[earlyAdopterIndex].progress = 1;
      achievements[earlyAdopterIndex].completed = true;
      achievements[earlyAdopterIndex].completedAt = new Date();
      totalBonusXP += achievements[earlyAdopterIndex].reward.xp;
      console.log(`🌟 Early Adopter achievement unlocked! +${achievements[earlyAdopterIndex].reward.xp} XP`);
      
      // Add badge
      if (!user.badges) user.badges = [];
      user.badges.push({
        name: achievements[earlyAdopterIndex].title,
        earnedAt: new Date(),
        icon: achievements[earlyAdopterIndex].icon
      });
    }

    // Award XP to user for unlocked achievements
    if (totalBonusXP > 0) {
      console.log(`🎁 Awarding ${totalBonusXP} bonus XP to new user`);
      const levelUpResult = user.addXP(totalBonusXP);
      if (levelUpResult.leveledUp) {
        console.log(`🎉 User leveled up to level ${levelUpResult.newLevel}!`);
      }
      await user.save();
    }

    // Insert achievements
    await Achievement.insertMany(achievements);
    
    console.log(`✅ Successfully created ${achievements.length} achievements with ${totalBonusXP} bonus XP awarded`);
    return { 
      success: true, 
      message: 'Achievements initialized', 
      created: achievements.length,
      bonusXP: totalBonusXP
    };
  } catch (error) {
    console.error('❌ Error initializing achievements:', error.message);
    return { success: false, message: 'Error initializing achievements', error: error.message };
  }
};

// Check and update achievements
export const checkAchievements = async (userId, type, count) => {
  try {
    console.log(`🔍 Checking achievements for user ${userId}, type: ${type}, count: ${count}`);
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found');
      return [];
    }

    if (!user.badges) {
      user.badges = [];
    }

    const unlockedAchievements = [];
    let achievementIds = [];
    
    // Map achievement types
    if (type === 'chat') {
      achievementIds = ['first_chat', 'chat_5', 'chat_10', 'chat_25', 'chat_50'];
    } else if (type === 'report') {
      achievementIds = ['first_report', 'report_5', 'report_10', 'report_25'];
    } else if (type === 'vision') {
      achievementIds = ['first_vision', 'vision_5', 'vision_10'];
    } else if (type === 'symptom') {
      achievementIds = ['first_symptom', 'symptom_5', 'symptom_10', 'symptom_25'];
    } else if (type === 'streak') {
      achievementIds = ['streak_3', 'streak_7', 'streak_30'];
    } else if (type === 'run') {
      achievementIds = ['first_run', 'run_5', 'run_10', 'run_25', 'run_50', 'run_100'];
    } else if (type === 'distance') {
      achievementIds = ['distance_1km', 'distance_5km', 'distance_10km', 'distance_25km', 'distance_50km', 'distance_100km', 'distance_250km', 'distance_500km'];
    } else if (type === 'territory') {
      achievementIds = ['first_territory', 'territory_5', 'territory_10', 'territory_25', 'territory_50'];
    } else if (type === 'team') {
      achievementIds = ['first_team', 'team_captain', 'team_contributor', 'team_champion', 'team_legend'];
    } else if (type === 'challenge') {
      achievementIds = ['first_challenge', 'challenge_5', 'challenge_10', 'challenge_25'];
    } else if (type === 'speed') {
      achievementIds = ['speed_10kmh', 'speed_15kmh', 'speed_20kmh'];
    } else if (type === 'leaderboard') {
      achievementIds = ['top_100', 'top_50', 'top_10', 'top_3', 'rank_1'];
    }

    console.log(`📋 Checking achievement IDs: ${achievementIds.join(', ')}`);

    for (const achId of achievementIds) {
      const achievement = await Achievement.findOne({
        user: userId,
        achievementId: achId,
        completed: false
      });

      if (achievement) {
        achievement.progress = count;
        
        if (achievement.progress >= achievement.target) {
          achievement.completed = true;
          achievement.completedAt = new Date();
          
          console.log(`🎉 Achievement unlocked: ${achievement.title} (+${achievement.reward.xp} XP)`);
          
          // Award XP
          const levelUp = user.addXP(achievement.reward.xp);
          
          // Add badge
          user.badges.push({
            name: achievement.title,
            earnedAt: new Date(),
            icon: achievement.icon
          });

          unlockedAchievements.push({
            ...achievement.toObject(),
            levelUp: levelUp.leveledUp ? levelUp.newLevel : null
          });
        }
        
        await achievement.save();
      }
    }

    // Check special achievements
    const totalSessions = user.stats.totalChats + user.stats.totalReports + user.stats.totalVisionAnalysis + (user.stats.totalSymptomChecks || 0);
    console.log(`📊 Total sessions: ${totalSessions}`);
    
    // Completionist - NOW REQUIRES 4 FEATURES (including Symptom Checker)
    if (user.stats.totalChats > 0 && user.stats.totalReports > 0 && user.stats.totalVisionAnalysis > 0 && (user.stats.totalSymptomChecks || 0) > 0) {
      const completionist = await Achievement.findOne({
        user: userId,
        achievementId: 'completionist',
        completed: false
      });
      
      if (completionist) {
        completionist.progress = 4;
        completionist.completed = true;
        completionist.completedAt = new Date();
        await completionist.save();
        
        const levelUp = user.addXP(completionist.reward.xp);
        user.badges.push({
          name: completionist.title,
          earnedAt: new Date(),
          icon: completionist.icon
        });
        
        console.log(`🏆 Completionist achievement unlocked!`);
        
        unlockedAchievements.push({
          ...completionist.toObject(),
          levelUp: levelUp.leveledUp ? levelUp.newLevel : null
        });
      }
    }

    // Dedicated User
    if (totalSessions >= 50) {
      const dedicated = await Achievement.findOne({
        user: userId,
        achievementId: 'dedicated',
        completed: false
      });
      
      if (dedicated) {
        dedicated.progress = totalSessions;
        dedicated.completed = true;
        dedicated.completedAt = new Date();
        await dedicated.save();
        
        const levelUp = user.addXP(dedicated.reward.xp);
        user.badges.push({
          name: dedicated.title,
          earnedAt: new Date(),
          icon: dedicated.icon
        });
        
        console.log(`💎 Dedicated User achievement unlocked!`);
        
        unlockedAchievements.push({
          ...dedicated.toObject(),
          levelUp: levelUp.leveledUp ? levelUp.newLevel : null
        });
      }
    }

    // Health Guru
    if (user.stats.level >= 10) {
      const guru = await Achievement.findOne({
        user: userId,
        achievementId: 'health_guru',
        completed: false
      });
      
      if (guru) {
        guru.progress = user.stats.level;
        guru.completed = true;
        guru.completedAt = new Date();
        await guru.save();
        
        const levelUp = user.addXP(guru.reward.xp);
        user.badges.push({
          name: guru.title,
          earnedAt: new Date(),
          icon: guru.icon
        });
        
        console.log(`🧘 Health Guru achievement unlocked!`);
        
        unlockedAchievements.push({
          ...guru.toObject(),
          levelUp: levelUp.leveledUp ? levelUp.newLevel : null
        });
      }
    }

    await user.save();
    
    console.log(`✅ Total unlocked achievements: ${unlockedAchievements.length}`);
    
    return unlockedAchievements;
  } catch (error) {
    console.error('❌ Error checking achievements:', error);
    return [];
  }
};

// Get all achievements for user
export const getAchievements = async (req, res) => {
  try {
    console.log(`📋 Fetching achievements for user: ${req.user._id}`);
    
    let achievements = await Achievement.find({ user: req.user._id }).sort({ category: 1, target: 1 });
    
    if (achievements.length === 0) {
      console.log(`⚠️ No achievements found, initializing...`);
      const result = await initializeAchievements(req.user._id);
      if (result.success) {
        achievements = await Achievement.find({ user: req.user._id }).sort({ category: 1, target: 1 });
      }
    }
    
    console.log(`✅ Found ${achievements.length} achievements`);
    
    res.json({
      success: true,
      achievements
    });
  } catch (error) {
    console.error('❌ Error getting achievements:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch achievements',
      message: error.message 
    });
  }
};

// Get user stats
export const getUserStats = async (req, res) => {
  try {
    console.log(`📊 Fetching stats for user: ${req.user._id}`);
    
    const user = await User.findById(req.user._id).select('stats badges');
    let achievements = await Achievement.find({ user: req.user._id });
    
    if (achievements.length === 0) {
      console.log(`⚠️ No achievements found, initializing...`);
      const result = await initializeAchievements(req.user._id);
      if (result.success) {
        achievements = await Achievement.find({ user: req.user._id });
      }
    }
    
    const completed = achievements.filter(a => a.completed).length;
    const total = achievements.length;
    
    console.log(`✅ Stats retrieved: ${completed}/${total} achievements completed`);
    
    res.json({
      success: true,
      stats: user.stats,
      badges: user.badges,
      achievementProgress: {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    });
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch stats',
      message: error.message 
    });
  }
};