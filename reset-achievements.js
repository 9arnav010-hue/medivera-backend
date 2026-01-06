import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Achievement from './src/models/Achievement.js';

dotenv.config();

async function resetAchievements() {
  try {
    console.log('🔄 Starting achievement reset...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete all achievements
    const result = await Achievement.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} achievements\n`);

    await mongoose.disconnect();
    console.log('✅ Database cleaned successfully!');
    console.log('📝 Next step: Restart your backend server and login again');
    console.log('   Achievements will be automatically created on next login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetAchievements();