import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Floor from './model/floor.js';
import Node from './model/node.js';
import Edge from './model/edge.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// 1. FLOOR DATA
const floorData = {
  floorId: 'ground',
  name: 'Ground Floor',
  level: 0,
  svgFile: '/Hospital G.svg',
  svgWidth: 1920,
  svgHeight: 1080,
};

// 2. NODES DATA (40 Nodes: Pharmacy & East Mid Hallway updated)
const nodesData = [
  // --- ROOMS (15 Nodes) ---
  { nodeId: 'cafeteria', name: 'Cafeteria', type: 'room', x: 240, y: 215, floor: 'ground' },
  { nodeId: 'pharmacy', name: 'Pharmacy', type: 'room', x: 240, y: 720, floor: 'ground' },
  { nodeId: 'toilet', name: 'Toilet', type: 'room', x: 400, y: 160, floor: 'ground' },
  { nodeId: 'lift', name: 'Lift', type: 'room', x: 872, y: 160, floor: 'ground' },
  { nodeId: 'stair', name: 'Stair', type: 'room', x: 929, y: 160, floor: 'ground' },
  { nodeId: 'reception', name: 'Reception', type: 'room', x: 400, y: 438, floor: 'ground' },
  { nodeId: 'registration', name: 'Registration', type: 'room', x: 840, y: 438, floor: 'ground' },
  { nodeId: 'ot', name: 'OT', type: 'room', x: 1437, y: 175, floor: 'ground' },
  { nodeId: 'lab', name: 'Lab', type: 'room', x: 1437, y: 451, floor: 'ground' },
  { nodeId: 'casuality', name: 'Casuality', type: 'room', x: 1437, y: 839, floor: 'ground' },
  { nodeId: 'icu', name: 'ICU', type: 'room', x: 1560, y: 141, floor: 'ground' },
  { nodeId: 'recovery_ward', name: 'Recovery Ward', type: 'room', x: 1560, y: 361, floor: 'ground' },
  { nodeId: 'xray', name: 'X-Ray', type: 'room', x: 1560, y: 601, floor: 'ground' },
  { nodeId: 'emergency', name: 'Emergency', type: 'room', x: 1560, y: 841, floor: 'ground' },
  { nodeId: 'waiting_area', name: 'Waiting Area', type: 'room', x: 620, y: 720, floor: 'ground' },

  // --- ENTRANCES (2 Nodes) ---
  { nodeId: 'main_entrance', name: 'Main Entrance', type: 'entrance', x: 940, y: 999, floor: 'ground' },
  { nodeId: 'emergency_entrance', name: 'Emergency Entrance', type: 'entrance', x: 1500, y: 999, floor: 'ground' },

  // --- CORRIDOR JUNCTIONS (23 Nodes) ---
  { nodeId: 'j_west', name: 'West Corridor Junction', type: 'junction', x: 312, y: 500, floor: 'ground' },
  { nodeId: 'j_pharmacy', name: 'Pharmacy Junction', type: 'junction', x: 312, y: 720, floor: 'ground' },
  { nodeId: 'j_reception', name: 'Reception Hallway', type: 'junction', x: 400, y: 500, floor: 'ground' },
  { nodeId: 'j_mid_center', name: 'Mid Center Corridor', type: 'junction', x: 620, y: 500, floor: 'ground' },
  { nodeId: 'j_registration', name: 'Registration Hallway', type: 'junction', x: 840, y: 500, floor: 'ground' },
  { nodeId: 'j_north_west_wing', name: 'North West Wing Junction', type: 'junction', x: 400, y: 215, floor: 'ground' },
  { nodeId: 'j_north_mid', name: 'Central North Corridor', type: 'junction', x: 620, y: 215, floor: 'ground' },
  { nodeId: 'j_lift', name: 'Lift Junction', type: 'junction', x: 872, y: 215, floor: 'ground' },
  { nodeId: 'j_stair', name: 'Stair Junction', type: 'junction', x: 929, y: 215, floor: 'ground' },
  { nodeId: 'j_main_hallway', name: 'Main Hallway Junction', type: 'junction', x: 940, y: 720, floor: 'ground' },
  { nodeId: 'j_rw_connector', name: 'Right Wing Connector', type: 'junction', x: 1500, y: 653, floor: 'ground' },
  { nodeId: 'j_rw_ot', name: 'OT Hallway Junction', type: 'junction', x: 1500, y: 175, floor: 'ground' },
  { nodeId: 'j_rw_lab', name: 'Lab Hallway Junction', type: 'junction', x: 1500, y: 451, floor: 'ground' },
  { nodeId: 'j_rw_icu', name: 'ICU Hallway Junction', type: 'junction', x: 1500, y: 141, floor: 'ground' },
  { nodeId: 'j_rw_recovery', name: 'Recovery Hallway Junction', type: 'junction', x: 1500, y: 361, floor: 'ground' },
  { nodeId: 'j_rw_xray', name: 'X-Ray Hallway Junction', type: 'junction', x: 1500, y: 601, floor: 'ground' },
  { nodeId: 'j_rw_emergency_wing', name: 'Emergency Wing Junction', type: 'junction', x: 1500, y: 841, floor: 'ground' },

  { nodeId: 'j_north_east_spine', name: 'North East Spine Junction', type: 'junction', x: 1053, y: 215, floor: 'ground' },
  { nodeId: 'j_south_main', name: 'South Main Junction', type: 'junction', x: 1053, y: 653, floor: 'ground' },
  { nodeId: 'j_east_mid_hallway', name: 'East Mid Hallway Junction', type: 'junction', x: 1053, y: 500, floor: 'ground' },
  { nodeId: 'j_main_entrance_hallway', name: 'Main Entrance Connector', type: 'junction', x: 940, y: 653, floor: 'ground' },
  { nodeId: 'j_south_corridor_loop', name: 'South Entrance Hallway', type: 'junction', x: 940, y: 916, floor: 'ground' },
  { nodeId: 'j_south_west_loop', name: 'South West Outer Junction', type: 'junction', x: 312, y: 916, floor: 'ground' },
];

