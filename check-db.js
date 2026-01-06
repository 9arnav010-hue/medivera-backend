import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Achievement from './src/models/Achievement.js';

dotenv.config();

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check users
    const users = await User.find().select('name email stats');
    console.log(`👥 Total Users: ${users.length}\n`);

    for (const user of users) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Level: ${user.stats.level} | XP: ${user.stats.totalXP}`);
      console.log(`   Chats: ${user.stats.totalChats}`);
      console.log(`   Reports: ${user.stats.totalReports}`);
      console.log(`   Vision: ${user.stats.totalVisionAnalysis}`);
      console.log(`   Streak: ${user.stats.streak} days`);
      
      // Check achievements
      const achievements = await Achievement.find({ user: user._id });
      const completed = achievements.filter(a => a.completed).length;
      
      console.log(`\n   🏆 Achievements: ${completed}/${achievements.length} completed`);
      
      if (completed > 0) {
        console.log(`   Unlocked:`);
        achievements.filter(a => a.completed).forEach(a => {
          console.log(`     ✅ ${a.icon} ${a.title} (+${a.reward.xp} XP)`);
        });
      }
      
      if (achievements.length === 0) {
        console.log(`   ⚠️ WARNING: No achievements found for this user!`);
      }
      
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Summary
    const totalAchievements = await Achievement.countDocuments();
    const completedAchievements = await Achievement.countDocuments({ completed: true });
    
    console.log(`📊 Database Summary:`);
    console.log(`   Total Achievements: ${totalAchievements}`);
    console.log(`   Completed: ${completedAchievements}`);
    console.log(`   Incomplete: ${totalAchievements - completedAchievements}`);
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkDatabase();