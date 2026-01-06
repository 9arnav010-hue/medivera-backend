// backend/src/controllers/runController.js
import Run from '../models/Run.js';
import User from '../models/User.js';
import Territory from '../models/Territory.js';
import Team from '../models/Team.js';

// Helper function to ensure proper GeoJSON format
const ensureGeoJSONPoint = (coordinates) => {
  // Make sure coordinates is a flat array of 2 numbers [lng, lat]
  if (!Array.isArray(coordinates)) {
    throw new Error('Coordinates must be an array');
  }
  
  // If coordinates is nested (e.g., [[lng, lat]]), flatten it
  if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    // If deeply nested, get the first inner array
    coordinates = coordinates[0];
  }
  
  // Ensure we have exactly 2 numeric values
  const lng = parseFloat(coordinates[0]);
  const lat = parseFloat(coordinates[1]);
  
  if (isNaN(lng) || isNaN(lat)) {
    throw new Error('Coordinates must contain valid numbers');
  }
  
  return [lng, lat];
};

// Validate and fix route coordinates
const validateRouteCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    throw new Error('Route coordinates must be an array');
  }
  
  // If it's a single coordinate array, wrap it in another array
  if (coordinates.length > 0 && !Array.isArray(coordinates[0])) {
    return [coordinates];
  }
  
  // Validate each coordinate pair
  return coordinates.map(coord => {
    if (!Array.isArray(coord) || coord.length < 2) {
      throw new Error('Each coordinate must be an array of [lng, lat]');
    }
    return [parseFloat(coord[0]), parseFloat(coord[1])];
  });
};

// Create a new run - ✅ FIXED with proper GeoJSON format
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

    // Validate and fix coordinates format
    let routeCoordinates;
    try {
      routeCoordinates = validateRouteCoordinates(route.coordinates);
    } catch (error) {
      return res.status(400).json({ 
        message: `Invalid route coordinates: ${error.message}` 
      });
    }

    // Calculate pace if not provided
    const calculatedPace = pace || (duration / distance);

    // Prepare GeoJSON point objects for start and end locations
    let startPoint, endPoint;
    try {
      // If startLocation is provided, use it, otherwise use first route coordinate
      if (startLocation && startLocation.coordinates) {
        const coords = ensureGeoJSONPoint(startLocation.coordinates);
        startPoint = {
          type: 'Point',
          coordinates: coords
        };
      } else {
        // Use first route coordinate (already validated)
        startPoint = {
          type: 'Point',
          coordinates: routeCoordinates[0]
        };
      }

      // If endLocation is provided, use it, otherwise use last route coordinate
      if (endLocation && endLocation.coordinates) {
        const coords = ensureGeoJSONPoint(endLocation.coordinates);
        endPoint = {
          type: 'Point',
          coordinates: coords
        };
      } else {
        // Use last route coordinate (already validated)
        endPoint = {
          type: 'Point',
          coordinates: routeCoordinates[routeCoordinates.length - 1]
        };
      }
    } catch (error) {
      return res.status(400).json({ 
        message: `Invalid location coordinates: ${error.message}` 
      });
    }

    console.log('Creating run with:', {
      startLocation: startPoint,
      endLocation: endPoint,
      routeCoordinatesLength: routeCoordinates.length
    });

    const run = new Run({
      userId,
      distance: parseFloat(distance),
      duration: parseFloat(duration),
      pace: calculatedPace,
      calories: calories || Math.round(distance * 60),
      route: {
        type: 'LineString',
        coordinates: routeCoordinates
      },
      startLocation: startPoint,
      endLocation: endPoint,
      avgHeartRate,
      maxHeartRate,
      elevationGain: elevationGain || 0,
      weather: req.body.weather || {}
    });

    await run.save();

    // Update user statistics
    const user = await User.findById(userId);
    user.totalDistance = (user.totalDistance || 0) + parseFloat(distance);
    user.totalRuns = (user.totalRuns || 0) + 1;
    user.totalDuration = (user.totalDuration || 0) + parseFloat(duration);
    user.totalCalories = (user.totalCalories || 0) + (calories || Math.round(distance * 60));
    
    // Update points
    const pointsEarned = Math.round(distance * 10); // 10 points per km
    user.points = (user.points || 0) + pointsEarned;
    
    await user.save();

    // ✅ UPDATE TEAM STATS IF USER IS IN A TEAM
    const userTeam = await Team.findOne({ 'members.user': userId });
    if (userTeam) {
      const memberIndex = userTeam.members.findIndex(
        m => m.user.toString() === userId.toString()
      );
      
      if (memberIndex !== -1) {
        userTeam.members[memberIndex].contribution.distance += parseFloat(distance);
        userTeam.members[memberIndex].contribution.runs += 1;
        userTeam.members[memberIndex].contribution.points += pointsEarned;
        
        userTeam.totalDistance += parseFloat(distance);
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
    
    // Provide more specific error messages for GeoJSON errors
    if (error.message.includes('geo keys') || error.message.includes('Point')) {
      return res.status(400).json({ 
        message: 'Invalid geographic data format. Please ensure coordinates are properly formatted.',
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
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
