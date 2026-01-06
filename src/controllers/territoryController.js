// backend/src/controllers/territoryController.js
import Territory from '../models/Territory.js';
import Run from '../models/Run.js';
import User from '../models/User.js';

// Create or update territory after a run
export const createTerritory = async (req, res) => {
  try {
    const { runId, coordinates, area, routeName } = req.body;
    const userId = req.user.id;

    // Verify the run belongs to the user
    const run = await Run.findById(runId);
    if (!run || run.userId.toString() !== userId) {
      return res.status(404).json({ message: 'Run not found' });
    }

    // Check for overlapping territories
    const overlappingTerritories = await Territory.find({
      coordinates: {
        $geoIntersects: {
          $geometry: {
            type: 'Polygon',
            coordinates: coordinates
          }
        }
      },
      userId: { $ne: userId }
    });

    let status = 'active';
    let capturedFrom = null;
    
    if (overlappingTerritories.length > 0) {
      // Mark old territories as captured
      for (let oldTerritory of overlappingTerritories) {
        oldTerritory.status = 'captured';
        oldTerritory.capturedBy = userId;
        oldTerritory.capturedAt = new Date();
        await oldTerritory.save();
        
        capturedFrom = oldTerritory.userId;
      }
    }

    // Create new territory
    const territory = new Territory({
      userId,
      runId,
      coordinates,
      area,
      routeName: routeName || `Territory ${Date.now()}`,
      status,
      capturedFrom,
      level: 1,
      evolutionStage: 'settlement'
    });

    await territory.save();

    // Update user stats
    const user = await User.findById(userId);
    user.totalTerritories = (user.totalTerritories || 0) + 1;
    user.totalArea = (user.totalArea || 0) + area;
    await user.save();

    res.status(201).json({
      message: 'Territory created successfully',
      territory,
      capturedTerritories: overlappingTerritories.length
    });
  } catch (error) {
    console.error('Create territory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user territories
export const getUserTerritories = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { status = 'active' } = req.query;

    const territories = await Territory.find({ userId, status })
      .populate('runId', 'distance duration pace')
      .sort({ createdAt: -1 });

    const stats = {
      total: territories.length,
      totalArea: territories.reduce((sum, t) => sum + t.area, 0),
      byEvolutionStage: {}
    };

    territories.forEach(t => {
      stats.byEvolutionStage[t.evolutionStage] = 
        (stats.byEvolutionStage[t.evolutionStage] || 0) + 1;
    });

    res.json({ territories, stats });
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get territories in a specific area (for map view)
export const getTerritoriesInArea = async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;

    const territories = await Territory.find({
      status: 'active',
      'coordinates.0': {
        $elemMatch: {
          $gte: parseFloat(minLng),
          $lte: parseFloat(maxLng)
        }
      },
      'coordinates.1': {
        $elemMatch: {
          $gte: parseFloat(minLat),
          $lte: parseFloat(maxLat)
        }
      }
    })
    .populate('userId', 'username avatar')
    .limit(100);

    res.json({ territories });
  } catch (error) {
    console.error('Get territories in area error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upgrade territory
export const upgradeTerritory = async (req, res) => {
  try {
    const { territoryId } = req.params;
    const userId = req.user.id;

    const territory = await Territory.findById(territoryId);
    if (!territory || territory.userId.toString() !== userId) {
      return res.status(404).json({ message: 'Territory not found' });
    }

    if (territory.status !== 'active') {
      return res.status(400).json({ message: 'Cannot upgrade inactive territory' });
    }

    // Evolution stages: settlement -> village -> town -> city -> fortress -> castle
    const evolutionPath = ['settlement', 'village', 'town', 'city', 'fortress', 'castle'];
    const currentIndex = evolutionPath.indexOf(territory.evolutionStage);
    
    if (currentIndex === evolutionPath.length - 1) {
      return res.status(400).json({ message: 'Territory is already at max level' });
    }

    // Check if user has enough points/runs
    const runsInTerritory = await Run.countDocuments({
      userId,
      'route.coordinates': {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: territory.coordinates
          }
        }
      }
    });

    const requiredRuns = (currentIndex + 1) * 3; // 3, 6, 9, 12, 15 runs needed
    if (runsInTerritory < requiredRuns) {
      return res.status(400).json({ 
        message: `Need ${requiredRuns} runs in this territory to upgrade`,
        currentRuns: runsInTerritory
      });
    }

    territory.level += 1;
    territory.evolutionStage = evolutionPath[currentIndex + 1];
    territory.defenseBonus = (territory.defenseBonus || 1) * 1.2;
    await territory.save();

    res.json({ 
      message: 'Territory upgraded successfully',
      territory 
    });
  } catch (error) {
    console.error('Upgrade territory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Defend territory
export const defendTerritory = async (req, res) => {
  try {
    const { territoryId } = req.params;
    const userId = req.user.id;

    const territory = await Territory.findById(territoryId);
    if (!territory || territory.userId.toString() !== userId) {
      return res.status(404).json({ message: 'Territory not found' });
    }

    // Add defense shield (temporary boost)
    territory.defenseShield = true;
    territory.defenseShieldExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await territory.save();

    res.json({ 
      message: 'Territory defense activated',
      territory 
    });
  } catch (error) {
    console.error('Defend territory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get territory details
export const getTerritoryDetails = async (req, res) => {
  try {
    const { territoryId } = req.params;

    const territory = await Territory.findById(territoryId)
      .populate('userId', 'username avatar level')
      .populate('runId', 'distance duration pace createdAt');

    if (!territory) {
      return res.status(404).json({ message: 'Territory not found' });
    }

    // Get history of this territory
    const history = await Territory.find({
      $or: [
        { _id: territoryId },
        { capturedFrom: territory.userId, status: 'captured' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'username avatar');

    res.json({ territory, history });
  } catch (error) {
    console.error('Get territory details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete territory
export const deleteTerritory = async (req, res) => {
  try {
    const { territoryId } = req.params;
    const userId = req.user.id;

    const territory = await Territory.findById(territoryId);
    if (!territory || territory.userId.toString() !== userId) {
      return res.status(404).json({ message: 'Territory not found' });
    }

    await territory.deleteOne();

    res.json({ message: 'Territory deleted successfully' });
  } catch (error) {
    console.error('Delete territory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};