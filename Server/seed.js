import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Floor from './model/floor.js';
import Node from './model/node.js';
import Edge from './model/edge.js';
import Admin from './model/admin.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// 1. FLOOR DATA
const floorData = {
  name: 'Ground Floor',
  level: 0,
  svgFile: '/Hospital G.svg',
  svgWidth: 1920,
  svgHeight: 1080,
};

// 2. NODES DATA (40 Nodes)
const nodesData = [
  // --- ROOMS (15 Nodes) ---
  { name: 'Cafeteria', type: 'room', x: 240, y: 215, floor: 'ground' },
  { name: 'Pharmacy', type: 'room', x: 240, y: 720, floor: 'ground' },
  { name: 'Toilet', type: 'room', x: 400, y: 160, floor: 'ground' },
  { name: 'Lift', type: 'room', x: 872, y: 160, floor: 'ground' },
  { name: 'Stair', type: 'room', x: 929, y: 160, floor: 'ground' },
  { name: 'Reception', type: 'room', x: 400, y: 438, floor: 'ground' },
  { name: 'Registration', type: 'room', x: 840, y: 438, floor: 'ground' },
  { name: 'OT', type: 'room', x: 1437, y: 175, floor: 'ground' },
  { name: 'Lab', type: 'room', x: 1437, y: 451, floor: 'ground' },
  { name: 'Casuality', type: 'room', x: 1437, y: 839, floor: 'ground' },
  { name: 'ICU', type: 'room', x: 1560, y: 141, floor: 'ground' },
  { name: 'Recovery Ward', type: 'room', x: 1560, y: 361, floor: 'ground' },
  { name: 'X-Ray', type: 'room', x: 1560, y: 601, floor: 'ground' },
  { name: 'Emergency', type: 'room', x: 1560, y: 841, floor: 'ground' },
  { name: 'Waiting Area', type: 'room', x: 620, y: 720, floor: 'ground' },

  // --- ENTRANCES (2 Nodes) ---
  { name: 'Main Entrance', type: 'entrance', x: 940, y: 999, floor: 'ground' },
  { name: 'Emergency Entrance', type: 'entrance', x: 1500, y: 999, floor: 'ground' },

  // --- CORRIDOR JUNCTIONS (23 Nodes) ---
  { name: 'West Corridor Junction', type: 'junction', x: 312, y: 500, floor: 'ground' },
  { name: 'Pharmacy Junction', type: 'junction', x: 312, y: 720, floor: 'ground' },
  { name: 'Reception Hallway', type: 'junction', x: 400, y: 500, floor: 'ground' },
  { name: 'Mid Center Corridor', type: 'junction', x: 620, y: 500, floor: 'ground' },
  { name: 'Registration Hallway', type: 'junction', x: 840, y: 500, floor: 'ground' },
  { name: 'North West Wing Junction', type: 'junction', x: 400, y: 215, floor: 'ground' },
  { name: 'Central North Corridor', type: 'junction', x: 620, y: 215, floor: 'ground' },
  { name: 'Lift Junction', type: 'junction', x: 872, y: 215, floor: 'ground' },
  { name: 'Stair Junction', type: 'junction', x: 929, y: 215, floor: 'ground' },
  { name: 'Main Hallway Junction', type: 'junction', x: 940, y: 720, floor: 'ground' },
  { name: 'Right Wing Connector', type: 'junction', x: 1500, y: 653, floor: 'ground' },
  { name: 'OT Hallway Junction', type: 'junction', x: 1500, y: 175, floor: 'ground' },
  { name: 'Lab Hallway Junction', type: 'junction', x: 1500, y: 451, floor: 'ground' },
  { name: 'ICU Hallway Junction', type: 'junction', x: 1500, y: 141, floor: 'ground' },
  { name: 'Recovery Hallway Junction', type: 'junction', x: 1500, y: 361, floor: 'ground' },
  { name: 'X-Ray Hallway Junction', type: 'junction', x: 1500, y: 601, floor: 'ground' },
  { name: 'Emergency Wing Junction', type: 'junction', x: 1500, y: 841, floor: 'ground' },

  { name: 'North East Spine Junction', type: 'junction', x: 1053, y: 215, floor: 'ground' },
  { name: 'South Main Junction', type: 'junction', x: 1053, y: 653, floor: 'ground' },
  { name: 'East Mid Hallway Junction', type: 'junction', x: 1053, y: 500, floor: 'ground' },
  { name: 'Main Entrance Connector', type: 'junction', x: 940, y: 653, floor: 'ground' },
  { name: 'South Entrance Hallway', type: 'junction', x: 940, y: 916, floor: 'ground' },
  { name: 'South West Outer Junction', type: 'junction', x: 312, y: 916, floor: 'ground' },
];

