// backend/src/controllers/leaderboardController.js
import Leaderboard from '../models/Leaderboard.js';
import User from '../models/User.js'; // ✅ MISSING IMPORT - THIS WAS THE BUG
import Territory from '../models/Territory.js';
import Run from '../models/Run.js';
import Team from '../models/Team.js';

// Get global leaderboard
export const getGlobalLeaderboard = async (req, res) => {
  try {
    const { type = 'points', timeframe = 'all', limit = 50 } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (timeframe) {
      case 'daily':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.setHours(0, 0, 0, 0)) 
          } 
        };
        break;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: weekStart } };
        break;
      case 'monthly':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear(), now.getMonth(), 1) 
          } 
        };
        break;
      case 'all':
      default:
        dateFilter = {};
    }

    let leaderboard;

    switch (type) {
      case 'distance':
        leaderboard = await User.find(dateFilter)
          .select('username avatar totalDistance level')
          .sort({ totalDistance: -1 })
          .limit(parseInt(limit));
        break;
      
      case 'territory':
        const territoryStats = await Territory.aggregate([
          { $match: { status: 'active', ...dateFilter } },
          {
            $group: {
              _id: '$userId',
              totalArea: { $sum: '$area' },
              territoryCount: { $sum: 1 }
            }
          },
          { $sort: { totalArea: -1 } },
          { $limit: parseInt(limit) }
        ]);

        const userIds = territoryStats.map(stat => stat._id);
        const users = await User.find({ _id: { $in: userIds } })
          .select('username avatar level');

        leaderboard = territoryStats.map(stat => {
          const user = users.find(u => u._id.toString() === stat._id.toString());
          return {
            ...user.toObject(),
            totalArea: stat.totalArea,
            territoryCount: stat.territoryCount
          };
        });
        break;
      
      case 'points':
      default:
        leaderboard = await User.find(dateFilter)
          .select('username avatar points level')
          .sort({ points: -1 })
          .limit(parseInt(limit));
    }

    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry.toObject ? entry.toObject() : entry
    }));

    res.json({ 
      leaderboard: rankedLeaderboard,
      type,
      timeframe
    });
  } catch (error) {
    console.error('Get global leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get team leaderboard
export const getTeamLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const teams = await Team.find()
      .select('name captain members totalDistance totalPoints totalRuns')
      .populate('captain', 'username avatar')
      .sort({ totalPoints: -1 })
      .limit(parseInt(limit));

    const rankedTeams = teams.map((team, index) => ({
      rank: index + 1,
      _id: team._id,
      name: team.name,
      points: team.totalPoints,
      totalDistance: team.totalDistance,
      totalRuns: team.totalRuns,
      memberCount: team.members.length,
      leader: {
        username: team.captain.username,
        avatar: team.captain.avatar
      }
    }));

    res.json({ leaderboard: rankedTeams });
  } catch (error) {
    console.error('Get team leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get local leaderboard (nearby users)
export const getLocalLeaderboard = async (req, res) => {
  try {
    const { lat, lng, radius = 10000, limit = 50 } = req.query;
    const userId = req.user.id;

    // Find users who have territories near this location
    const nearbyTerritories = await Territory.find({
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    }).select('userId');

    const nearbyUserIds = [...new Set(nearbyTerritories.map(t => t.userId.toString()))];

    const users = await User.find({
      _id: { $in: nearbyUserIds }
    })
    .select('username avatar points totalDistance level')
    .sort({ points: -1 })
    .limit(parseInt(limit));

    const rankedLeaderboard = users.map((user, index) => ({
      rank: index + 1,
      ...user.toObject(),
      isCurrentUser: user._id.toString() === userId
    }));

    res.json({ leaderboard: rankedLeaderboard });
  } catch (error) {
    console.error('Get local leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user rank - ✅ FIXED
export const getUserRank = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'points' } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let rank;
    let totalUsers;

    switch (type) {
      case 'distance':
        rank = await User.countDocuments({ 
          totalDistance: { $gt: user.totalDistance || 0 } 
        }) + 1;
        totalUsers = await User.countDocuments();
        break;
      
      case 'territory':
        const userTerritories = await Territory.aggregate([
          { $match: { userId: user._id, status: 'active' } },
          { $group: { _id: null, totalArea: { $sum: '$area' } } }
        ]);
        const userTotalArea = userTerritories[0]?.totalArea || 0;

        const usersWithMoreArea = await Territory.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$userId', totalArea: { $sum: '$area' } } },
          { $match: { totalArea: { $gt: userTotalArea } } },
          { $count: 'count' }
        ]);
        
        rank = (usersWithMoreArea[0]?.count || 0) + 1;
        totalUsers = await User.countDocuments();
        break;
      
      case 'points':
      default:
        rank = await User.countDocuments({ 
          points: { $gt: user.points || 0 } 
        }) + 1;
        totalUsers = await User.countDocuments();
    }

    res.json({ 
      rank,
      totalUsers,
      percentile: totalUsers > 0 ? ((totalUsers - rank) / totalUsers * 100).toFixed(2) : 0,
      type
    });
  } catch (error) {
    console.error('Get user rank error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get friends leaderboard
export const getFriendsLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'points' } = req.query;

    const user = await User.findById(userId).populate('friends', 'username avatar points totalDistance level');
    
    if (!user.friends || user.friends.length === 0) {
      return res.json({ leaderboard: [] });
    }

    let leaderboard = user.friends;

    // Sort based on type
    switch (type) {
      case 'distance':
        leaderboard.sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));
        break;
      case 'points':
      default:
        leaderboard.sort((a, b) => (b.points || 0) - (a.points || 0));
    }

    const rankedLeaderboard = leaderboard.map((friend, index) => ({
      rank: index + 1,
      ...friend.toObject()
    }));

    res.json({ leaderboard: rankedLeaderboard });
  } catch (error) {
    console.error('Get friends leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update leaderboard (called after runs, achievements, etc.)
export const updateLeaderboard = async (req, res) => {
  try {
    const { userId, type, value, metadata } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Find or create leaderboard entries
    const timeframes = [
      { period: 'daily', periodStart: today },
      { period: 'weekly', periodStart: weekStart },
      { period: 'monthly', periodStart: monthStart },
      { period: 'all-time', periodStart: new Date(0) }
    ];

    for (const { period, periodStart } of timeframes) {
      await Leaderboard.findOneAndUpdate(
        {
          userId,
          type,
          period,
          periodStart
        },
        {
          $inc: { value: value },
          $set: { 
            lastUpdated: new Date(),
            metadata
          }
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Leaderboard updated successfully' });
  } catch (error) {
    console.error('Update leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get leaderboard statistics
export const getLeaderboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTeams = await Team.countDocuments();
    
    const topRunner = await User.findOne()
      .sort({ totalDistance: -1 })
      .select('username totalDistance');
    
    const topTerritory = await Territory.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$userId', totalArea: { $sum: '$area' } } },
      { $sort: { totalArea: -1 } },
      { $limit: 1 }
    ]);

    const topTerritoryUser = topTerritory.length > 0 
      ? await User.findById(topTerritory[0]._id).select('username')
      : null;

    const totalDistance = await Run.aggregate([
      { $group: { _id: null, total: { $sum: '$distance' } } }
    ]);

    const totalRuns = await Run.countDocuments();

    res.json({
      totalUsers,
      totalTeams,
      totalRuns,
      totalDistance: totalDistance[0]?.total || 0,
      topRunner: topRunner ? {
        username: topRunner.username,
        distance: topRunner.totalDistance
      } : null,
      topTerritoryHolder: topTerritoryUser ? {
        username: topTerritoryUser.username,
        area: topTerritory[0].totalArea
      } : null
    });
  } catch (error) {
    console.error('Get leaderboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};