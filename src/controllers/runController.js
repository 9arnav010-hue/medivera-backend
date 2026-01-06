// backend/src/controllers/runController.js
import Run from '../models/Run.js';
import User from '../models/User.js';
import Territory from '../models/Territory.js';
import Team from '../models/Team.js';

// Helper function to ensure proper GeoJSON format
const formatCoordinates = (coords) => {
  console.log('Formatting coordinates:', coords);
  
  // If coordinates are undefined or null, return default
  if (!coords) {
    return [0, 0];
  }
  
  // If it's already a flat array of 2 numbers, return as is
  if (Array.isArray(coords) && coords.length === 2) {
    const lng = parseFloat(coords[0]);
    const lat = parseFloat(coords[1]);
    
    if (!isNaN(lng) && !isNaN(lat)) {
      return [lng, lat];
    }
  }
  
  // If it's nested (e.g., [[lng, lat]]), flatten it
  if (Array.isArray(coords) && Array.isArray(coords[0])) {
    const inner = coords[0];
    if (Array.isArray(inner) && inner.length === 2) {
      const lng = parseFloat(inner[0]);
      const lat = parseFloat(inner[1]);
      
      if (!isNaN(lng) && !isNaN(lat)) {
        return [lng, lat];
      }
    } else if (inner.length === 2) {
      const lng = parseFloat(inner[0]);
      const lat = parseFloat(inner[1]);
      
      if (!isNaN(lng) && !isNaN(lat)) {
        return [lng, lat];
      }
    }
  }
  
  // Default fallback
  console.warn('Could not parse coordinates, using default:', coords);
  return [0, 0];
};

// Validate and format route coordinates
const formatRouteCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    throw new Error('Route coordinates must be an array');
  }
  
  // Handle single coordinate array
  if (coordinates.length > 0 && !Array.isArray(coordinates[0])) {
    const formatted = formatCoordinates(coordinates);
    return [formatted];
  }
  
  // Format all coordinates
  return coordinates.map(coord => {
    const formatted = formatCoordinates(coord);
    return formatted;
  }).filter(coord => coord[0] !== 0 || coord[1] !== 0); // Filter out invalid coords
};

