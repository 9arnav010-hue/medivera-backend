// backend/src/controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { initializeAchievements, checkAchievements } from './achievementController.js';
import emailService from '../services/emailService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        error: 'User already exists with this email. Please login instead.' 
      });
    }

    // Create user (not verified yet)
    const user = await User.create({
      name,
      email,
      password,
      age,
      gender,
      isVerified: false
    });

    // Generate verification code
    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Send verification email with code
    const emailSent = await emailService.sendVerificationCodeEmail(
      user.email,
      user.name,
      verificationCode
    );

    if (!emailSent.success) {
      console.error('Failed to send verification email:', emailSent.error);
      // Still continue with registration, but log the error
    }

    console.log(`📧 Verification email sent to: ${user.email}`);
    console.log(`🔢 Verification code: ${verificationCode} (expires in 15 minutes)`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the 6-digit verification code.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('Error in register:', error);
    
    // Handle duplicate email error (in case race condition)
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Email already registered. Please use a different email or try logging in.' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: messages 
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed. Please try again later.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Email and verification code are required' 
      });
    }

    // Validate code format (6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({ 
        error: 'Invalid code format. Please enter a 6-digit number.' 
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found with this email.' 
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ 
        error: 'Email is already verified. You can login now.' 
      });
    }

    // Check if verification code exists
    if (!user.verificationCode) {
      return res.status(400).json({ 
        error: 'No verification code found. Please request a new code.' 
      });
    }

    // Check verification code
    if (user.verificationCode !== code) {
      return res.status(400).json({ 
        error: 'Invalid verification code. Please check and try again.' 
      });
    }

    // Check if code expired
    if (!user.verificationCodeExpires || user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({ 
        error: 'Verification code has expired. Please request a new code.' 
      });
    }

    // Verify user
    user.isVerified = true;
    user.clearVerificationCode();
    await user.save();

    // Initialize achievements for verified user
    await initializeAchievements(user._id);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    console.log(`✅ Email verified for: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Error in verifyEmailCode:', error);
    res.status(500).json({ 
      error: 'Email verification failed. Please try again.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found with this email.' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        error: 'Email is already verified. You can login now.' 
      });
    }

    // Generate new verification code
    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Send verification email with code
    const emailSent = await emailService.sendVerificationCodeEmail(
      user.email,
      user.name,
      verificationCode
    );

    if (!emailSent.success) {
      console.error('Failed to resend verification email:', emailSent.error);
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
    }

    console.log(`📧 Verification code resent to: ${user.email}`);
    console.log(`🔢 New verification code: ${verificationCode} (expires in 15 minutes)`);

    res.json({
      success: true,
      message: 'New verification code sent! Please check your inbox.',
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Error in resendVerificationCode:', error);
    res.status(500).json({ 
      error: 'Failed to resend verification code. Please try again later.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      // Generate a new code if the old one expired
      if (!user.verificationCode || user.verificationCodeExpires < Date.now()) {
        const newCode = user.generateVerificationCode();
        await user.save();
        
        // Send new verification email
        await emailService.sendVerificationCodeEmail(
          user.email,
          user.name,
          newCode
        );
      }
      
      return res.status(403).json({ 
        error: 'Please verify your email before logging in. A new verification code has been sent to your email.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Update last active date and check streak
    const today = new Date().setHours(0, 0, 0, 0);
    const lastActive = new Date(user.stats.lastActiveDate).setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      user.stats.streak += 1;
      console.log(`📈 Streak updated for ${user.email}: ${user.stats.streak} days`);
    } else if (daysDiff > 1) {
      user.stats.streak = 1;
      console.log(`🔄 Streak reset for ${user.email}`);
    }
    
    user.stats.lastActiveDate = new Date();
    await user.save();

    // Check streak achievements
    await checkAchievements(user._id, 'streak', user.stats.streak);

    // Generate token
    const token = generateToken(user._id);

    console.log(`✅ Login successful for: ${user.email}`);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        stats: user.stats,
        isVerified: user.isVerified
      },
      token
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again later.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -verificationCode -verificationCodeExpires');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optional: Add a check verification status endpoint
export const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    const user = await User.findOne({ email }).select('isVerified verificationCodeExpires');

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const hasExpiredCode = user.verificationCodeExpires && user.verificationCodeExpires < Date.now();

    res.json({
      success: true,
      isVerified: user.isVerified,
      hasExpiredCode,
      canResend: !user.isVerified && hasExpiredCode
    });
  } catch (error) {
    console.error('Error in checkVerificationStatus:', error);
    res.status(500).json({ 
      error: 'Failed to check verification status',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};