// Helper to calculate Euclidean distance weight
const dist = (n1Id, n2Id) => {
  const n1 = nodesData.find((n) => n.nodeId === n1Id);
  const n2 = nodesData.find((n) => n.nodeId === n2Id);
  if (!n1 || !n2) return 100;
  return Math.round(Math.hypot(n2.x - n1.x, n2.y - n1.y));
};

// 3. EDGES DATA (43 Edges: Includes new Main Entrance <-> Emergency Entrance edge)
const edgeConnections = [
  // Entrances & Rooms to Junctions
  ['cafeteria', 'j_north_west_wing'],
  ['toilet', 'j_north_west_wing'],
  ['lift', 'j_lift'],
  ['stair', 'j_stair'],
  ['reception', 'j_reception'],
  ['registration', 'j_registration'],
  ['pharmacy', 'j_pharmacy'],
  ['ot', 'j_rw_ot'],
  ['lab', 'j_rw_lab'],
  ['casuality', 'j_rw_emergency_wing'],
  ['emergency', 'j_rw_emergency_wing'],
  ['icu', 'j_rw_icu'],
  ['recovery_ward', 'j_rw_recovery'],
  ['xray', 'j_rw_xray'],
  ['main_entrance', 'j_south_corridor_loop'],
  ['emergency_entrance', 'j_rw_emergency_wing'],

  // Direct Entrance-to-Entrance Connection
  ['main_entrance', 'emergency_entrance'],

  // North Hallway Line (Y = 215)
  ['j_north_west_wing', 'j_north_mid'],
  ['j_north_mid', 'j_lift'],
  ['j_lift', 'j_stair'],
  ['j_stair', 'j_north_east_spine'],

  // Mid Corridor Line (Y = 500)
  ['j_west', 'j_reception'],
  ['j_reception', 'j_mid_center'],
  ['j_mid_center', 'j_registration'],
  ['j_registration', 'j_east_mid_hallway'],

  // Vertical Spine Connections
  ['j_north_mid', 'j_mid_center'],
  ['j_north_east_spine', 'j_east_mid_hallway'],
  ['j_east_mid_hallway', 'j_south_main'],

  // South Main Hallway Line (Y = 653 / Y = 720)
  ['j_main_entrance_hallway', 'j_south_main'],
  ['j_south_main', 'j_rw_connector'],
  ['j_main_entrance_hallway', 'j_main_hallway'],
  ['j_main_hallway', 'waiting_area'],
  ['waiting_area', 'j_pharmacy'],

  // Outer South West Loop (X = 312 / Y = 916)
  ['j_west', 'j_pharmacy'],
  ['j_pharmacy', 'j_south_west_loop'],
  ['j_south_west_loop', 'j_south_corridor_loop'],
  ['j_south_corridor_loop', 'j_main_entrance_hallway'],

  // Right Wing Vertical Spine (X = 1500)
  ['j_rw_icu', 'j_rw_ot'],
  ['j_rw_ot', 'j_rw_recovery'],
  ['j_rw_recovery', 'j_rw_lab'],
  ['j_rw_lab', 'j_rw_xray'],
  ['j_rw_xray', 'j_rw_connector'],
  ['j_rw_connector', 'j_rw_emergency_wing'],
];

const edgesData = edgeConnections.map(([from, to], index) => ({
  edgeId: `e_${index + 1}`,
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

    console.log('🌱 Inserting Floor data...');
    await Floor.create(floorData);

    console.log(`🌱 Inserting ${nodesData.length} Nodes...`);
    await Node.insertMany(nodesData);

    console.log(`🌱 Inserting ${edgesData.length} Edges...`);
    await Edge.insertMany(edgesData);

    console.log('🎉 Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Seeding Failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
