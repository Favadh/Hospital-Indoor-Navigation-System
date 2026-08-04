import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line, Environment } from '@react-three/drei';

// --- CONSTANTS & COORDINATE CONVERSION ---
const WALL_HEIGHT = 80;
const WALL_THICKNESS = 8;
const SVG_W = 1920;
const SVG_H = 1080;
const OFFSET_X = -SVG_W / 2; // -960
const OFFSET_Z = -SVG_H / 2; // -540

// Converts 2D SVG (x, y) coordinates directly to 3D World (x, z) coordinates
function svgToWorld(sx, sy) {
  return [sx + OFFSET_X, sy + OFFSET_Z];
}

// Get center of an SVG bounding box in 3D world space (X, Y_height, Z)
function roomCenter(x1, y1, x2, y2, height = WALL_HEIGHT + 15) {
  return [(x1 + x2) / 2 + OFFSET_X, height, (y1 + y2) / 2 + OFFSET_Z];
}

// ============================================================================
// 3D EXTRUDED WALLS (Direct World Coordinates, 100% Aligned with SVG)
// ============================================================================
function ExtrudedWalls() {
  const [walls, setWalls] = useState([]);

  useEffect(() => {
    fetch('/Hospital G.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const lineElements = doc.querySelectorAll('line');
        const segs = [];
        let id = 0;

        lineElements.forEach((el) => {
          const stroke = el.getAttribute('stroke');
          // ONLY extrude black-stroked lines (skip grey #D9D9D9 and anything else)
          if (stroke !== 'black') return;

          const x1 = parseFloat(el.getAttribute('x1'));
          const y1 = parseFloat(el.getAttribute('y1'));
          const x2 = parseFloat(el.getAttribute('x2'));
          const y2 = parseFloat(el.getAttribute('y2'));

          const dx = x2 - x1;
          const dz = y2 - y1;
          const length = Math.hypot(dx, dz);
          if (length < 0.5) return;

          // Midpoint in 3D World Coordinates (X, Z)
          const midX = (x1 + x2) / 2 + OFFSET_X;
          const midZ = (y1 + y2) / 2 + OFFSET_Z;

          // Angle around 3D Y-axis
          const angleY = -Math.atan2(dz, dx);

          segs.push({ id: id++, length, midX, midZ, angleY });
        });

        setWalls(segs);
      });
  }, []);

  return (
    <group>
      {/* Outer Ground Plate */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2100, 1300]} />
        <meshStandardMaterial color="#b2bec3" roughness={0.9} />
      </mesh>

      {/* Interior Floor matching SVG #D9D9D9 fill */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1840, 1000]} />
        <meshStandardMaterial color="#dfe6e9" roughness={0.85} />
      </mesh>

      {/* Extruded Architectural Walls */}
      {walls.map((w) => (
        <mesh
          key={w.id}
          position={[w.midX, WALL_HEIGHT / 2, w.midZ]}
          rotation={[0, w.angleY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w.length, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial
            color="#f0ece2"
            roughness={0.25}
            metalness={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// DEPARTMENT LABELS (Matching image.png & Hospital G.svg)
// ============================================================================
function DepartmentLabels() {
  const departments = [
    // ---- LEFT COLUMN ----
    { name: "Cafeteria",           pos: roomCenter(40, 40, 240, 438),         color: "#e67e22",  fontSize: 22, vertical: true },
    { name: "Pharmacy",            pos: roomCenter(40, 520, 240, 959),        color: "#00b894",  fontSize: 22, vertical: true },

    // ---- TOP ROW ----
    { name: "Toilet",              pos: roomCenter(239, 40, 560, 160),        color: "#636e72",  fontSize: 22 },
    { name: "Lift",                pos: roomCenter(559, 40, 681, 160),        color: "#2d3436",  fontSize: 20 },
    { name: "Stair",               pos: roomCenter(681, 40, 901, 160),        color: "#2d3436",  fontSize: 22 },

    // ---- MID ROW ----
    { name: "Reception",           pos: roomCenter(239, 275, 558, 438),       color: "#6c5ce7",  fontSize: 26, bold: true },
    { name: "Registration",        pos: roomCenter(681, 275, 1000, 438),      color: "#2d3436",  fontSize: 26, bold: true },

    // ---- RIGHT BLOCK (OT + Lab) ----
    { name: "OT",                  pos: roomCenter(1120, 40, 1440, 315),      color: "#d63031",  fontSize: 30, bold: true },
    { name: "Lab",                 pos: roomCenter(1120, 315, 1440, 590),     color: "#e17055",  fontSize: 28, bold: true },

    // ---- FAR RIGHT WING ----
    { name: "ICU",                 pos: roomCenter(1560, 40, 1880, 241),      color: "#d63031",  fontSize: 28, bold: true },
    { name: "Recovery Ward",       pos: roomCenter(1560, 241, 1880, 480),     color: "#6c5ce7",  fontSize: 22 },
    { name: "X-Ray",               pos: roomCenter(1560, 480, 1880, 721),     color: "#00b894",  fontSize: 26, bold: true },
    { name: "Emergency",           pos: roomCenter(1560, 721, 1880, 961),     color: "#ff3838",  fontSize: 26, bold: true },

    // ---- CENTER SPACE ----
    { name: "Waiting Area",        pos: roomCenter(360, 560, 880, 880),       color: "#0984e3",  fontSize: 26, bold: true, vertical: true },

    // ---- BOTTOM ----
    { name: "Casuality",           pos: roomCenter(1000, 721, 1440, 961),     color: "#e17055",  fontSize: 26, bold: true },

    // ---- BOTTOM CORRIDOR ----
    { name: "Main Entrance",       pos: roomCenter(240, 958, 880, 1040, 35),  color: "#00cec9",  fontSize: 26, bold: true },
    { name: "Emergency Entrance",  pos: roomCenter(1440, 958, 1880, 1040, 35),color: "#ff3838",  fontSize: 22, bold: true },
  ];

  return (
    <group>
      {departments.map((dept, idx) => (
        <group key={idx} position={dept.pos}>
          {/* Subtle background pill for text readability */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
            <planeGeometry args={[
              dept.name.length * dept.fontSize * 0.65,
              dept.fontSize * 2.2
            ]} />
            <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
          </mesh>
          <Text
            position={[0, 0, 0]}
            rotation={[-Math.PI / 3, 0, dept.vertical ? -Math.PI / 2 : 0]}
            fontSize={dept.fontSize}
            color={dept.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={1.4}
            outlineColor="#ffffff"
            fontWeight={dept.bold ? "bold" : "normal"}
          >
            {dept.name}
          </Text>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// NAVIGATION ROUTE (Main Entrance → Reception & Casualty → Emergency)
// ============================================================================
function NavigationRoute() {
  const h = 12;

  // Main Entrance → Corridor → Reception
  const toReception = [
    [...svgToWorld(560, 990), h],  // Main Entrance
    [...svgToWorld(560, 720), h],  // South Corridor Junction
    [...svgToWorld(400, 720), h],  // West Corridor
    [...svgToWorld(400, 357), h],  // Reception Desk
  ].map(([x, z, y]) => [x, y, z]);

  // Junction → East to Casualty → Emergency
  const toEmergency = [
    [...svgToWorld(560, 720), h],  // South Corridor Junction
    [...svgToWorld(940, 720), h],  // East Corridor Junction
    [...svgToWorld(940, 841), h],  // Casualty Entry Way
    [...svgToWorld(1220, 841), h], // Casualty Center
    [...svgToWorld(1500, 841), h], // Emergency Wing Hallway
    [...svgToWorld(1720, 841), h], // Emergency Room Center
  ].map(([x, z, y]) => [x, y, z]);

  return (
    <group>
      <Line points={toReception} color="#00ff88" lineWidth={10} dashed dashScale={10} dashSize={4} />
      <Line points={toEmergency} color="#00ff88" lineWidth={10} dashed dashScale={10} dashSize={4} />

      {/* Start Marker — Main Entrance */}
      <mesh position={toReception[0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[20, 32]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      {/* Destination Marker — Reception */}
      <mesh position={toReception[3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[16, 24, 32]} />
        <meshBasicMaterial color="#6c5ce7" />
      </mesh>
      {/* Destination Marker — Emergency */}
      <mesh position={toEmergency[5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[16, 24, 32]} />
        <meshBasicMaterial color="#ff3838" />
      </mesh>
    </group>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{
        padding: '1rem 2rem',
        background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a2e 100%)',
        color: 'white',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        borderBottom: '2px solid #00ff8833'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#00ff88', letterSpacing: '0.5px' }}>
            🏥 Smart Hospital Navigation
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', opacity: 0.7, fontSize: '0.85rem', color: '#dcdde1' }}>
            Ground Floor • True 2.5D Extruded Vector Architecture
          </p>
        </div>
        <div style={{
          background: '#16213e',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid #00ff8855',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          color: '#00ff88'
        }}>
          17 Rooms • {WALL_HEIGHT}px Extruded Walls
        </div>
      </header>

      {/* 3D Canvas */}
      <main style={{ flex: 1, position: 'relative', background: '#1e272e' }}>
        <Canvas
          camera={{ position: [0, 850, 950], fov: 50, near: 1, far: 6000 }}
          shadows
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[600, 1000, 500]} intensity={1.3} castShadow />
          <directionalLight position={[-500, 700, -400]} intensity={0.4} />
          <Environment preset="city" />

          <React.Suspense fallback={null}>
            <ExtrudedWalls />
            <DepartmentLabels />
            <NavigationRoute />
          </React.Suspense>

          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2.05}
            minDistance={150}
            maxDistance={2500}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>

        {/* Controls HUD */}
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px',
          background: 'rgba(12, 12, 29, 0.92)', padding: '14px 18px',
          borderRadius: '12px', color: 'white', borderLeft: '4px solid #00ff88',
          pointerEvents: 'none', zIndex: 10, backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#00ff88', fontSize: '0.9rem' }}>
            Interactive Controls
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
            🖱️ Left-drag to Orbit • Right-drag to Pan • Scroll to Zoom
          </div>
        </div>

        {/* Room Legend */}
        <div style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'rgba(12, 12, 29, 0.92)', padding: '14px 18px',
          borderRadius: '12px', color: 'white', borderRight: '4px solid #6c5ce7',
          pointerEvents: 'none', zIndex: 10, backdropFilter: 'blur(8px)',
          maxWidth: '200px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#6c5ce7', fontSize: '0.9rem' }}>
            Room Legend
          </div>
          {[
            { c: '#d63031', n: 'ICU / OT / Emergency' },
            { c: '#6c5ce7', n: 'Reception / Recovery' },
            { c: '#0984e3', n: 'Waiting Area' },
            { c: '#00b894', n: 'Pharmacy / X-Ray' },
            { c: '#e17055', n: 'Lab / Casuality' },
            { c: '#00ff88', n: 'Navigation Route' }
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.78rem', opacity: 0.85 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.c, flexShrink: 0 }} />
              {item.n}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
