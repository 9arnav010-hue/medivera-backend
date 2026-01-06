import Team from '../models/Team.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { checkAchievements } from './achievementController.js';

// Create a new team
export const createTeam = async (req, res) => {
  try {
    const { name, description, maxMembers = 10, isPublic = true, tags, location } = req.body;
    const userId = req.user._id;

    // Check if team name already exists
    const existingTeamName = await Team.findOne({ name });
    if (existingTeamName) {
      return res.status(400).json({
        success: false,
        message: 'Team name already taken'
      });
    }

    // Get user stats to initialize their contribution
    const user = await User.findById(userId).select('username name email avatar totalDistance points totalRuns level');

    // Create team with initial member (captain)
    const teamData = {
      name,
      description,
      captain: userId,
      maxMembers,
      isPublic,
      totalDistance: user?.totalDistance || 0,
      totalPoints: user?.points || 0,
      totalRuns: user?.totalRuns || 0
    };

    // Add optional fields if provided
    if (tags && Array.isArray(tags)) {
      teamData.tags = tags.slice(0, 10);
    }

    if (location) {
      teamData.location = location;
    }

    const team = new Team(teamData);
    await team.save();
    
    // Populate team data
    await team.populate('captain', 'username name email avatar level totalDistance points totalRuns');
    await team.populate('members.user', 'username name email avatar level totalDistance points totalRuns');

    // ✅ CHECK ACHIEVEMENT: Team Captain (created first team)
    await checkAchievements(userId, 'team', 1);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: error.message.includes('validation') ? error.message : 'Server error'
    });
  }
};

// Get user's teams with detailed information
export const getUserTeams = async (req, res) => {
  try {
    const userId = req.user._id;

    const teams = await Team.find({ 'members.user': userId })
      .populate('captain', 'username name email avatar level')
      .populate('members.user', 'username name email avatar level')
      .select('-__v')
      .sort('-lastActivity')
      .lean();

    // Add virtual fields manually for lean queries
    const teamsWithVirtuals = teams.map(team => ({
      ...team,
      memberCount: team.members.length,
      averageDistancePerMember: team.members.length > 0 ? team.totalDistance / team.members.length : 0,
      averagePointsPerMember: team.members.length > 0 ? team.totalPoints / team.members.length : 0
    }));

    res.json({
      success: true,
      teams: teamsWithVirtuals,
      count: teamsWithVirtuals.length
    });
  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all public teams with filters
export const getAllTeams = async (req, res) => {
  try {
    const { 
      search, 
      sortBy = 'totalPoints', 
      limit = 50,
      page = 1,
      minMembers,
      maxMembers,
      tags,
      location
    } = req.query;

    const filter = { isPublic: true };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (minMembers) {
      filter['members.0'] = { $exists: true };
    }

    if (maxMembers) {
      filter.maxMembers = { $lte: parseInt(maxMembers) };
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    if (location) {
      filter['location.city'] = new RegExp(location, 'i');
    }

    const sortOptions = {};
    const validSortFields = ['totalPoints', 'totalDistance', 'totalRuns', 'createdAt', 'lastActivity', 'rank'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = -1;
    } else {
      sortOptions.totalPoints = -1;
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .populate('captain', 'username name email avatar')
        .populate('members.user', 'username name email avatar')
        .select('-__v')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Team.countDocuments(filter)
    ]);

    const teamsWithVirtuals = teams.map(team => ({
      ...team,
      memberCount: team.members.length,
      averageDistancePerMember: team.members.length > 0 ? team.totalDistance / team.members.length : 0,
      averagePointsPerMember: team.members.length > 0 ? team.totalPoints / team.members.length : 0
    }));

    res.json({
      success: true,
      teams: teamsWithVirtuals,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get team by ID
export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('captain', 'username name email avatar level totalDistance points totalRuns')
      .populate('members.user', 'username name email avatar level totalDistance points totalRuns');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get team by invite code
export const getTeamByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const team = await Team.findOne({ inviteCode })
      .populate('captain', 'username name email avatar level')
      .populate('members.user', 'username name email avatar level');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get team by invite code error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Join a team by ID
export const joinTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Team is full'
      });
    }

    // Check if user is already a member
    const isMember = team.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // For private teams, check if user has permission
    if (!team.isPublic && !req.query.inviteCode) {
      return res.status(403).json({
        success: false,
        message: 'This is a private team. You need an invite code to join.'
      });
    }

    // Get user stats for initial contribution
    const user = await User.findById(userId).select('totalDistance points totalRuns');

    // Add user to team with their current stats
    team.members.push({
      user: userId,
      joinedAt: Date.now(),
      contribution: {
        distance: user?.totalDistance || 0,
        points: user?.points || 0,
        runs: user?.totalRuns || 0
      }
    });

    // Update team totals with new member's existing stats
    team.totalDistance += user?.totalDistance || 0;
    team.totalPoints += user?.points || 0;
    team.totalRuns += user?.totalRuns || 0;

    await team.save();
    await team.populate('captain', 'username name email avatar');
    await team.populate('members.user', 'username name email avatar level totalDistance points totalRuns');

    // ✅ CHECK ACHIEVEMENT: Count total teams user is in
    const totalTeams = await Team.countDocuments({ 'members.user': userId });
    await checkAchievements(userId, 'team', totalTeams);

    res.json({
      success: true,
      message: 'Successfully joined team',
      team
    });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Join a team by invite code
export const joinTeamByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user._id;

    const team = await Team.findOne({ inviteCode });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite code or team not found'
      });
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Team is full'
      });
    }

    // Check if user is already a member
    const isMember = team.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // Get user stats for initial contribution
    const user = await User.findById(userId).select('totalDistance points totalRuns');

    // Add user to team with their current stats
    team.members.push({
      user: userId,
      joinedAt: Date.now(),
      contribution: {
        distance: user?.totalDistance || 0,
        points: user?.points || 0,
        runs: user?.totalRuns || 0
      }
    });

    // Update team totals with new member's existing stats
    team.totalDistance += user?.totalDistance || 0;
    team.totalPoints += user?.points || 0;
    team.totalRuns += user?.totalRuns || 0;

    await team.save();
    await team.populate('captain', 'username name email avatar');
    await team.populate('members.user', 'username name email avatar level totalDistance points totalRuns');

    // ✅ CHECK ACHIEVEMENT
    const totalTeams = await Team.countDocuments({ 'members.user': userId });
    await checkAchievements(userId, 'team', totalTeams);

    res.json({
      success: true,
      message: 'Successfully joined team using invite code',
      team
    });
  } catch (error) {
    console.error('Join team by invite code error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW FUNCTION: Join team by ID OR invite code (universal join)
export const joinTeamByIdOrCode = async (req, res) => {
  try {
    const { teamIdOrCode } = req.params;
    const userId = req.user._id;

    let team;
    
    console.log('Attempting to join with:', teamIdOrCode);
    
    // First try to find by Team ID (ObjectId)
    if (mongoose.Types.ObjectId.isValid(teamIdOrCode)) {
      console.log('Looking for team by ID:', teamIdOrCode);
      team = await Team.findById(teamIdOrCode);
    }
    
    // If not found by ID, try to find by invite code
    if (!team) {
      console.log('Looking for team by invite code:', teamIdOrCode);
      team = await Team.findOne({ inviteCode: teamIdOrCode });
    }
    
    // If still not found, return error
    if (!team) {
      console.log('Team not found with ID or code:', teamIdOrCode);
      return res.status(404).json({
        success: false,
        message: 'Team not found. Please check the Team ID and try again.'
      });
    }

    console.log('Found team:', team.name, 'ID:', team._id);

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Team is full'
      });
    }

    // Check if user is already a member
    const isMember = team.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // For private teams, allow joining only if:
    // 1. Team is public, OR
    // 2. User has the exact Team ID (ObjectId), OR
    // 3. User has the correct invite code
    if (!team.isPublic) {
      // If user provided ObjectId (Team ID), allow join
      if (mongoose.Types.ObjectId.isValid(teamIdOrCode) && team._id.toString() === teamIdOrCode) {
        console.log('Private team join allowed with Team ID');
      } 
      // If user provided invite code, check if it matches
      else if (team.inviteCode === teamIdOrCode) {
        console.log('Private team join allowed with invite code');
      }
      else {
        return res.status(403).json({
          success: false,
          message: 'This is a private team. You need the exact Team ID to join.'
        });
      }
    }

    // Get user stats for initial contribution
    const user = await User.findById(userId).select('totalDistance points totalRuns');
    console.log('User stats:', user);

    // Add user to team with their current stats
    team.members.push({
      user: userId,
      joinedAt: Date.now(),
      contribution: {
        distance: user?.totalDistance || 0,
        points: user?.points || 0,
        runs: user?.totalRuns || 0
      }
    });

    // Update team totals with new member's existing stats
    team.totalDistance += user?.totalDistance || 0;
    team.totalPoints += user?.points || 0;
    team.totalRuns += user?.totalRuns || 0;

    await team.save();
    await team.populate('captain', 'username name email avatar');
    await team.populate('members.user', 'username name email avatar level totalDistance points totalRuns');

    console.log('Successfully joined team:', team.name);

    // ✅ CHECK ACHIEVEMENT
    const totalTeams = await Team.countDocuments({ 'members.user': userId });
    await checkAchievements(userId, 'team', totalTeams);

    res.json({
      success: true,
      message: 'Successfully joined team!',
      team
    });
  } catch (error) {
    console.error('Join team by ID or code error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Leave a team
export const leaveTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is a member
    const isMember = team.members.some(m => m.user.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }

    // Check if user is captain
    if (team.captain.toString() === userId.toString()) {
      // Captain wants to leave
      if (team.members.length > 1) {
        // Transfer captaincy to another member
        const nextMember = team.members.find(m => m.user.toString() !== userId.toString());
        if (nextMember) {
          team.captain = nextMember.user;
          
          // Find member's contribution before removing
          const member = team.members.find(m => m.user.toString() === userId.toString());
          
          if (member) {
            // Subtract member's contribution from team totals
            team.totalDistance = Math.max(0, team.totalDistance - member.contribution.distance);
            team.totalPoints = Math.max(0, team.totalPoints - member.contribution.points);
            team.totalRuns = Math.max(0, team.totalRuns - member.contribution.runs);
          }

          // Remove captain from members list
          team.members = team.members.filter(m => m.user.toString() !== userId.toString());
          
          await team.save();
          return res.json({
            success: true,
            message: 'Left team and transferred captaincy'
          });
        }
      } else {
        // Delete team if captain is the only member
        await Team.findByIdAndDelete(teamId);
        return res.json({
          success: true,
          message: 'Team deleted as you were the only member'
        });
      }
    } else {
      // Regular member wants to leave
      // Find member's contribution before removing
      const member = team.members.find(m => m.user.toString() === userId.toString());
      
      if (member) {
        // Subtract member's contribution from team totals
        team.totalDistance = Math.max(0, team.totalDistance - member.contribution.distance);
        team.totalPoints = Math.max(0, team.totalPoints - member.contribution.points);
        team.totalRuns = Math.max(0, team.totalRuns - member.contribution.runs);
      }

      // Remove user from members
      team.members = team.members.filter(m => m.user.toString() !== userId.toString());
      await team.save();
    }

    res.json({
      success: true,
      message: 'Left team successfully'
    });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update team name (captain only)
export const updateTeamName = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;
    const { name } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can update team name'
      });
    }

    // Check if name is already taken
    const existingTeam = await Team.findOne({ name, _id: { $ne: teamId } });
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'Team name already taken'
      });
    }

    team.name = name;
    await team.save();

    res.json({
      success: true,
      message: 'Team name updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team name error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update team description (captain only)
export const updateTeamDescription = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;
    const { description } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can update team description'
      });
    }

    team.description = description;
    await team.save();

    res.json({
      success: true,
      message: 'Team description updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team description error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update team settings (captain only)
export const updateTeamSettings = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;
    const { maxMembers, isPublic } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can update team settings'
      });
    }

    if (maxMembers !== undefined) {
      if (maxMembers < team.members.length) {
        return res.status(400).json({
          success: false,
          message: `Cannot set max members to less than current member count (${team.members.length})`
        });
      }
      team.maxMembers = maxMembers;
    }

    if (isPublic !== undefined) {
      team.isPublic = isPublic;
    }

    await team.save();

    res.json({
      success: true,
      message: 'Team settings updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove member from team (captain only)
export const removeMember = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;
    const { memberId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can remove members'
      });
    }

    // Check if trying to remove self
    if (memberId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove yourself as captain. Use leave team instead.'
      });
    }

    // Check if member exists in team
    const member = team.members.find(m => m.user.toString() === memberId.toString());
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in team'
      });
    }

    // Subtract member's contribution from team totals
    team.totalDistance = Math.max(0, team.totalDistance - member.contribution.distance);
    team.totalPoints = Math.max(0, team.totalPoints - member.contribution.points);
    team.totalRuns = Math.max(0, team.totalRuns - member.contribution.runs);

    // Remove member from team
    team.members = team.members.filter(m => m.user.toString() !== memberId.toString());
    await team.save();

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update member contribution (called after each run)
export const updateMemberContribution = async (userId, distance, points, runs = 1) => {
  try {
    // Find teams user is a member of
    const teams = await Team.find({ 'members.user': userId });

    for (const team of teams) {
      const memberIndex = team.members.findIndex(m => m.user.toString() === userId.toString());
      
      if (memberIndex !== -1) {
        // Update member's contribution
        team.members[memberIndex].contribution.distance += distance;
        team.members[memberIndex].contribution.points += points;
        team.members[memberIndex].contribution.runs += runs;

        // Update team totals
        team.totalDistance += distance;
        team.totalPoints += points;
        team.totalRuns += runs;

        await team.save();
      }
    }

    // ✅ CHECK ACHIEVEMENT: Team contribution achievements
    if (teams.length > 0) {
      // Get total contribution across all teams
      let totalContribution = 0;
      for (const team of teams) {
        const member = team.members.find(m => m.user.toString() === userId.toString());
        if (member) {
          totalContribution += member.contribution.distance;
        }
      }
      await checkAchievements(userId, 'team', totalContribution);
    }

    return { success: true, message: 'Contribution updated' };
  } catch (error) {
    console.error('Update contribution error:', error);
    return { success: false, error: error.message };
  }
};

// API endpoint for updating contribution (called from run completion)
export const updateMemberContributionAPI = async (req, res) => {
  try {
    const { userId, distance, points, runs = 1 } = req.body;

    const result = await updateMemberContribution(userId, distance, points, runs);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Update contribution API error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get team leaderboard
export const getTeamLeaderboard = async (req, res) => {
  try {
    const { limit = 100, sortBy = 'totalPoints' } = req.query;

    const sortOptions = {};
    sortOptions[sortBy] = -1;

    const teams = await Team.find()
      .populate('captain', 'username avatar name')
      .sort(sortOptions)
      .limit(parseInt(limit));

    // Add ranks and format response
    const teamsWithRank = teams.map((team, index) => ({
      rank: index + 1,
      _id: team._id,
      name: team.name,
      description: team.description,
      points: team.totalPoints,
      totalDistance: team.totalDistance,
      totalRuns: team.totalRuns,
      memberCount: team.members.length,
      maxMembers: team.maxMembers,
      isPublic: team.isPublic,
      captain: {
        _id: team.captain._id,
        username: team.captain.username || team.captain.name,
        avatar: team.captain.avatar,
        name: team.captain.name
      },
      createdAt: team.createdAt
    }));

    res.json({
      success: true,
      leaderboard: teamsWithRank
    });
  } catch (error) {
    console.error('Get team leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Transfer captaincy (captain only)
export const transferCaptaincy = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;
    const { newCaptainId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if current user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can transfer captaincy'
      });
    }

    // Check if new captain is a member of the team
    const newCaptainIsMember = team.members.some(m => m.user.toString() === newCaptainId.toString());
    if (!newCaptainIsMember) {
      return res.status(400).json({
        success: false,
        message: 'New captain must be a member of the team'
      });
    }

    // Transfer captaincy
    team.captain = newCaptainId;
    await team.save();

    res.json({
      success: true,
      message: 'Captaincy transferred successfully',
      team
    });
  } catch (error) {
    console.error('Transfer captaincy error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Regenerate invite code (captain only)
export const regenerateInviteCode = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can regenerate invite code'
      });
    }

    // Regenerate invite code
    const newInviteCode = await team.regenerateInviteCode();

    res.json({
      success: true,
      message: 'Invite code regenerated successfully',
      inviteCode: newInviteCode
    });
  } catch (error) {
    console.error('Regenerate invite code error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get team invite info
export const getTeamInviteInfo = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;

    const team = await Team.findById(teamId).select('name description inviteCode isPublic captain');
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain or member
    const isCaptain = team.captain.toString() === userId.toString();
    const isMember = await Team.findOne({ 
      _id: teamId,
      'members.user': userId 
    });

    if (!isCaptain && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view invite info'
      });
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join-team/${team.inviteCode}`;

    res.json({
      success: true,
      team: {
        name: team.name,
        description: team.description,
        inviteCode: team.inviteCode,
        isPublic: team.isPublic,
        inviteLink
      }
    });
  } catch (error) {
    console.error('Get team invite info error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete team (captain only)
export const deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user._id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is captain
    if (team.captain.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only captain can delete the team'
      });
    }

    await Team.findByIdAndDelete(teamId);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};