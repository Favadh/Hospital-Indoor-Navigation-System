const WALL_HEIGHT = 2.5;

function generateRoomWalls(cx, cz, w, d, doorSide) {
  const walls = [];
  const thickness = 0.4;
  const h = WALL_HEIGHT;

  // Top Wall
  if (doorSide === 'top') {
    walls.push({ pos: [cx - w/4 - 1, h/2, cz - d/2], size: [w/2 - 2, h, thickness] });
    walls.push({ pos: [cx + w/4 + 1, h/2, cz - d/2], size: [w/2 - 2, h, thickness] });
  } else {
    walls.push({ pos: [cx, h/2, cz - d/2], size: [w, h, thickness] });
  }

  // Bottom Wall
  if (doorSide === 'bottom') {
    walls.push({ pos: [cx - w/4 - 1, h/2, cz + d/2], size: [w/2 - 2, h, thickness] });
    walls.push({ pos: [cx + w/4 + 1, h/2, cz + d/2], size: [w/2 - 2, h, thickness] });
  } else {
    walls.push({ pos: [cx, h/2, cz + d/2], size: [w, h, thickness] });
  }

  // Left Wall
  if (doorSide === 'left') {
    walls.push({ pos: [cx - w/2, h/2, cz - d/4 - 1], size: [thickness, h, d/2 - 2] });
    walls.push({ pos: [cx + w/2, h/2, cz + d/4 + 1], size: [thickness, h, d/2 - 2] }); // Bug fix: cx - w/2
  } else {
    walls.push({ pos: [cx - w/2, h/2, cz], size: [thickness, h, d] });
  }
  // Left wall Bug fix applied:
  if (doorSide === 'left') {
    walls[walls.length-1].pos = [cx - w/2, h/2, cz + d/4 + 1];
    walls[walls.length-2].pos = [cx - w/2, h/2, cz - d/4 - 1];
  }

  // Right Wall
  if (doorSide === 'right') {
    walls.push({ pos: [cx + w/2, h/2, cz - d/4 - 1], size: [thickness, h, d/2 - 2] });
    walls.push({ pos: [cx + w/2, h/2, cz + d/4 + 1], size: [thickness, h, d/2 - 2] });
  } else {
    walls.push({ pos: [cx + w/2, h/2, cz], size: [thickness, h, d] });
  }

  return walls;
}

// Generate the standard H-shape architecture walls
const hShapeWalls = [
  ...generateRoomWalls(-20.5, -8.5, 9, 14, 'right'),  // TL_West
  ...generateRoomWalls(-9.5, -8.5, 9, 14, 'left'),    // TR_West
  ...generateRoomWalls(-20.5, 8.5, 9, 14, 'right'),   // BL_West
  ...generateRoomWalls(-9.5, 8.5, 9, 14, 'left'),     // BR_West
  
  ...generateRoomWalls(9.5, -8.5, 9, 14, 'right'),    // TL_East
  ...generateRoomWalls(20.5, -8.5, 9, 14, 'left'),    // TR_East
  ...generateRoomWalls(9.5, 8.5, 9, 14, 'right'),     // BL_East
  ...generateRoomWalls(20.5, 8.5, 9, 14, 'left'),     // BR_East

  ...generateRoomWalls(0, -5, 10, 7, 'bottom'),       // Top_Hub
  ...generateRoomWalls(0, 5, 10, 7, 'top'),           // Bottom_Hub
];

// Helper to create room objects quickly
function createRoom(name, cx, cz, w, d, color, props = []) {
  return { name, pos: [cx, 0.05, cz], size: [w, d], color, props };
}

