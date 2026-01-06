// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import profileRoutes from './routes/profile.js';
import path from 'path';
import { fileURLToPath } from 'url';


// Import Routes
import authRoutes from './routes/auth.js';
import achievementRoutes from './routes/achievement.js';
import chatRoutes from './routes/chat.js';
import reportRoutes from './routes/report.js';
import visionRoutes from './routes/vision.js';
import runRoutes from './routes/run.js';
import territoryRoutes from './routes/territory.js';
import boostRoutes from './routes/boost.js';
import challengeRoutes from './routes/challenge.js';
import teamRoutes from './routes/team.js';
import leaderboardRoutes from './routes/leaderboard.js';
import customBadgeRoutes from './routes/customBadge.js';
import symptomCheckerRoutes from './routes/symptomChecker.js';

dotenv.config();

const app = express();

// 🔇 DISABLE MONGOOSE DEBUG LOGS
mongoose.set('debug', false);

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://medivera.onrender.com/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🔇 LOGGING MIDDLEWARE DISABLED - Comment out to hide request logs
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
//   next();
// });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/badges', customBadgeRoutes);
app.use('/api/symptom-checker', symptomCheckerRoutes);
app.use('/api/profile', profileRoutes); // ✅ FIXED: Changed from /api/auth/profile to /api/profile

// Runner/Running App Routes
app.use('/api/runs', runRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/boosts', boostRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    status: 'ok', 
    message: 'Runner App API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true,
    message: '🚀 Welcome to Runner App API',
    version: '1.0.0',
    description: 'A comprehensive running and fitness tracking application',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/profile',
        updateProfile: 'PUT /api/profile',
        changePassword: 'PUT /api/profile/change-password',
        uploadAvatar: 'POST /api/profile/avatar'
      },
      runs: {
        create: 'POST /api/runs',
        getAll: 'GET /api/runs',
        getById: 'GET /api/runs/:id',
        update: 'PUT /api/runs/:id',
        delete: 'DELETE /api/runs/:id'
      },
      teams: {
        create: 'POST /api/teams/create',
        myTeams: 'GET /api/teams/my-teams',
        allTeams: 'GET /api/teams/all',
        getTeam: 'GET /api/teams/:id',
        join: 'POST /api/teams/:id/join',
        joinByInvite: 'POST /api/teams/join/:inviteCode',
        leave: 'POST /api/teams/:id/leave',
        updateName: 'PUT /api/teams/:id/name',
        updateDescription: 'PUT /api/teams/:id/description',
        leaderboard: 'GET /api/teams/leaderboard'
      },
      leaderboard: 'GET /api/leaderboard',
      territories: 'GET /api/territories',
      challenges: 'GET /api/challenges',
      boosts: 'GET /api/boosts',
      achievements: 'GET /api/achievements'
    },
    documentation: 'Check API documentation for detailed endpoint information',
    note: 'All protected routes require Authorization header with Bearer token'
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    documentation: {
      authentication: {
        description: 'All protected endpoints require JWT token in Authorization header',
        header: 'Authorization: Bearer <your_jwt_token>'
      },
      error_responses: {
        format: '{ success: boolean, message: string, error?: any }',
        status_codes: {
          200: 'Success',
          201: 'Created',
          400: 'Bad Request',
          401: 'Unauthorized',
          403: 'Forbidden',
          404: 'Not Found',
          500: 'Internal Server Error'
        }
      },
      team_features: {
        create_team: 'Users can create multiple teams',
        join_team: 'Join public teams or private teams with invite code',
        invite_system: 'Each team has unique invite code for private teams',
        edit_team: 'Team captains can edit team name and description',
        remove_members: 'Team captains can remove members',
        leave_team: 'Members can leave teams, captains can transfer or delete'
      },
      profile_features: {
        get_profile: 'GET /api/profile - Get user profile',
        update_profile: 'PUT /api/profile - Update user info',
        change_password: 'PUT /api/profile/change-password - Change password',
        upload_avatar: 'POST /api/profile/avatar - Upload profile picture',
        get_stats: 'GET /api/profile/stats - Get user statistics'
      }
    }
  });
});

// Test endpoint for CORS and connectivity
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API test successful',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // 🔇 ERROR LOGS ONLY (Keep this for debugging)
  console.error('❌ Error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field} value`
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    suggestion: 'Check /api/health for API status or / for available endpoints'
  });
});


const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HealthSphere.AI Server running on port ${PORT}`);
  console.log(`👨‍💻 Created by Anurag & Arnav`);
  console.log(`📝 MongoDB Connected: ac-ap4jv39a-shard-00-00.m25lgcj.mongodb.net`);
});

