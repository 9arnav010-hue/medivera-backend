// backend/src/controllers/runController.js
import Run from '../models/Run.js';
import User from '../models/User.js';
import Territory from '../models/Territory.js';
import Team from '../models/Team.js';

// Create a new run - ✅ FIXED with Team updates
export const createRun = async (req, res) => {
  try {
    const { 
      distance, 
      duration, 
      pace, 
      calories, 
      route, 
      startLocation,
      endLocation,
      avgHeartRate,
      maxHeartRate,
      elevationGain
    } = req.body;
    
    const userId = req.user.id;

    // Validate required fields
    if (!distance || !duration || !route || !route.coordinates) {
      return res.status(400).json({ 
        message: 'Missing required fields: distance, duration, and route coordinates' 
      });
    }

    // Calculate pace if not provided
    const calculatedPace = pace || (duration / distance);

    // Ensure coordinates are in correct format
    const routeCoordinates = Array.isArray(route.coordinates[0]) 
      ? route.coordinates 
      : [route.coordinates];

    const run = new Run({
      userId,
      distance,
      duration,
      pace: calculatedPace,
      calories: calories || Math.round(distance * 60), // Rough estimate
      route: {
        type: 'LineString',
        coordinates: routeCoordinates
      },
      startLocation: startLocation || {
        type: 'Point',
        coordinates: routeCoordinates[0]
      },
      endLocation: endLocation || {
        type: 'Point',
        coordinates: routeCoordinates[routeCoordinates.length - 1]
      },
      avgHeartRate,
      maxHeartRate,
      elevationGain: elevationGain || 0,
      weather: req.body.weather || {}
    });

    await run.save();

    // Update user statistics
    const user = await User.findById(userId);
    user.totalDistance = (user.totalDistance || 0) + distance;
    user.totalRuns = (user.totalRuns || 0) + 1;
    user.totalDuration = (user.totalDuration || 0) + duration;
    user.totalCalories = (user.totalCalories || 0) + (calories || Math.round(distance * 60));
    
    // Update points
    const pointsEarned = Math.round(distance * 10); // 10 points per km
    user.points = (user.points || 0) + pointsEarned;
    
    await user.save();

    // ✅ UPDATE TEAM STATS IF USER IS IN A TEAM
    // Update team contribution if user is in a team
const userTeam = await Team.findOne({ 'members.user': userId });
if (userTeam) {
  const memberIndex = userTeam.members.findIndex(
    m => m.user.toString() === userId.toString()
  );
  
  if (memberIndex !== -1) {
    userTeam.members[memberIndex].contribution.distance += distance;
    userTeam.members[memberIndex].contribution.runs += 1;
    userTeam.members[memberIndex].contribution.points += pointsEarned;
    
    userTeam.totalDistance += distance;
    userTeam.totalRuns += 1;
    userTeam.totalPoints += pointsEarned;
    
    await userTeam.save();
    console.log(`✅ Team stats updated for: ${userTeam.name}`);
  }
}

    res.status(201).json({
      message: 'Run created successfully',
      run,
      pointsEarned,
      stats: {
        totalDistance: user.totalDistance,
        totalRuns: user.totalRuns,
        totalPoints: user.points
      }
    });
  } catch (error) {
    console.error('Create run error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's runs
export const getUserRuns = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { limit = 20, skip = 0, sortBy = 'createdAt' } = req.query;

    const runs = await Run.find({ userId })
      .sort({ [sortBy]: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Run.countDocuments({ userId });

    res.json({ 
      runs, 
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get user runs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get run details
export const getRunDetails = async (req, res) => {
  try {
    const { runId } = req.params;

    const run = await Run.findById(runId)
      .populate('userId', 'username avatar level');

    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    // Check if this run created any territories
    const territory = await Territory.findOne({ runId: run._id });

    res.json({ 
      run,
      territory: territory || null
    });
  } catch (error) {
    console.error('Get run details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update run
export const updateRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const run = await Run.findById(runId);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    if (run.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this run' });
    }

    // Update allowed fields
    const allowedUpdates = ['notes', 'weather', 'feeling', 'tags'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        run[key] = updates[key];
      }
    });

    await run.save();

    res.json({
      message: 'Run updated successfully',
      run
    });
  } catch (error) {
    console.error('Update run error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete run
export const deleteRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user.id;

    const run = await Run.findById(runId);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    if (run.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this run' });
    }

    // Update user statistics
    const user = await User.findById(userId);
    user.totalDistance = Math.max(0, (user.totalDistance || 0) - run.distance);
    user.totalRuns = Math.max(0, (user.totalRuns || 0) - 1);
    user.totalDuration = Math.max(0, (user.totalDuration || 0) - run.duration);
    user.totalCalories = Math.max(0, (user.totalCalories || 0) - (run.calories || 0));
    await user.save();

    await run.deleteOne();

    res.json({ message: 'Run deleted successfully' });
  } catch (error) {
    console.error('Delete run error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get run statistics
export const getRunStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'all' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: weekStart } };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: monthStart } };
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { $gte: yearStart } };
        break;
      case 'all':
      default:
        dateFilter = {};
    }

    const runs = await Run.find({ userId, ...dateFilter });

    const stats = {
      totalRuns: runs.length,
      totalDistance: runs.reduce((sum, r) => sum + r.distance, 0),
      totalDuration: runs.reduce((sum, r) => sum + r.duration, 0),
      totalCalories: runs.reduce((sum, r) => sum + (r.calories || 0), 0),
      avgDistance: runs.length > 0 ? runs.reduce((sum, r) => sum + r.distance, 0) / runs.length : 0,
      avgPace: runs.length > 0 ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length : 0,
      avgDuration: runs.length > 0 ? runs.reduce((sum, r) => sum + r.duration, 0) / runs.length : 0,
      longestRun: runs.length > 0 ? Math.max(...runs.map(r => r.distance)) : 0,
      fastestPace: runs.length > 0 ? Math.min(...runs.map(r => r.pace)) : 0,
      period
    };

    // Get runs by day for charts
    const runsByDay = {};
    runs.forEach(run => {
      const date = run.createdAt.toISOString().split('T')[0];
      if (!runsByDay[date]) {
        runsByDay[date] = {
          date,
          runs: 0,
          distance: 0,
          duration: 0
        };
      }
      runsByDay[date].runs += 1;
      runsByDay[date].distance += run.distance;
      runsByDay[date].duration += run.duration;
    });

    const chartData = Object.values(runsByDay).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({ 
      stats,
      chartData
    });
  } catch (error) {
    console.error('Get run stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get nearby runs (for exploring)
export const getNearbyRuns = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 20 } = req.query;

    const runs = await Run.find({
      startLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    })
    .populate('userId', 'username avatar level')
    .limit(parseInt(limit));

    res.json({ runs });
  } catch (error) {
    console.error('Get nearby runs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};