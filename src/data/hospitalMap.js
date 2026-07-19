const WALL_HEIGHT = 2;

// Standardized architectural components to ensure structural consistency across floors
const getOuterWalls = () => [
  { pos: [0, WALL_HEIGHT/2, -10], size: [20.5, WALL_HEIGHT, 0.5] }, // Top
  { pos: [0, WALL_HEIGHT/2, 10], size: [20.5, WALL_HEIGHT, 0.5] },  // Bottom
  { pos: [-10, WALL_HEIGHT/2, 0], size: [0.5, WALL_HEIGHT, 20] },   // Left
  { pos: [10, WALL_HEIGHT/2, 0], size: [0.5, WALL_HEIGHT, 20] },    // Right
];

const getCorridorWalls = () => [
  // Top Corridor Wall (with gaps for doors)
  { pos: [-6.5, WALL_HEIGHT/2, -1.5], size: [6.5, WALL_HEIGHT, 0.5] },
  { pos: [0, WALL_HEIGHT/2, -1.5], size: [2.5, WALL_HEIGHT, 0.5] },
  { pos: [6.5, WALL_HEIGHT/2, -1.5], size: [6.5, WALL_HEIGHT, 0.5] },

  // Bottom Corridor Wall (with gaps for doors)
  { pos: [-6.5, WALL_HEIGHT/2, 1.5], size: [6.5, WALL_HEIGHT, 0.5] },
  { pos: [0, WALL_HEIGHT/2, 1.5], size: [2.5, WALL_HEIGHT, 0.5] },
  { pos: [6.5, WALL_HEIGHT/2, 1.5], size: [6.5, WALL_HEIGHT, 0.5] },

  // Vertical Room Dividers (Top Side)
  { pos: [-3, WALL_HEIGHT/2, -5.75], size: [0.5, WALL_HEIGHT, 8] },
  { pos: [3, WALL_HEIGHT/2, -5.75], size: [0.5, WALL_HEIGHT, 8] },

  // Vertical Room Dividers (Bottom Side)
  { pos: [-3, WALL_HEIGHT/2, 5.75], size: [0.5, WALL_HEIGHT, 8] },
  { pos: [3, WALL_HEIGHT/2, 5.75], size: [0.5, WALL_HEIGHT, 8] },
];

const standardWalls = [...getOuterWalls(), ...getCorridorWalls()];

export const hospitalLayout = {
  floors: [
    {
      id: 0,
      level: "G",
      name: "Ground Floor",
      description: "Public Access & Emergency",
      walls: standardWalls,
      rooms: [
        { name: 'Casualty (ER)', pos: [-6.5, 0.05, -5.5], color: '#e74c3c' },
        { name: 'OP Section', pos: [0, 0.05, -5.5], color: '#3498db' },
        { name: 'Registration', pos: [6.5, 0.05, -5.5], color: '#9b59b6' },
        { name: 'Pharmacy', pos: [-6.5, 0.05, 5.5], color: '#2ecc71' },
        { name: 'Reception', pos: [0, 0.05, 5.5], color: '#f1c40f' },
        { name: 'Lifts / Stairs', pos: [6.5, 0.05, 5.5], color: '#95a5a6', isLift: true },
      ],
      // Dummy Route for Ground Floor: Reception -> Lifts
      route: [
        [0, 0.2, 5.5],
        [0, 0.2, 1.5],
        [0, 0.2, 0],
        [6.5, 0.2, 0],
        [6.5, 0.2, 1.5],
        [6.5, 0.2, 5.5]
      ]
    },
    {
      id: 1,
      level: "F1",
      name: "First Floor",
      description: "Inpatient Wards & Doctors",
      walls: standardWalls,
      rooms: [
        { name: 'Doctor Office 1', pos: [-6.5, 0.05, -5.5], color: '#ffb8b8' },
        { name: 'Doctor Office 2', pos: [0, 0.05, -5.5], color: '#ffb8b8' },
        { name: 'IP Ward A', pos: [6.5, 0.05, -5.5], color: '#a29bfe' },
        { name: 'Nurse Station', pos: [-6.5, 0.05, 5.5], color: '#55efc4' },
        { name: 'IP Ward B', pos: [0, 0.05, 5.5], color: '#a29bfe' },
        { name: 'Lifts / Stairs', pos: [6.5, 0.05, 5.5], color: '#95a5a6', isLift: true },
      ],
      // Dummy Route for First Floor: Lifts -> Nurse Station
      route: [
        [6.5, 0.2, 5.5],
        [6.5, 0.2, 1.5],
        [6.5, 0.2, 0],
        [-6.5, 0.2, 0],
        [-6.5, 0.2, 1.5],
        [-6.5, 0.2, 5.5]
      ]
    },
    {
      id: 2,
      level: "F2",
      name: "Second Floor",
      description: "Critical Care",
      walls: standardWalls,
      rooms: [
        { name: 'Operation Theatre 1', pos: [-6.5, 0.05, -5.5], color: '#ff7675' },
        { name: 'Operation Theatre 2', pos: [0, 0.05, -5.5], color: '#ff7675' },
        { name: 'Prep / Scrub', pos: [6.5, 0.05, -5.5], color: '#74b9ff' },
        { name: 'ICU Ward A', pos: [-6.5, 0.05, 5.5], color: '#fdcb6e' },
        { name: 'ICU Ward B', pos: [0, 0.05, 5.5], color: '#fdcb6e' },
        { name: 'Lifts / Stairs', pos: [6.5, 0.05, 5.5], color: '#95a5a6', isLift: true },
      ],
      // Dummy Route for Second Floor: Lifts -> ICU Ward A
      route: [
        [6.5, 0.2, 5.5],
        [6.5, 0.2, 1.5],
        [6.5, 0.2, 0],
        [-6.5, 0.2, 0],
        [-6.5, 0.2, 1.5],
        [-6.5, 0.2, 5.5]
      ]
    }
  ]
};