// Helper to calculate Euclidean distance weight
const dist = (name1, name2) => {
  const n1 = nodesData.find((n) => n.name === name1);
  const n2 = nodesData.find((n) => n.name === name2);
  if (!n1 || !n2) return 100;
  return Math.round(Math.hypot(n2.x - n1.x, n2.y - n1.y));
};

// 3. EDGES DATA (43 Edges — from/to use node name)
const edgeConnections = [
  // Entrances & Rooms to Junctions
  ['Cafeteria', 'North West Wing Junction'],
  ['Toilet', 'North West Wing Junction'],
  ['Lift', 'Lift Junction'],
  ['Stair', 'Stair Junction'],
  ['Reception', 'Reception Hallway'],
  ['Registration', 'Registration Hallway'],
  ['Pharmacy', 'Pharmacy Junction'],
  ['OT', 'OT Hallway Junction'],
  ['Lab', 'Lab Hallway Junction'],
  ['Casuality', 'Emergency Wing Junction'],
  ['Emergency', 'Emergency Wing Junction'],
  ['ICU', 'ICU Hallway Junction'],
  ['Recovery Ward', 'Recovery Hallway Junction'],
  ['X-Ray', 'X-Ray Hallway Junction'],
  ['Main Entrance', 'South Entrance Hallway'],
  ['Emergency Entrance', 'Emergency Wing Junction'],

  // Direct Entrance-to-Entrance Connection
  ['Main Entrance', 'Emergency Entrance'],

  // North Hallway Line (Y = 215)
  ['North West Wing Junction', 'Central North Corridor'],
  ['Central North Corridor', 'Lift Junction'],
  ['Lift Junction', 'Stair Junction'],
  ['Stair Junction', 'North East Spine Junction'],

  // Mid Corridor Line (Y = 500)
  ['West Corridor Junction', 'Reception Hallway'],
  ['Reception Hallway', 'Mid Center Corridor'],
  ['Mid Center Corridor', 'Registration Hallway'],
  ['Registration Hallway', 'East Mid Hallway Junction'],

  // Vertical Spine Connections
  ['Central North Corridor', 'Mid Center Corridor'],
  ['North East Spine Junction', 'East Mid Hallway Junction'],
  ['East Mid Hallway Junction', 'South Main Junction'],

  // South Main Hallway Line (Y = 653 / Y = 720)
  ['Main Entrance Connector', 'South Main Junction'],
  ['South Main Junction', 'Right Wing Connector'],
  ['Main Entrance Connector', 'Main Hallway Junction'],
  ['Main Hallway Junction', 'Waiting Area'],
  ['Waiting Area', 'Pharmacy Junction'],

  // Outer South West Loop (X = 312 / Y = 916)
  ['West Corridor Junction', 'Pharmacy Junction'],
  ['Pharmacy Junction', 'South West Outer Junction'],
  ['South West Outer Junction', 'South Entrance Hallway'],
  ['South Entrance Hallway', 'Main Entrance Connector'],

  // Right Wing Vertical Spine (X = 1500)
  ['ICU Hallway Junction', 'OT Hallway Junction'],
  ['OT Hallway Junction', 'Recovery Hallway Junction'],
  ['Recovery Hallway Junction', 'Lab Hallway Junction'],
  ['Lab Hallway Junction', 'X-Ray Hallway Junction'],
  ['X-Ray Hallway Junction', 'Right Wing Connector'],
  ['Right Wing Connector', 'Emergency Wing Junction'],
];

const edgesData = edgeConnections.map(([from, to]) => ({
  from,
  to,
  weight: dist(from, to),
  bidirectional: true,
  floor: 'ground',
}));

// SEED FUNCTION
const seedDatabase = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing from environment variables');
    }

    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Cleaning existing data...');
    await Floor.deleteMany({});
    await Node.deleteMany({});
    await Edge.deleteMany({});
    await Admin.deleteMany({});

    console.log('🌱 Inserting Floor data...');
    await Floor.create(floorData);

    console.log(`🌱 Inserting ${nodesData.length} Nodes...`);
    await Node.insertMany(nodesData);

    console.log(`🌱 Inserting ${edgesData.length} Edges...`);
    await Edge.insertMany(edgesData);

    console.log('🌱 Inserting Admin accounts...');
    await Admin.insertMany([
      {
        username: 'admin',
        email: 'admin@hospital.medinav.io',
        password: 'admin123',
        role: 'Super Admin',
        status: 'Active',
        lastLogin: new Date(),
        avatarColor: '#00ff88',
      },
      {
        username: 'sjenkins',
        email: 's.jenkins@hospital.medinav.io',
        password: 'admin123',
        role: 'Spatial Editor',
        status: 'Inactive',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
        avatarColor: '#4285F4',
      },
      {
        username: 'it_operations',
        email: 'it-support@hospital.medinav.io',
        password: 'admin123',
        role: 'Hospital Staff',
        status: 'Inactive',
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
        avatarColor: '#a855f7',
      },
    ]);

    console.log('🎉 Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Seeding Failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
