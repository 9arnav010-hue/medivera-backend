// backend/src/controllers/boostController.js
import Boost from '../models/Boost.js';
import User from '../models/User.js';

// Get active boosts in an area
export const getActiveBoosts = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters

    const boosts = await Boost.find({
      status: 'active',
      expiresAt: { $gt: new Date() },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    }).limit(20);

    res.json({ boosts });
  } catch (error) {
    console.error('Get active boosts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new boost (admin or special event)
export const createBoost = async (req, res) => {
  try {
    const { type, name, description, location, radius, multiplier, duration, rarity } = req.body;

    const expiresAt = new Date(Date.now() + duration * 60 * 1000); // duration in minutes

    const boost = new Boost({
      type,
      name,
      description,
      location: {
        type: 'Point',
        coordinates: location.coordinates
      },
      radius,
      multiplier,
      expiresAt,
      rarity: rarity || 'common',
      status: 'active'
    });

    await boost.save();

    res.status(201).json({
      message: 'Boost created successfully',
      boost
    });
  } catch (error) {
    console.error('Create boost error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Activate a boost for user
export const activateBoost = async (req, res) => {
  try {
    const { boostId } = req.params;
    const userId = req.user.id;

    const boost = await Boost.findById(boostId);
    if (!boost) {
      return res.status(404).json({ message: 'Boost not found' });
    }

    if (boost.status !== 'active') {
      return res.status(400).json({ message: 'Boost is not active' });
    }

    if (new Date() > boost.expiresAt) {
      boost.status = 'expired';
      await boost.save();
      return res.status(400).json({ message: 'Boost has expired' });
    }

    // Check if user already activated this boost
    if (boost.activatedBy.includes(userId)) {
      return res.status(400).json({ message: 'You have already activated this boost' });
    }

    // Add user to activated list
    boost.activatedBy.push(userId);
    boost.activationCount += 1;
    await boost.save();

    // Add boost to user's active boosts
    const user = await User.findById(userId);
    if (!user.activeBoosts) user.activeBoosts = [];
    
    user.activeBoosts.push({
      boostId: boost._id,
      type: boost.type,
      multiplier: boost.multiplier,
      expiresAt: boost.expiresAt
    });
    
    await user.save();

    res.json({
      message: 'Boost activated successfully',
      boost,
      activeBoosts: user.activeBoosts
    });
  } catch (error) {
    console.error('Activate boost error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's active boosts
export const getUserBoosts = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user.activeBoosts) {
      return res.json({ activeBoosts: [] });
    }

    // Filter out expired boosts
    const activeBoosts = user.activeBoosts.filter(
      boost => new Date(boost.expiresAt) > new Date()
    );

    // Update user if boosts were filtered
    if (activeBoosts.length !== user.activeBoosts.length) {
      user.activeBoosts = activeBoosts;
      await user.save();
    }

    // Get full boost details
    const boostDetails = await Boost.find({
      _id: { $in: activeBoosts.map(b => b.boostId) }
    });

    res.json({ activeBoosts: boostDetails });
  } catch (error) {
    console.error('Get user boosts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate random boosts (called periodically by cron job)
export const generateRandomBoosts = async (req, res) => {
  try {
    // Define boost types and their properties
    const boostTypes = [
      {
        type: 'territory',
        name: 'Territory Expansion',
        description: 'Double your territory capture rate',
        multiplier: 2,
        rarity: 'common',
        duration: 30
      },
      {
        type: 'speed',
        name: 'Speed Demon',
        description: 'Bonus points for faster pace',
        multiplier: 1.5,
        rarity: 'common',
        duration: 20
      },
      {
        type: 'points',
        name: 'Point Multiplier',
        description: 'Triple points for this run',
        multiplier: 3,
        rarity: 'rare',
        duration: 45
      },
      {
        type: 'defense',
        name: 'Fortress Shield',
        description: 'Protect your territories from capture',
        multiplier: 2,
        rarity: 'epic',
        duration: 60
      },
      {
        type: 'distance',
        name: 'Marathon Master',
        description: 'Extra points for longer runs',
        multiplier: 2.5,
        rarity: 'rare',
        duration: 40
      }
    ];

    // Generate 5-10 random boosts in different locations
    const numberOfBoosts = Math.floor(Math.random() * 6) + 5;
    const newBoosts = [];

    for (let i = 0; i < numberOfBoosts; i++) {
      const boostTemplate = boostTypes[Math.floor(Math.random() * boostTypes.length)];
      
      // Generate random location (you might want to use actual city coordinates)
      const lat = (Math.random() * 180) - 90;
      const lng = (Math.random() * 360) - 180;

      const boost = new Boost({
        ...boostTemplate,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        radius: Math.floor(Math.random() * 3000) + 1000, // 1-4km radius
        expiresAt: new Date(Date.now() + boostTemplate.duration * 60 * 1000),
        status: 'active'
      });

      await boost.save();
      newBoosts.push(boost);
    }

    res.json({
      message: `${numberOfBoosts} boosts generated successfully`,
      boosts: newBoosts
    });
  } catch (error) {
    console.error('Generate random boosts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clean up expired boosts
export const cleanupExpiredBoosts = async (req, res) => {
  try {
    const result = await Boost.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );

    res.json({
      message: 'Expired boosts cleaned up',
      updated: result.modifiedCount
    });
  } catch (error) {
    console.error('Cleanup boosts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get boost statistics
export const getBoostStats = async (req, res) => {
  try {
    const totalActive = await Boost.countDocuments({ status: 'active' });
    const totalExpired = await Boost.countDocuments({ status: 'expired' });
    
    const topBoosts = await Boost.find({ status: 'active' })
      .sort({ activationCount: -1 })
      .limit(5)
      .select('name type activationCount rarity');

    const boostsByType = await Boost.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      totalActive,
      totalExpired,
      topBoosts,
      boostsByType
    });
  } catch (error) {
    console.error('Get boost stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};