// Create a new run - COMPLETELY REWRITTEN with proper GeoJSON handling
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

    console.log('=== CREATE RUN REQUEST ===');
    console.log('User ID:', userId);
    console.log('Raw data:', {
      distance, 
      duration, 
      routeType: route?.type,
      routeCoordsLength: route?.coordinates?.length,
      startCoords: startLocation?.coordinates,
      endCoords: endLocation?.coordinates
    });

    // Validate required fields
    if (!distance || !duration) {
      return res.status(400).json({ 
        message: 'Missing required fields: distance and duration' 
      });
    }

    // Validate route
    if (!route || !route.coordinates || !Array.isArray(route.coordinates)) {
      return res.status(400).json({ 
        message: 'Route coordinates are required and must be an array' 
      });
    }

    // Format coordinates with error handling
    let routeCoordinates;
    try {
      routeCoordinates = formatRouteCoordinates(route.coordinates);
    } catch (error) {
      return res.status(400).json({ 
        message: `Invalid route coordinates: ${error.message}` 
      });
    }

    // Validate we have at least 2 coordinates for a LineString
    if (routeCoordinates.length < 2) {
      return res.status(400).json({ 
        message: 'Route must have at least 2 coordinates' 
      });
    }

    // Format start and end locations
    const startCoords = formatCoordinates(
      startLocation?.coordinates || routeCoordinates[0]
    );
    
    const endCoords = formatCoordinates(
      endLocation?.coordinates || routeCoordinates[routeCoordinates.length - 1]
    );

    console.log('Formatted coordinates:', {
      start: startCoords,
      end: endCoords,
      routeCount: routeCoordinates.length,
      firstRoutePoint: routeCoordinates[0],
      lastRoutePoint: routeCoordinates[routeCoordinates.length - 1]
    });

    // Calculate pace if not provided
    const calculatedPace = pace || (distance > 0 ? duration / distance : 0);

    // Prepare the run object with CORRECT GeoJSON format
    const runData = {
      userId,
      distance: parseFloat(distance),
      duration: parseFloat(duration),
      pace: parseFloat(calculatedPace.toFixed(2)),
      calories: calories || Math.round(distance * 60),
      route: {
        type: 'LineString',
        coordinates: routeCoordinates
      },
      startLocation: {
        type: 'Point',
        coordinates: startCoords
      },
      endLocation: {
        type: 'Point',
        coordinates: endCoords
      },
      avgHeartRate: avgHeartRate || null,
      maxHeartRate: maxHeartRate || null,
      elevationGain: elevationGain || 0,
      weather: req.body.weather || {}
    };

    console.log('Final run data for MongoDB:', JSON.stringify({
      ...runData,
      route: { ...runData.route, coordinates: `[${runData.route.coordinates.length} points]` },
      startLocation: runData.startLocation,
      endLocation: runData.endLocation
    }, null, 2));

    // Create and save run
    const run = new Run(runData);
    await run.save();
    
    console.log('✅ Run saved successfully with ID:', run._id);

    // Update user statistics
    const user = await User.findById(userId);
    if (user) {
      user.totalDistance = (user.totalDistance || 0) + parseFloat(distance);
      user.totalRuns = (user.totalRuns || 0) + 1;
      user.totalDuration = (user.totalDuration || 0) + parseFloat(duration);
      user.totalCalories = (user.totalCalories || 0) + (runData.calories || 0);
      
      // Update points (10 points per km)
      const pointsEarned = Math.round(distance * 10);
      user.points = (user.points || 0) + pointsEarned;
      
      await user.save();
      console.log('✅ User stats updated:', user.username);
      
      // Update team stats if user is in a team
      try {
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
      } catch (teamError) {
        console.error('Team update error (non-fatal):', teamError.message);
        // Continue even if team update fails
      }
    }

    res.status(201).json({
      message: 'Run created successfully',
      run: {
        id: run._id,
        distance: run.distance,
        duration: run.duration,
        pace: run.pace,
        calories: run.calories,
        createdAt: run.createdAt
      },
      pointsEarned: Math.round(distance * 10),
      stats: user ? {
        totalDistance: user.totalDistance,
        totalRuns: user.totalRuns,
        totalPoints: user.points
      } : null
    });

  } catch (error) {
    console.error('❌ CREATE RUN ERROR:', error);
    
    // Special handling for GeoJSON errors
    if (error.message.includes('geo keys') || 
        error.message.includes('Point') || 
        error.message.includes('coordinates')) {
      
      console.error('GeoJSON Error Details:', {
        name: error.name,
        code: error.code,
        message: error.message
      });
      
      return res.status(400).json({ 
        success: false,
        message: 'Invalid geographic data format',
        error: 'Please ensure coordinates are in the correct format: [longitude, latitude]',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      success: false,
      message: 'Server error while saving run',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's runs
export const getUserRuns = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { limit = 20, skip = 0, sortBy = 'createdAt', startDate, endDate } = req.query;

    // Build query
    const query = { userId };
    
    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const runs = await Run.find(query)
      .sort({ [sortBy]: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();

    const total = await Run.countDocuments(query);

    res.json({
      success: true,
      runs: runs.map(run => ({
        ...run,
        formattedDistance: run.distance < 1 ? 
          `${(run.distance * 1000).toFixed(0)}m` : 
          `${run.distance.toFixed(2)}km`,
        formattedPace: `${run.pace.toFixed(2)} min/km`
      })),
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user runs error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching runs' 
    });
  }
};

// Get run details
export const getRunDetails = async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user.id;

    const run = await Run.findById(runId)
      .populate('userId', 'username avatar level points')
      .lean();

    if (!run) {
      return res.status(404).json({ 
        success: false,
        message: 'Run not found' 
      });
    }

    // Check if user owns this run or is admin
    if (run.userId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to view this run' 
      });
    }

    // Check if this run created any territories
    const territory = await Territory.findOne({ runId: run._id });

    // Calculate statistics
    const stats = {
      avgSpeed: run.distance > 0 ? (run.distance / (run.duration / 3600)).toFixed(2) : 0,
      caloriesPerKm: run.distance > 0 ? (run.calories / run.distance).toFixed(1) : 0,
      pointsEarned: Math.round(run.distance * 10)
    };

    res.json({
      success: true,
      run: {
        ...run,
        formattedDuration: run.duration < 3600 ? 
          `${Math.floor(run.duration / 60)}:${(run.duration % 60).toString().padStart(2, '0')}` :
          `${Math.floor(run.duration / 3600)}:${Math.floor((run.duration % 3600) / 60).toString().padStart(2, '0')}:${(run.duration % 60).toString().padStart(2, '0')}`,
        formattedDistance: run.distance < 1 ? 
          `${(run.distance * 1000).toFixed(0)}m` : 
          `${run.distance.toFixed(2)}km`,
        stats
      },
      territory: territory || null
    });
  } catch (error) {
    console.error('Get run details error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching run details' 
    });
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
      return res.status(404).json({ 
        success: false,
        message: 'Run not found' 
      });
    }

    // Check ownership
    if (run.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this run' 
      });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['notes', 'weather', 'feeling', 'tags'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        run[key] = updates[key];
      }
    });

    await run.save();

    res.json({
      success: true,
      message: 'Run updated successfully',
      run: {
        id: run._id,
        notes: run.notes,
        feeling: run.feeling,
        tags: run.tags,
        updatedAt: run.updatedAt
      }
    });
  } catch (error) {
    console.error('Update run error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating run' 
    });
  }
};

