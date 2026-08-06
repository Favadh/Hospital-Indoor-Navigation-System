import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import floorRoutes from './routes/floorRoutes.js';
import nodeRoutes from './routes/nodeRoutes.js';
import edgeRoutes from './routes/edgeRoutes.js';
import navigationRoutes from './routes/navigationRoutes.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Hospital Indoor Navigation API Server Running',
  });
});

// API Routes
app.use('/api/floors', floorRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/navigation', navigationRoutes);

// Connect to MongoDB & Start Server
const startServer = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in the environment variables');
    }

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

startServer();
