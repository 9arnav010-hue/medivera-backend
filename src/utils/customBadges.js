// backend/src/utils/customBadges.js
// Custom badge definitions and award logic

export const CUSTOM_BADGES = {
  // Tier 1 - Starter Badges (Common)
  NEWCOMER: {
    id: 'newcomer',
    name: 'Newcomer',
    symbol: '🌱',
    rarity: 'common',
    description: 'Welcome to the journey',
    condition: (user) => user.createdAt // Auto-awarded on signup
  },
  FIRST_WEEK: {
    id: 'first_week',
    name: 'First Week',
    symbol: '📅',
    rarity: 'common',
    description: 'Completed your first week',
    condition: (user) => {
      const daysSinceJoin = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
      return daysSinceJoin >= 7 && (user.stats.totalChats + user.stats.totalReports + user.stats.totalVisionAnalysis) >= 5;
    }
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    symbol: '🐦',
    rarity: 'common',
    description: 'Active before 8 AM',
    condition: (user) => {
      // Check if last activity was before 8 AM
      const hour = new Date(user.stats.lastActiveDate).getHours();
      return hour < 8;
    }
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    symbol: '🦉',
    rarity: 'common',
    description: 'Active after midnight',
    condition: (user) => {
      const hour = new Date(user.stats.lastActiveDate).getHours();
      return hour >= 0 && hour < 5;
    }
  },
  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    symbol: '🎯',
    rarity: 'common',
    description: 'Active on weekends',
    condition: (user) => {
      const day = new Date(user.stats.lastActiveDate).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }
  },

  // Tier 2 - Achievement Badges (Uncommon)
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    symbol: '⚡',
    rarity: 'uncommon',
    description: 'Reached 25 km/h speed',
    condition: (user) => user.stats.running?.bestPace >= 25
  },
  MARATHON_MASTER: {
    id: 'marathon_master',
    name: 'Marathon Master',
    symbol: '🏃‍♂️',
    rarity: 'uncommon',
    description: 'Ran 42.195 km total',
    condition: (user) => user.stats.running?.totalDistance >= 42.195
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    symbol: '🦋',
    rarity: 'uncommon',
    description: 'Joined 3+ teams',
    condition: async (user) => {
      const Team = (await import('../models/Team.js')).default;
      const teamCount = await Team.countDocuments({ 'members.user': user._id });
      return teamCount >= 3;
    }
  },
  TERRITORY_KING: {
    id: 'territory_king',
    name: 'Territory King',
    symbol: '👑',
    rarity: 'uncommon',
    description: 'Captured 100 territories',
    condition: (user) => user.stats.running?.totalTerritory >= 100
  },
  CHALLENGE_HUNTER: {
    id: 'challenge_hunter',
    name: 'Challenge Hunter',
    symbol: '🎯',
    rarity: 'uncommon',
    description: 'Completed 50 challenges',
    condition: (user) => user.stats.totalChallenges >= 50
  },
  HEALTH_ADVOCATE: {
    id: 'health_advocate',
    name: 'Health Advocate',
    symbol: '💚',
    rarity: 'uncommon',
    description: 'Analyzed 50 reports',
    condition: (user) => user.stats.totalReports >= 50
  },
  VISION_EXPERT: {
    id: 'vision_expert',
    name: 'Vision Expert',
    symbol: '👁️',
    rarity: 'uncommon',
    description: 'Used Vision 25 times',
    condition: (user) => user.stats.totalVisionAnalysis >= 25
  },

  // Tier 3 - Elite Badges (Rare)
  LEGENDARY_RUNNER: {
    id: 'legendary_runner',
    name: 'Legendary Runner',
    symbol: '🏆',
    rarity: 'rare',
    description: 'Ran 1000 km total',
    condition: (user) => user.stats.running?.totalDistance >= 1000
  },
  LEADERBOARD_CHAMPION: {
    id: 'leaderboard_champion',
    name: 'Leaderboard Champion',
    symbol: '🥇',
    rarity: 'rare',
    description: 'Reached #1 on leaderboard',
    condition: (user) => user.leaderboardRank === 1
  },
  TEAM_LEADER: {
    id: 'team_leader',
    name: 'Team Leader',
    symbol: '⭐',
    rarity: 'rare',
    description: 'Captain of top 10 team',
    condition: async (user) => {
      const Team = (await import('../models/Team.js')).default;
      const teams = await Team.find({ captain: user._id }).sort('-totalPoints').limit(10);
      return teams.length > 0;
    }
  },
  CONSISTENCY_CHAMPION: {
    id: 'consistency_champion',
    name: 'Consistency Champion',
    symbol: '🔥',
    rarity: 'rare',
    description: '100-day streak',
    condition: (user) => user.stats.streak >= 100
  },
  WELLNESS_GURU: {
    id: 'wellness_guru',
    name: 'Wellness Guru',
    symbol: '🧘',
    rarity: 'rare',
    description: 'Reached level 25',
    condition: (user) => user.stats.level >= 25
  },
  TERRITORY_OVERLORD: {
    id: 'territory_overlord',
    name: 'Territory Overlord',
    symbol: '🏰',
    rarity: 'rare',
    description: 'Captured 500 territories',
    condition: (user) => user.stats.running?.totalTerritory >= 500
  },
  SPEED_OF_LIGHT: {
    id: 'speed_of_light',
    name: 'Speed of Light',
    symbol: '💫',
    rarity: 'rare',
    description: 'Reached 30 km/h speed',
    condition: (user) => user.stats.running?.bestPace >= 30
  },

  // Tier 4 - Legendary Badges (Legendary)
  IMMORTAL: {
    id: 'immortal',
    name: 'Immortal',
    symbol: '💎',
    rarity: 'legendary',
    description: '365-day streak',
    condition: (user) => user.stats.streak >= 365
  },
  ULTIMATE_CHAMPION: {
    id: 'ultimate_champion',
    name: 'Ultimate Champion',
    symbol: '👑',
    rarity: 'legendary',
    description: 'All achievements completed',
    condition: async (user) => {
      const Achievement = (await import('../models/Achievement.js')).default;
      const total = await Achievement.countDocuments({ user: user._id });
      const completed = await Achievement.countDocuments({ user: user._id, completed: true });
      return total > 0 && completed === total;
    }
  },
  WORLD_CONQUEROR: {
    id: 'world_conqueror',
    name: 'World Conqueror',
    symbol: '🌍',
    rarity: 'legendary',
    description: 'Captured 1000 territories',
    condition: (user) => user.stats.running?.totalTerritory >= 1000
  },
  ULTRA_MARATHON: {
    id: 'ultra_marathon',
    name: 'Ultra Marathon',
    symbol: '🦸',
    rarity: 'legendary',
    description: 'Ran 5000 km total',
    condition: (user) => user.stats.running?.totalDistance >= 5000
  },
  CENTURION: {
    id: 'centurion',
    name: 'Centurion',
    symbol: '💯',
    rarity: 'legendary',
    description: 'Reached level 100',
    condition: (user) => user.stats.level >= 100
  },

  // Special Event Badges
  FOUNDER: {
    id: 'founder',
    name: 'Founder',
    symbol: '🌟',
    rarity: 'legendary',
    description: 'Among first 10 users',
    condition: async (user) => {
      const User = (await import('../models/User.js')).default;
      const users = await User.find().sort('createdAt').limit(10);
      return users.some(u => u._id.toString() === user._id.toString());
    }
  },
  VALENTINE_2025: {
    id: 'valentine_2025',
    name: 'Valentine 2025',
    symbol: '💝',
    rarity: 'rare',
    description: 'Active on Valentine\'s Day 2025',
    condition: (user) => {
      const valentines = new Date('2025-02-14');
      const lastActive = new Date(user.stats.lastActiveDate);
      return lastActive.toDateString() === valentines.toDateString();
    }
  },
  NEW_YEAR_2025: {
    id: 'new_year_2025',
    name: 'New Year 2025',
    symbol: '🎉',
    rarity: 'rare',
    description: 'Started 2025 strong',
    condition: (user) => {
      const newYear = new Date('2025-01-01');
      const joined = new Date(user.createdAt);
      return joined >= newYear && joined <= new Date('2025-01-07');
    }
  },
  HALLOWEEN_2024: {
    id: 'halloween_2024',
    name: 'Halloween 2024',
    symbol: '🎃',
    rarity: 'rare',
    description: 'Active on Halloween 2024',
    condition: (user) => {
      const halloween = new Date('2024-10-31');
      const lastActive = new Date(user.stats.lastActiveDate);
      return lastActive.toDateString() === halloween.toDateString();
    }
  },
  CHRISTMAS_2024: {
    id: 'christmas_2024',
    name: 'Christmas 2024',
    symbol: '🎄',
    rarity: 'rare',
    description: 'Active on Christmas 2024',
    condition: (user) => {
      const christmas = new Date('2024-12-25');
      const lastActive = new Date(user.stats.lastActiveDate);
      return lastActive.toDateString() === christmas.toDateString();
    }
  },

  // Community Badges
  HELPFUL_HERO: {
    id: 'helpful_hero',
    name: 'Helpful Hero',
    symbol: '🦸‍♂️',
    rarity: 'uncommon',
    description: 'Helped 50 team members',
    condition: (user) => user.stats.helpedUsers >= 50
  },
  MOTIVATOR: {
    id: 'motivator',
    name: 'Motivator',
    symbol: '💪',
    rarity: 'uncommon',
    description: 'Inspired 100 runners',
    condition: (user) => user.stats.motivations >= 100
  },
  AMBASSADOR: {
    id: 'ambassador',
    name: 'Ambassador',
    symbol: '🎖️',
    rarity: 'rare',
    description: 'Invited 25 users',
    condition: (user) => user.stats.referrals >= 25
  },
  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'Perfectionist',
    symbol: '✨',
    rarity: 'legendary',
    description: 'All categories mastered',
    condition: (user) => {
      return user.stats.totalChats >= 50 && 
             user.stats.totalReports >= 50 && 
             user.stats.totalVisionAnalysis >= 50 &&
             user.stats.running?.totalRuns >= 100;
    }
  },
  COMPLETIONIST_PRO: {
    id: 'completionist_pro',
    name: 'Completionist Pro',
    symbol: '🏅',
    rarity: 'legendary',
    description: 'All badges collected',
    condition: (user) => user.badges?.length >= 30
  },
  ELITE_ATHLETE: {
    id: 'elite_athlete',
    name: 'Elite Athlete',
    symbol: '⚡',
    rarity: 'legendary',
    description: 'Top 1% globally',
    condition: async (user) => {
      const User = (await import('../models/User.js')).default;
      const totalUsers = await User.countDocuments();
      const topUsers = await User.find().sort('-stats.totalXP').limit(Math.ceil(totalUsers * 0.01));
      return topUsers.some(u => u._id.toString() === user._id.toString());
    }
  }
};

// Check and award custom badges
export async function checkCustomBadges(userId) {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    
    if (!user) return [];
    
    if (!user.badges) user.badges = [];
    
    const newBadges = [];
    
    // Check each badge condition
    for (const [key, badge] of Object.entries(CUSTOM_BADGES)) {
      // Skip if user already has this badge
      const hasBadge = user.badges.some(b => b.badgeId === badge.id);
      if (hasBadge) continue;
      
      // Check condition
      let conditionMet = false;
      try {
        conditionMet = await badge.condition(user);
      } catch (error) {
        console.error(`Error checking badge ${badge.id}:`, error);
        continue;
      }
      
      // Award badge if condition met
      if (conditionMet) {
        user.badges.push({
          badgeId: badge.id,
          name: badge.name,
          icon: badge.symbol,
          rarity: badge.rarity,
          description: badge.description,
          earnedAt: new Date()
        });
        newBadges.push(badge);
        console.log(`🎖️ Custom badge awarded: ${badge.name}`);
      }
    }
    
    if (newBadges.length > 0) {
      await user.save();
    }
    
    return newBadges;
  } catch (error) {
    console.error('Error checking custom badges:', error);
    return [];
  }
}

export default CUSTOM_BADGES;