export const hospitalLayout = {
  floors: [
    {
      id: 0,
      level: "G",
      name: "Ground Floor",
      description: "Public Access & Emergency",
      walls: hShapeWalls,
      rooms: [
        createRoom('Casualty (ER)', -20.5, -8.5, 9, 14, '#e74c3c', ['beds', 'ivs']),
        createRoom('Triage', -9.5, -8.5, 9, 14, '#e67e22', ['chairs']),
        createRoom('Pharmacy', -20.5, 8.5, 9, 14, '#2ecc71', ['cabinets']),
        createRoom('Consultation A', -9.5, 8.5, 9, 14, '#3498db', ['desks']),
        
        createRoom('X-Ray', 9.5, -8.5, 9, 14, '#9b59b6', ['machines']),
        createRoom('MRI / CT Scan', 20.5, -8.5, 9, 14, '#8e44ad', ['machines']),
        createRoom('OP Checkup', 9.5, 8.5, 9, 14, '#3498db', ['desks']),
        createRoom('Cafeteria', 20.5, 8.5, 9, 14, '#f1c40f', ['tables']),

        createRoom('Waiting Lounge', 0, -5, 10, 7, '#ecf0f1', ['chairs', 'plants']),
        createRoom('Main Reception & Lifts', 0, 5, 10, 7, '#95a5a6', ['reception', 'lifts']),
      ],
      route: [[0, 0.2, 5], [0, 0.2, 0], [-15, 0.2, 0], [-15, 0.2, -8.5], [-20.5, 0.2, -8.5]] // Reception to ER
    },
    {
      id: 1,
      level: "F1",
      name: "First Floor",
      description: "Inpatient Wards & Maternity",
      walls: hShapeWalls,
      rooms: [
        createRoom('Male Ward', -20.5, -8.5, 9, 14, '#a29bfe', ['beds']),
        createRoom('Female Ward', -9.5, -8.5, 9, 14, '#a29bfe', ['beds']),
        createRoom('Private Rooms', -20.5, 8.5, 9, 14, '#74b9ff', ['beds', 'chairs']),
        createRoom('Doctors Lounge', -9.5, 8.5, 9, 14, '#55efc4', ['tables']),
        
        createRoom('Maternity Ward', 9.5, -8.5, 9, 14, '#fd79a8', ['beds']),
        createRoom('NICU (Neonatal)', 20.5, -8.5, 9, 14, '#fab1a0', ['machines']),
        createRoom('Pediatric Ward', 9.5, 8.5, 9, 14, '#ffeaa7', ['beds']),
        createRoom('Play Area', 20.5, 8.5, 9, 14, '#55efc4', ['plants', 'chairs']),

        createRoom('Central Nurse Station', 0, -5, 10, 7, '#00b894', ['cabinets', 'desks']),
        createRoom('Lifts / Transport', 0, 5, 10, 7, '#95a5a6', ['lifts']),
      ],
      route: [[0, 0.2, 5], [0, 0.2, 0], [15, 0.2, 0], [15, 0.2, -8.5], [9.5, 0.2, -8.5]] // Lifts to Maternity
    },
    {
      id: 2,
      level: "F2",
      name: "Second Floor",
      description: "Surgery & Critical Care",
      walls: hShapeWalls,
      rooms: [
        createRoom('Operation Theatre 1', -20.5, -8.5, 9, 14, '#ff7675', ['machines', 'beds']),
        createRoom('Operation Theatre 2', -9.5, -8.5, 9, 14, '#ff7675', ['machines', 'beds']),
        createRoom('Scrub Room', -20.5, 8.5, 9, 14, '#81ecec', ['cabinets']),
        createRoom('Post-Op Recovery', -9.5, 8.5, 9, 14, '#74b9ff', ['beds']),
        
        createRoom('ICU Ward A', 9.5, -8.5, 9, 14, '#fdcb6e', ['beds', 'ivs', 'machines']),
        createRoom('ICU Ward B', 20.5, -8.5, 9, 14, '#fdcb6e', ['beds', 'ivs', 'machines']),
        createRoom('Cardiac Care (CCU)', 9.5, 8.5, 9, 14, '#e17055', ['beds', 'machines']),
        createRoom('Equipment Storage', 20.5, 8.5, 9, 14, '#b2bec3', ['cabinets']),

        createRoom('Relatives Waiting Room', 0, -5, 10, 7, '#ecf0f1', ['chairs']),
        createRoom('Lifts / Transport', 0, 5, 10, 7, '#95a5a6', ['lifts']),
      ],
      route: [[0, 0.2, 5], [0, 0.2, 0], [-15, 0.2, 0], [-15, 0.2, -8.5], [-20.5, 0.2, -8.5]] // Lifts to OT 1
    }
  ]
};
