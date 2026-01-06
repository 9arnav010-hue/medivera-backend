// backend/src/controllers/customBadgeController.js
import User from '../models/User.js';

// All 35 custom badges
const CUSTOM_BADGES = {
  // Tier 1 - Common
  NEWCOMER: { id: 'newcomer', name: 'Newcomer', symbol: '🌱', rarity: 'common', description: 'Welcome to the journey' },
  FIRST_WEEK: { id: 'first_week', name: 'First Week', symbol: '📅', rarity: 'common', description: 'Completed your first week' },
  EARLY_BIRD: { id: 'early_bird', name: 'Early Bird', symbol: '🐦', rarity: 'common', description: 'Active before 8 AM' },
  NIGHT_OWL: { id: 'night_owl', name: 'Night Owl', symbol: '🦉', rarity: 'common', description: 'Active after midnight' },
  WEEKEND_WARRIOR: { id: 'weekend_warrior', name: 'Weekend Warrior', symbol: '🎯', rarity: 'common', description: 'Active on weekends' },

  // Tier 2 - Uncommon
  SPEED_DEMON: { id: 'speed_demon', name: 'Speed Demon', symbol: '⚡', rarity: 'uncommon', description: 'Reached 25 km/h speed' },
  MARATHON_MASTER: { id: 'marathon_master', name: 'Marathon Master', symbol: '🏃‍♂️', rarity: 'uncommon', description: 'Ran 42.195 km total' },
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', symbol: '🦋', rarity: 'uncommon', description: 'Joined 3+ teams' },
  TERRITORY_KING: { id: 'territory_king', name: 'Territory King', symbol: '👑', rarity: 'uncommon', description: 'Captured 100 territories' },
  CHALLENGE_HUNTER: { id: 'challenge_hunter', name: 'Challenge Hunter', symbol: '🎯', rarity: 'uncommon', description: 'Completed 50 challenges' },
  HEALTH_ADVOCATE: { id: 'health_advocate', name: 'Health Advocate', symbol: '💚', rarity: 'uncommon', description: 'Analyzed 50 reports' },
  VISION_EXPERT: { id: 'vision_expert', name: 'Vision Expert', symbol: '👁️', rarity: 'uncommon', description: 'Used Vision 25 times' },
  HELPFUL_HERO: { id: 'helpful_hero', name: 'Helpful Hero', symbol: '🦸‍♂️', rarity: 'uncommon', description: 'Helped 50 team members' },
  MOTIVATOR: { id: 'motivator', name: 'Motivator', symbol: '💪', rarity: 'uncommon', description: 'Inspired 100 runners' },

  // Tier 3 - Rare
  LEGENDARY_RUNNER: { id: 'legendary_runner', name: 'Legendary Runner', symbol: '🏆', rarity: 'rare', description: 'Ran 1000 km total' },
  LEADERBOARD_CHAMPION: { id: 'leaderboard_champion', name: 'Leaderboard Champion', symbol: '🥇', rarity: 'rare', description: 'Reached #1 on leaderboard' },
  TEAM_LEADER: { id: 'team_leader', name: 'Team Leader', symbol: '⭐', rarity: 'rare', description: 'Captain of top 10 team' },
  CONSISTENCY_CHAMPION: { id: 'consistency_champion', name: 'Consistency Champion', symbol: '🔥', rarity: 'rare', description: '100-day streak' },
  WELLNESS_GURU: { id: 'wellness_guru', name: 'Wellness Guru', symbol: '🧘', rarity: 'rare', description: 'Reached level 25' },
  TERRITORY_OVERLORD: { id: 'territory_overlord', name: 'Territory Overlord', symbol: '🏰', rarity: 'rare', description: 'Captured 500 territories' },
  SPEED_OF_LIGHT: { id: 'speed_of_light', name: 'Speed of Light', symbol: '💫', rarity: 'rare', description: 'Reached 30 km/h speed' },
  VALENTINE_2025: { id: 'valentine_2025', name: 'Valentine 2025', symbol: '💝', rarity: 'rare', description: 'Active on Valentine\'s Day 2025' },
  NEW_YEAR_2025: { id: 'new_year_2025', name: 'New Year 2025', symbol: '🎉', rarity: 'rare', description: 'Started 2025 strong' },
  HALLOWEEN_2024: { id: 'halloween_2024', name: 'Halloween 2024', symbol: '🎃', rarity: 'rare', description: 'Active on Halloween 2024' },
  CHRISTMAS_2024: { id: 'christmas_2024', name: 'Christmas 2024', symbol: '🎄', rarity: 'rare', description: 'Active on Christmas 2024' },
  AMBASSADOR: { id: 'ambassador', name: 'Ambassador', symbol: '🎖️', rarity: 'rare', description: 'Invited 25 users' },

  // Tier 4 - Legendary
  IMMORTAL: { id: 'immortal', name: 'Immortal', symbol: '💎', rarity: 'legendary', description: '365-day streak' },
  ULTIMATE_CHAMPION: { id: 'ultimate_champion', name: 'Ultimate Champion', symbol: '👑', rarity: 'legendary', description: 'All achievements completed' },
  WORLD_CONQUEROR: { id: 'world_conqueror', name: 'World Conqueror', symbol: '🌍', rarity: 'legendary', description: 'Captured 1000 territories' },
  ULTRA_MARATHON: { id: 'ultra_marathon', name: 'Ultra Marathon', symbol: '🦸', rarity: 'legendary', description: 'Ran 5000 km total' },
  CENTURION: { id: 'centurion', name: 'Centurion', symbol: '💯', rarity: 'legendary', description: 'Reached level 100' },
  FOUNDER: { id: 'founder', name: 'Founder', symbol: '🌟', rarity: 'legendary', description: 'Among first 10 users' },
  PERFECTIONIST: { id: 'perfectionist', name: 'Perfectionist', symbol: '✨', rarity: 'legendary', description: 'All categories mastered' },
  COMPLETIONIST_PRO: { id: 'completionist_pro', name: 'Completionist Pro', symbol: '🏅', rarity: 'legendary', description: 'All badges collected' },
  ELITE_ATHLETE: { id: 'elite_athlete', name: 'Elite Athlete', symbol: '⚡', rarity: 'legendary', description: 'Top 1% globally' }
};

