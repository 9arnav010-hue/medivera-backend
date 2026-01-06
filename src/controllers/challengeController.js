// backend/src/controllers/challengeController.js
import Challenge from '../models/Challenge.js';
import User from '../models/User.js';
import Run from '../models/Run.js';

// Create a new challenge
export const createChallenge = async (req, res) => {
  try {
    const { type, title, description, goal, duration, difficulty, rewards } = req.body;
    const creatorId = req.user.id;

    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000); // duration in days

    const challenge = new Challenge({
      type,
      title,
      description,
      goal,
      expiresAt,
      difficulty: difficulty || 'medium',
      rewards: rewards || { points: 100, badge: null },
      createdBy: creatorId,
      status: 'active'
    });

    await challenge.save();

    res.status(201).json({
      message: 'Challenge created successfully',
      challenge
    });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active challenges
export const getActiveChallenges = async (req, res) => {
  try {
    const { difficulty, type } = req.query;
    const userId = req.user.id;

    const filter = {
      status: 'active',
      expiresAt: { $gt: new Date() }
    };

    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;

    const challenges = await Challenge.find(filter)
      .sort({ createdAt: -1 })
      .limit(20);

    // Check which challenges user has joined
    const user = await User.findById(userId);
    const joinedChallenges = user.activeChallenges || [];

    const enrichedChallenges = challenges.map(challenge => ({
      ...challenge.toObject(),
      isJoined: joinedChallenges.some(c => c.challengeId.toString() === challenge._id.toString()),
      participantCount: challenge.participants.length
    }));

    res.json({ challenges: enrichedChallenges });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join a challenge
export const joinChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.status !== 'active') {
      return res.status(400).json({ message: 'Challenge is not active' });
    }

    if (new Date() > challenge.expiresAt) {
      return res.status(400).json({ message: 'Challenge has expired' });
    }

    // Check if already joined
    const alreadyJoined = challenge.participants.some(
      p => p.userId.toString() === userId
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: 'Already joined this challenge' });
    }

    // Add user to participants
    challenge.participants.push({
      userId,
      progress: 0,
      completedAt: null
    });
    await challenge.save();

    // Add challenge to user's active challenges
    const user = await User.findById(userId);
    if (!user.activeChallenges) user.activeChallenges = [];
    
    user.activeChallenges.push({
      challengeId: challenge._id,
      joinedAt: new Date(),
      progress: 0
    });
    await user.save();

    res.json({
      message: 'Successfully joined challenge',
      challenge
    });
  } catch (error) {
    console.error('Join challenge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update challenge progress
export const updateChallengeProgress = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { progress } = req.body;
    const userId = req.user.id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    // Find participant
    const participant = challenge.participants.find(
      p => p.userId.toString() === userId
    );

    if (!participant) {
      return res.status(400).json({ message: 'You have not joined this challenge' });
    }

    // Update progress
    participant.progress = progress;

    // Check if completed
    if (progress >= challenge.goal.value) {
      participant.completedAt = new Date();
      challenge.completedBy.push(userId);

      // Award rewards
      const user = await User.findById(userId);
      user.points = (user.points || 0) + (challenge.rewards.points || 0);
      
      if (challenge.rewards.badge) {
        if (!user.badges) user.badges = [];
        user.badges.push({
          name: challenge.rewards.badge,
          earnedAt: new Date(),
          challengeId: challenge._id
        });
      }
      
      await user.save();
    }

    await challenge.save();

    res.json({
      message: 'Progress updated',
      challenge,
      completed: participant.completedAt !== null
    });
  } catch (error) {
    console.error('Update challenge progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's challenges
export const getUserChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'active' } = req.query;

    const user = await User.findById(userId).populate('activeChallenges.challengeId');
    
    let challenges = user.activeChallenges || [];

    if (status === 'completed') {
      challenges = challenges.filter(c => c.progress >= c.challengeId.goal.value);
    } else if (status === 'active') {
      challenges = challenges.filter(c => c.progress < c.challengeId.goal.value);
    }

    res.json({ challenges });
  } catch (error) {
    console.error('Get user challenges error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate AI-powered personal challenges
export const generatePersonalChallenges = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's running history
    const runs = await Run.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    if (runs.length < 3) {
      return res.status(400).json({ 
        message: 'Need at least 3 runs to generate personalized challenges' 
      });
    }

    // Calculate user stats
    const avgDistance = runs.reduce((sum, r) => sum + r.distance, 0) / runs.length;
    const avgPace = runs.reduce((sum, r) => sum + r.pace, 0) / runs.length;

    // Generate personalized challenges
    const personalChallenges = [];

    // Distance challenge
    if (avgDistance > 0) {
      personalChallenges.push({
        type: 'distance',
        title: 'Beat Your Average',
        description: `Run ${(avgDistance * 1.2).toFixed(2)}km in a single run`,
        goal: { type: 'distance', value: avgDistance * 1.2, unit: 'km' },
        difficulty: 'medium',
        rewards: { points: 150, badge: 'Distance Destroyer' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: 'system',
        status: 'active',
        isPersonal: true,
        personalFor: userId
      });
    }

    // Pace challenge
    if (avgPace > 0) {
      personalChallenges.push({
        type: 'pace',
        title: 'Speed Improvement',
        description: `Maintain a pace of ${(avgPace * 0.9).toFixed(2)} min/km`,
        goal: { type: 'pace', value: avgPace * 0.9, unit: 'min/km' },
        difficulty: 'hard',
        rewards: { points: 200, badge: 'Speed Demon' },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: 'system',
        status: 'active',
        isPersonal: true,
        personalFor: userId
      });
    }

    // Consistency challenge
    personalChallenges.push({
      type: 'consistency',
      title: 'Week Warrior',
      description: 'Run 5 times this week',
      goal: { type: 'runs', value: 5, unit: 'runs' },
      difficulty: 'medium',
      rewards: { points: 250, badge: 'Consistent Runner' },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: 'system',
      status: 'active',
      isPersonal: true,
      personalFor: userId
    });

    // Save challenges
    const savedChallenges = await Challenge.insertMany(personalChallenges);

    res.json({
      message: 'Personal challenges generated',
      challenges: savedChallenges
    });
  } catch (error) {
    console.error('Generate personal challenges error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get challenge leaderboard
export const getChallengeLeaderboard = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await Challenge.findById(challengeId)
      .populate('participants.userId', 'username avatar level');

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    // Sort participants by progress
    const leaderboard = challenge.participants
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 50)
      .map((p, index) => ({
        rank: index + 1,
        user: p.userId,
        progress: p.progress,
        completed: p.completedAt !== null,
        completedAt: p.completedAt
      }));

    res.json({
      challenge: {
        title: challenge.title,
        goal: challenge.goal,
        expiresAt: challenge.expiresAt
      },
      leaderboard
    });
  } catch (error) {
    console.error('Get challenge leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave challenge
export const leaveChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    // Remove from participants
    challenge.participants = challenge.participants.filter(
      p => p.userId.toString() !== userId
    );
    await challenge.save();

    // Remove from user's active challenges
    const user = await User.findById(userId);
    user.activeChallenges = (user.activeChallenges || []).filter(
      c => c.challengeId.toString() !== challengeId
    );
    await user.save();

    res.json({ message: 'Left challenge successfully' });
  } catch (error) {
    console.error('Leave challenge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};