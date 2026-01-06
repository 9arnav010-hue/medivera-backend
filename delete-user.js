import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Achievement from './src/models/Achievement.js';
import Chat from './src/models/Chat.js';
import Report from './src/models/Report.js';

dotenv.config();

async function deleteUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line argument
    const email = process.argv[2];

    if (!email) {
      console.log('❌ Please provide an email address');
      console.log('Usage: node delete-user.js user@example.com\n');
      
      // Show all users
      console.log('📋 Available users:');
      const users = await User.find().select('name email createdAt');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Created: ${user.createdAt.toLocaleDateString()}`);
      });
      console.log('');
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}\n`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`👤 Found user:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Level: ${user.stats.level}`);
    console.log(`   XP: ${user.stats.totalXP}`);
    console.log(`   Created: ${user.createdAt.toLocaleDateString()}\n`);

    // Delete associated data
    console.log('🗑️ Deleting user data...\n');

    const achievementsDeleted = await Achievement.deleteMany({ user: user._id });
    console.log(`   ✅ Deleted ${achievementsDeleted.deletedCount} achievements`);

    const chatsDeleted = await Chat.deleteMany({ user: user._id });
    console.log(`   ✅ Deleted ${chatsDeleted.deletedCount} chat sessions`);

    const reportsDeleted = await Report.deleteMany({ user: user._id });
    console.log(`   ✅ Deleted ${reportsDeleted.deletedCount} reports`);

    // Delete user
    await User.deleteOne({ _id: user._id });
    console.log(`   ✅ Deleted user account\n`);

    console.log('🎉 User successfully deleted!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

deleteUser();