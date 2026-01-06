import express from 'express';
import {
  createTeam,
  getUserTeams,
  getAllTeams,
  getTeamById,
  getTeamByInviteCode,
  joinTeam,
  joinTeamByIdOrCode,  // NEW: Import the new function
  leaveTeam,
  updateTeamName,
  updateTeamDescription,
  updateTeamSettings,
  removeMember,
  updateMemberContributionAPI,
  getTeamLeaderboard,
  transferCaptaincy,
  regenerateInviteCode,
  getTeamInviteInfo,
  deleteTeam
} from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Team creation and management
router.post('/create', createTeam);
router.get('/my-teams', getUserTeams);
router.get('/all', getAllTeams);
router.get('/leaderboard', getTeamLeaderboard);

// Team operations by ID
router.get('/:id', getTeamById);
router.post('/:id/join', joinTeam);  // This is for joining by clicking "Join Team" button
router.post('/:id/leave', leaveTeam);
router.put('/:id/name', updateTeamName);
router.put('/:id/description', updateTeamDescription);
router.put('/:id/settings', updateTeamSettings);
router.post('/:id/remove-member', removeMember);
router.post('/:id/transfer-captaincy', transferCaptaincy);
router.post('/:id/regenerate-invite', regenerateInviteCode);
router.get('/:id/invite-info', getTeamInviteInfo);
router.delete('/:id', deleteTeam);

// UNIVERSAL JOIN ENDPOINT - accepts both Team ID and invite code
router.post('/join/:teamIdOrCode', joinTeamByIdOrCode);  // CHANGED: Use the new universal function

// Invite code operations (still keep for backward compatibility)
router.get('/invite/:inviteCode', getTeamByInviteCode);

// Contribution updates (called from run completion)
router.post('/update-contribution', updateMemberContributionAPI);

export default router;