// Delete run
export const deleteRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user.id;

    const run = await Run.findById(runId);
    if (!run) {
      return res.status(404).json({ 
        success: false,
        message: 'Run not found' 
      });
    }

    // Check ownership
    if (run.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this run' 
      });
    }

    // Update user statistics (subtract this run)
    const user = await User.findById(userId);
    if (user) {
      user.totalDistance = Math.max(0, (user.totalDistance || 0) - run.distance);
      user.totalRuns = Math.max(0, (user.totalRuns || 0) - 1);
      user.totalDuration = Math.max(0, (user.totalDuration || 0) - run.duration);
      user.totalCalories = Math.max(0, (user.totalCalories || 0) - (run.calories || 0));
      
      // Remove points (10 points per km)
      const pointsToRemove = Math.round(run.distance * 10);
      user.points = Math.max(0, (user.points || 0) - pointsToRemove);
      
      await user.save();
    }

    // Delete associated territories
    await Territory.deleteMany({ runId: run._id });

    await run.deleteOne();

    res.json({
      success: true,
      message: 'Run deleted successfully',
      deletedRunId: runId
    });
  } catch (error) {
    console.error('Delete run error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting run' 
    });
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
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: todayStart } };
        break;
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

    const runs = await Run.find({ userId, ...dateFilter }).lean();

    // Calculate statistics
    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
    const totalCalories = runs.reduce((sum, r) => sum + (r.calories || 0), 0);
    const avgPace = runs.length > 0 ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length : 0;

    const stats = {
      totalRuns: runs.length,
      totalDistance,
      totalDuration,
      totalCalories,
      avgDistance: runs.length > 0 ? totalDistance / runs.length : 0,
      avgPace,
      avgDuration: runs.length > 0 ? totalDuration / runs.length : 0,
      avgSpeed: totalDuration > 0 ? (totalDistance / (totalDuration / 3600)).toFixed(2) : 0,
      longestRun: runs.length > 0 ? Math.max(...runs.map(r => r.distance)) : 0,
      fastestPace: runs.length > 0 ? Math.min(...runs.map(r => r.pace)) : 0,
      totalPoints: Math.round(totalDistance * 10),
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
          duration: 0,
          calories: 0,
          avgPace: 0
        };
      }
      runsByDay[date].runs += 1;
      runsByDay[date].distance += run.distance;
      runsByDay[date].duration += run.duration;
      runsByDay[date].calories += run.calories || 0;
    });

    // Calculate average pace per day
    Object.values(runsByDay).forEach(day => {
      day.avgPace = day.distance > 0 ? (day.duration / 60 / day.distance).toFixed(2) : 0;
    });

    const chartData = Object.values(runsByDay).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      success: true,
      stats: {
        ...stats,
        formatted: {
          totalDistance: totalDistance < 1 ? 
            `${(totalDistance * 1000).toFixed(0)}m` : 
            `${totalDistance.toFixed(2)}km`,
          totalDuration: totalDuration < 3600 ? 
            `${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s` :
            `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`,
          avgPace: `${avgPace.toFixed(2)} min/km`
        }
      },
      chartData
    });
  } catch (error) {
    console.error('Get run stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// Get nearby runs (for exploring)
export const getNearbyRuns = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 20 } = req.query;

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    const runs = await Run.find({
      startLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: parseInt(radius)
        }
      }
    })
    .populate('userId', 'username avatar level')
    .limit(parseInt(limit))
    .lean();

    res.json({
      success: true,
      runs: runs.map(run => ({
        ...run,
        distanceFromPoint: null, // Would need calculation
        formattedDistance: run.distance < 1 ? 
          `${(run.distance * 1000).toFixed(0)}m` : 
          `${run.distance.toFixed(2)}km`
      })),
      count: runs.length,
      location: { lat: latitude, lng: longitude },
      radius: parseInt(radius)
    });
  } catch (error) {
    console.error('Get nearby runs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching nearby runs'
    });
  }
};

// Export all functions
export default {
  createRun,
  getUserRuns,
  getRunDetails,
  updateRun,
  deleteRun,
  getRunStats,
  getNearbyRuns
};
