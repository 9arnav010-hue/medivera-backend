import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token has expired' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};

// Optional: Admin middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as admin'
    });
  }
};

// Optional: Captain middleware (specific to team operations)
export const captain = (req, res, next) => {
  // This middleware should be used after checking team ownership
  // It assumes team is already populated in req.team
  if (req.team && req.team.captain.toString() === req.user._id.toString()) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Only team captain can perform this action'
    });
  }
};

// Optional: Team member middleware
export const teamMember = (req, res, next) => {
  // This middleware should be used after checking team membership
  // It assumes team is already populated in req.team
  if (req.team && req.team.members.some(m => m.user.toString() === req.user._id.toString())) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'You must be a team member to perform this action'
    });
  }
};