// Award a custom badge to a user
export const awardCustomBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({
        success: false,
        message: 'userId and badgeId are required'
      });
    }

    const badge = CUSTOM_BADGES[badgeId.toUpperCase()];
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found',
        availableBadges: Object.keys(CUSTOM_BADGES)
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize badges array if needed
    if (!user.badges) {
      user.badges = [];
    }

    // Check if user already has this badge
    const hasBadge = user.badges.some(b => b.badgeId === badge.id);
    if (hasBadge) {
      return res.status(400).json({
        success: false,
        message: 'User already has this badge'
      });
    }

    // Award the badge
    user.badges.push({
      badgeId: badge.id,
      name: badge.name,
      icon: badge.symbol,
      rarity: badge.rarity,
      description: badge.description,
      earnedAt: new Date()
    });

    await user.save();

    console.log(`🎖️ Custom badge awarded: ${badge.name} to ${user.name || user.email}`);

    res.json({
      success: true,
      message: `Badge "${badge.name}" awarded successfully!`,
      badge: user.badges[user.badges.length - 1]
    });
  } catch (error) {
    console.error('Error awarding custom badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award badge',
      error: error.message
    });
  }
};

// Get all available custom badges
export const getAllCustomBadges = async (req, res) => {
  try {
    const badges = Object.values(CUSTOM_BADGES).map(badge => ({
      ...badge,
      key: badge.id.toUpperCase()
    }));

    // Group by rarity
    const grouped = {
      common: badges.filter(b => b.rarity === 'common'),
      uncommon: badges.filter(b => b.rarity === 'uncommon'),
      rare: badges.filter(b => b.rarity === 'rare'),
      legendary: badges.filter(b => b.rarity === 'legendary')
    };

    res.json({
      success: true,
      total: badges.length,
      badges,
      grouped
    });
  } catch (error) {
    console.error('Error getting custom badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get badges',
      error: error.message
    });
  }
};

// Remove a badge from user
export const removeCustomBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({
        success: false,
        message: 'userId and badgeId are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.badges) {
      return res.status(404).json({
        success: false,
        message: 'User has no badges'
      });
    }

    const badgeIndex = user.badges.findIndex(b => b.badgeId === badgeId);
    if (badgeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User does not have this badge'
      });
    }

    const removedBadge = user.badges[badgeIndex];
    user.badges.splice(badgeIndex, 1);
    await user.save();

    console.log(`🗑️ Badge removed: ${removedBadge.name} from ${user.name || user.email}`);

    res.json({
      success: true,
      message: `Badge "${removedBadge.name}" removed successfully`,
      removedBadge
    });
  } catch (error) {
    console.error('Error removing custom badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove badge',
      error: error.message
    });
  }
};

// Get user's custom badges
export const getUserCustomBadges = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('badges name email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const customBadges = user.badges?.filter(b => b.badgeId && b.rarity) || [];

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      badges: customBadges,
      count: customBadges.length
    });
  } catch (error) {
    console.error('Error getting user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user badges',
      error: error.message
    });
  }
};

// Award badge to current authenticated user (for testing)
export const awardBadgeToSelf = async (req, res) => {
  try {
    const { badgeId } = req.body;
    const userId = req.user._id;

    if (!badgeId) {
      return res.status(400).json({
        success: false,
        message: 'badgeId is required'
      });
    }

    const badge = CUSTOM_BADGES[badgeId.toUpperCase()];
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found',
        availableBadges: Object.keys(CUSTOM_BADGES)
      });
    }

    const user = await User.findById(userId);
    if (!user.badges) {
      user.badges = [];
    }

    const hasBadge = user.badges.some(b => b.badgeId === badge.id);
    if (hasBadge) {
      return res.status(400).json({
        success: false,
        message: 'You already have this badge'
      });
    }

    user.badges.push({
      badgeId: badge.id,
      name: badge.name,
      icon: badge.symbol,
      rarity: badge.rarity,
      description: badge.description,
      earnedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: `Badge "${badge.name}" awarded!`,
      badge: user.badges[user.badges.length - 1]
    });
  } catch (error) {
    console.error('Error awarding badge to self:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award badge',
      error: error.message
    });
  }
};