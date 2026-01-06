import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendVerificationCodeEmail(userEmail, userName, verificationCode) {
    const mailOptions = {
      from: `"Medivéra" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🔢 Verify Your Medivéra Account - 6 Digit Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .logo {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .logo-text {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .logo-subtext {
              font-size: 14px;
              opacity: 0.8;
            }
            .content {
              padding: 40px 30px;
              color: #333;
              line-height: 1.6;
              text-align: center;
            }
            .greeting {
              color: #667eea;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .verification-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 15px;
              margin: 30px 0;
              text-align: center;
            }
            .verification-code {
              font-size: 48px;
              font-weight: bold;
              letter-spacing: 15px;
              margin: 20px 0;
              font-family: monospace;
            }
            .instructions {
              font-size: 16px;
              margin-bottom: 20px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 10px;
              padding: 15px;
              margin-top: 30px;
              color: #856404;
              font-size: 14px;
              text-align: left;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              color: #6c757d;
              font-size: 12px;
              border-top: 1px solid #e9ecef;
            }
            .features {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin: 20px 0;
              justify-content: center;
            }
            .feature {
              flex: 1;
              min-width: 120px;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 8px;
              text-align: center;
              font-size: 12px;
              border: 1px solid #e9ecef;
            }
            .timer {
              font-size: 14px;
              color: #dc3545;
              font-weight: bold;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo">🏥💊</div>
              <div class="logo-text">Medivéra</div>
              <div class="logo-subtext">The Future of Human-Centered Healthcare</div>
            </div>
            
            <!-- Content -->
            <div class="content">
              <div class="greeting">Welcome, ${userName}! 👋</div>
              
              <p>Thank you for joining <strong>Medivéra</strong>! We're excited to have you on board.</p>
              
              <p class="instructions">To activate your account and unlock all features, please use the following 6-digit verification code:</p>
              
              <!-- Verification Code Display -->
              <div class="verification-box">
                <h3 style="margin: 0 0 20px 0; font-size: 18px;">Your Verification Code</h3>
                <div class="verification-code">
                  ${verificationCode}
                </div>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                  Enter this code in the verification form
                </p>
                <div class="timer">⏰ Expires in 15 minutes</div>
              </div>
              
              <!-- Features Preview -->
              <p><strong>Once verified, you'll get access to:</strong></p>
              <div class="features">
                <div class="feature">💬 AI Health Chatbot</div>
                <div class="feature">📊 Report Analyzer</div>
                <div class="feature">👁️ VisionCare+</div>
                <div class="feature">🏆 Achievements</div>
              </div>
              
              <!-- Warning -->
              <div class="warning">
                <strong>⚠️ Important:</strong> 
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This code is valid for <strong>15 minutes only</strong></li>
                  <li>If you didn't create this account, please ignore this email</li>
                  <li>For security, don't share this code with anyone</li>
                  <li>Check your spam folder if you don't see the email</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; font-style: italic;">
                Need help? Contact us at: ${process.env.SUPPORT_EMAIL || 'support@medivéra'}
              </p>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>This email was sent by Medivéra - Your partner in health and wellness.</p>
              <p>Created by <strong>Anurag & Arnav</strong></p>
              <p style="margin-top: 10px; font-size: 11px; color: #adb5bd;">
                © 2026 Medivéra. All rights reserved.<br>
                This is an automated email. Please do not reply directly to this message.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification code email sent to ${userEmail}`);
      return { success: true, verificationCode };
    } catch (error) {
      console.error('❌ Error sending verification code email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const mailOptions = {
      from: `"MedivéraI" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 Welcome to Medivéra - Email Verified!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              padding: 40px;
            }
            h1 { 
              color: #667eea; 
              text-align: center;
            }
            .feature {
              padding: 15px;
              margin: 10px 0;
              background: #f8f9fa;
              border-radius: 10px;
              border-left: 4px solid #667eea;
              transition: transform 0.3s;
            }
            .feature:hover {
              transform: translateX(10px);
            }
            .cta-button {
              display: block;
              width: 200px;
              margin: 30px auto;
              padding: 15px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 50px;
              text-align: center;
              font-weight: bold;
              font-size: 16px;
            }
            .cta-button:hover {
              transform: scale(1.05);
              box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Welcome to Medivéra, ${userName}!</h1>
            <p>Your email has been verified successfully! You're now ready to explore all our features:</p>
            
            <div class="feature">
              <strong>💬 AI Health Chatbot</strong><br>
              Get instant health advice 24/7 from our trained AI
            </div>
            
            <div class="feature">
              <strong>📊 Report Analyzer</strong><br>
              Upload and analyze medical reports with AI insights
            </div>
            
            <div class="feature">
              <strong>👁️ VisionCare+</strong><br>
              Medical image analysis and eye care recommendations
            </div>
            
            <div class="feature">
              <strong>🏆 Achievements System</strong><br>
              Unlock badges, earn points, and level up your health journey!
            </div>
            
            <div class="feature">
              <strong>📈 Health Dashboard</strong><br>
              Track your health metrics and progress over time
            </div>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="cta-button">
              🚀 Get Started Now
            </a>
            
            <p style="text-align: center; margin-top: 30px; color: #666;">
              We're excited to be part of your health journey! 💪
            </p>
            
            <div style="text-align: center; margin-top: 40px;">
              <p style="color: #999; font-size: 12px;">
                Created with by <strong>Anurag & Arnav</strong>
              </p>
              <p style="color: #999; font-size: 10px; margin-top: 5px;">
                © 2026 Medivéra
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
    }
  }
}

export default new EmailService();