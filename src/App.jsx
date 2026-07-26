import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line, Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- CONSTANTS ---
const WALL_HEIGHT = 80;
const WALL_THICKNESS = 8;
const SVG_W = 1920;
const SVG_H = 1080;
const OFFSET_X = -SVG_W / 2; // -960: centers the map at world origin
const OFFSET_Z = -SVG_H / 2; // -540

// Convert SVG (x,y) to 3D world (x, z)
function svgToWorld(sx, sy) {
  return [sx + OFFSET_X, sy + OFFSET_Z];
}

// Get the center of an SVG bounding box in world space, at a given Y height
function roomCenter(x1, y1, x2, y2, height = WALL_HEIGHT + 12) {
  return [(x1 + x2) / 2 + OFFSET_X, height, (y1 + y2) / 2 + OFFSET_Z];
}

// ============================================================================
// MANUAL SVG PARSER — Bypasses SVGLoader entirely for 100% accuracy
// Reads <line stroke="black"> elements directly via DOMParser
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
          const dy = y2 - y1;
          const length = Math.hypot(dx, dy);
          if (length < 1) return;

          const midX = (x1 + x2) / 2 + OFFSET_X;
          const midZ = (y1 + y2) / 2 + OFFSET_Z;
          const angle = Math.atan2(dy, dx);

          segs.push({ id: id++, length, midX, midZ, angle });
        });

        setWalls(segs);
      });
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer ground plate (slightly larger than building) */}
      <mesh position={[0, 0, -2]} receiveShadow>
        <planeGeometry args={[2100, 1300]} />
        <meshStandardMaterial color="#b2bec3" roughness={0.9} />
      </mesh>

      {/* Interior floor matching the grey #D9D9D9 fill from the SVG */}
      <mesh position={[0, 0, -0.5]} receiveShadow>
        <planeGeometry args={[1840, 1000]} />
        <meshStandardMaterial color="#dfe6e9" roughness={0.85} />
      </mesh>

      {/* All extruded wall segments */}
      {walls.map((w) => (
        <mesh
          key={w.id}
          position={[w.midX, w.midZ, WALL_HEIGHT / 2]}
          rotation={[0, 0, w.angle]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w.length, WALL_THICKNESS, WALL_HEIGHT]} />
          <meshStandardMaterial
            color="#dcd6cc"
            roughness={0.3}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// DEPARTMENT LABELS — Precisely mapped from SVG bounding boxes + image.png
// ============================================================================
//
// Room coordinate tracing from Hospital G.svg lines:
//
// Cafeteria:     walls x=40–240,  y=40–438  (left tall room, top half)
// Toilet:        walls x=239–560, y=40–160  (top row, left)
// Lift:          walls x=559–681, y=40–160  (top row, small)
// Stair:         walls x=681–901, y=40–160  (top row, right)
// Reception:     walls x=239–558, y=275–438 (mid row, left)
// Registration:  walls x=681–1000,y=275–438 (mid row, right)
// OT:            walls x=1120–1440,y=40–315 (right block, upper)
// Lab:           walls x=1120–1440,y=315–590(right block, lower)
// ICU:           walls x=1560–1880,y=40–241 (far right, top)
// Recovery Ward: walls x=1560–1880,y=241–480(far right, upper-mid)
// X-Ray:         walls x=1560–1880,y=480–721(far right, lower-mid)
// Emergency:     walls x=1560–1880,y=721–961(far right, bottom)
// Pharmacy:      walls x=40–240,  y=520–959 (left tall room, bottom half)
// Waiting Area:  walls x=360–880, y=560–880 (large center space)
// Casuality:     walls x=1000–1440,y=721–961(bottom center)
// Main Entrance: corridor x=240–880,y=958–1040 (bottom left corridor)
// Emergency Ent: corridor x=1440–1880,y=958–1040 (bottom right corridor)
//
function DepartmentLabels() {
  const departments = [
    // ---- LEFT COLUMN ----
    { name: "Cafeteria",           pos: roomCenter(40, 40, 240, 438),         color: "#e67e22",  fontSize: 20, vertical: true },
    { name: "Pharmacy",            pos: roomCenter(40, 520, 240, 959),        color: "#00b894",  fontSize: 20, vertical: true },

    // ---- TOP ROW ----
    { name: "Toilet",              pos: roomCenter(239, 40, 560, 160),        color: "#636e72",  fontSize: 20 },
    { name: "Lift",                pos: roomCenter(559, 40, 681, 160),        color: "#2d3436",  fontSize: 18 },
    { name: "Stair",               pos: roomCenter(681, 40, 901, 160),        color: "#2d3436",  fontSize: 20 },

    // ---- MID ROW ----
    { name: "Reception",           pos: roomCenter(239, 275, 558, 438),       color: "#6c5ce7",  fontSize: 24, bold: true },
    { name: "Registration",        pos: roomCenter(681, 275, 1000, 438),      color: "#2d3436",  fontSize: 24, bold: true },

    // ---- RIGHT BLOCK (OT + Lab) ----
    { name: "OT",                  pos: roomCenter(1120, 40, 1440, 315),      color: "#d63031",  fontSize: 30, bold: true },
    { name: "Lab",                 pos: roomCenter(1120, 315, 1440, 590),     color: "#e17055",  fontSize: 28, bold: true },

    // ---- FAR RIGHT WING ----
    { name: "ICU",                 pos: roomCenter(1560, 40, 1880, 241),      color: "#d63031",  fontSize: 28, bold: true },
    { name: "Recovery Ward",       pos: roomCenter(1560, 241, 1880, 480),     color: "#6c5ce7",  fontSize: 20 },
    { name: "X-Ray",               pos: roomCenter(1560, 480, 1880, 721),     color: "#00b894",  fontSize: 26, bold: true },
    { name: "Emergency",           pos: roomCenter(1560, 721, 1880, 961),     color: "#ff3838",  fontSize: 24, bold: true },

    // ---- CENTER SPACE ----
    { name: "Waiting Area",        pos: roomCenter(360, 560, 880, 880),       color: "#0984e3",  fontSize: 24, bold: true, vertical: true },

    // ---- BOTTOM ----
    { name: "Casuality",           pos: roomCenter(1000, 721, 1440, 961),     color: "#e17055",  fontSize: 24, bold: true },

    // ---- BOTTOM CORRIDOR ----
    { name: "Main Entrance",       pos: roomCenter(240, 958, 880, 1040, 35),  color: "#00cec9",  fontSize: 24, bold: true },
    { name: "Emergency Entrance",  pos: roomCenter(1440, 958, 1880, 1040, 35),color: "#ff3838",  fontSize: 20, bold: true },
  ];

  return (
    <group>
      {departments.map((dept, idx) => (
        <group key={idx} position={dept.pos}>
          {/* Background pill for text readability */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
            <planeGeometry args={[
              dept.name.length * dept.fontSize * 0.6,
              dept.fontSize * 2.2
            ]} />
            <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
          </mesh>
          <Text
            position={[0, 0, 0]}
            rotation={[-Math.PI / 2.15, 0, dept.vertical ? -Math.PI / 2 : 0]}
            fontSize={dept.fontSize}
            color={dept.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={1.2}
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
// NAVIGATION ROUTE — Main Entrance → Reception → Emergency
// ============================================================================
function NavigationRoute() {
  const h = 10;

  // Main Entrance → up into building → west to Reception
  const toReception = [
    [...svgToWorld(560, 990), h],  // Main Entrance (center of bottom corridor gap)
    [...svgToWorld(560, 720), h],  // Move north into main hallway
    [...svgToWorld(400, 720), h],  // Turn west
    [...svgToWorld(400, 357), h],  // Arrive at Reception center
  ].map(([x, z, y]) => [x, y, z]);

  // Junction → east to Casuality → Emergency
  const toEmergency = [
    [...svgToWorld(560, 720), h],  // Junction
    [...svgToWorld(940, 720), h],  // Move east
    [...svgToWorld(940, 841), h],  // Enter Casuality area
    [...svgToWorld(1220, 841), h], // Casuality center
    [...svgToWorld(1500, 841), h], // Head to Emergency wing
    [...svgToWorld(1720, 841), h], // Emergency center
  ].map(([x, z, y]) => [x, y, z]);

  return (
    <group>
      <Line points={toReception} color="#00ff88" lineWidth={8} dashed dashScale={10} dashSize={4} />
      <Line points={toEmergency} color="#00ff88" lineWidth={8} dashed dashScale={10} dashSize={4} />

      {/* Start marker — Main Entrance */}
      <mesh position={toReception[0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[18, 32]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      {/* Destination — Reception */}
      <mesh position={toReception[3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 22, 32]} />
        <meshBasicMaterial color="#6c5ce7" />
      </mesh>
      {/* Destination — Emergency */}
      <mesh position={toEmergency[5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 22, 32]} />
        <meshBasicMaterial color="#ff3838" />
      </mesh>
    </group>
  );
}

// ============================================================================
// APP
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
            Ground Floor • 2.5D Extruded Architecture
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
          17 Rooms • {WALL_HEIGHT}px Walls
        </div>
      </header>

      {/* 3D Canvas */}
      <main style={{ flex: 1, position: 'relative', background: '#1e272e' }}>
        <Canvas
          camera={{ position: [0, 900, 1000], fov: 50, near: 1, far: 6000 }}
          shadows
        >
          <ambientLight intensity={0.65} />
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
