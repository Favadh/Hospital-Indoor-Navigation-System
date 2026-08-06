import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Floor from './model/floor.js';
import Node from './model/node.js';
import Edge from './model/edge.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const updateTimestamps = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing from environment variables');
    }

    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const now = new Date();
    console.log(`🕒 Updating all documents with current timestamp: ${now.toISOString()}...`);

    const floorRes = await Floor.updateMany({}, { $set: { createdAt: now, updatedAt: now } });
    console.log(`✅ Updated ${floorRes.modifiedCount} Floor documents`);

    const nodeRes = await Node.updateMany({}, { $set: { createdAt: now, updatedAt: now } });
    console.log(`✅ Updated ${nodeRes.modifiedCount} Node documents`);

    const edgeRes = await Edge.updateMany({}, { $set: { createdAt: now, updatedAt: now } });
    console.log(`✅ Updated ${edgeRes.modifiedCount} Edge documents`);

    console.log('🎉 Timestamps Updated Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
};

updateTimestamps();
