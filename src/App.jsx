import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Line, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { hospitalLayout } from './data/hospitalMap';

// --- EXPANDED COLOR & STYLE PALETTE ---
const materials = {
  wall: new THREE.MeshStandardMaterial({ color: '#f5f6fa', roughness: 0.1 }),
  floor: new THREE.MeshStandardMaterial({ color: '#dcdde1', roughness: 0.05 }),
  wood: new THREE.MeshStandardMaterial({ color: '#d35400', roughness: 0.8 }), // Benches, Tables
  metal: new THREE.MeshStandardMaterial({ color: '#bdc3c7', metalness: 0.8, roughness: 0.2 }), // Wheelchairs, IV stands
  plant: new THREE.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.9 }), // Plants
  fabricBlue: new THREE.MeshStandardMaterial({ color: '#0984e3', roughness: 0.9 }), // Beds, Chairs
  doorRed: new THREE.MeshStandardMaterial({ color: '#e84118', roughness: 0.2 }), // Doors
  glowYellow: new THREE.MeshStandardMaterial({ color: '#fbc531', emissive: '#fbc531', emissiveIntensity: 1 }), // Lights
  glass: new THREE.MeshStandardMaterial({ color: '#00a8ff', transparent: true, opacity: 0.3, roughness: 0 }), // Windows/IV Bags
};

// --- COMPONENTS ---

function ModularWall({ pos, size, nodes }) {
  // Randomly swap some walls to be windows just to show off the assets
  const isWindow = size[0] > 6 && Math.random() > 0.5;
  const geometry = isWindow ? (nodes.Tile_Wall_Window?.geometry || nodes.Tile_Wall.geometry) : nodes.Tile_Wall.geometry;
  const mat = isWindow ? materials.glass : materials.wall;

  return (
    <mesh 
      position={pos} 
      scale={size} 
      geometry={geometry} 
      material={mat} 
      castShadow 
      receiveShadow
    />
  );
}

function DecorProp({ geometry, material, pos, scale = [1,1,1], rotation = [0,0,0] }) {
  if (!geometry) return null;
  return (
    <mesh 
      position={pos} 
      rotation={rotation}
      scale={scale} 
      geometry={geometry} 
      material={material} 
      castShadow
      receiveShadow
    />
  );
}

function RoomZone({ name, pos, color, isLift, nodes }) {
  return (
    <group position={pos}>
      {/* Floor Tile */}
      <mesh position={[0, 0.01, 0]} scale={[6, 1, 8]} geometry={nodes.Floor_tile_1.geometry} material={materials.floor} receiveShadow />
      
      {/* Room Highlight Zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[5.8, 7.8]} />
        <meshStandardMaterial color={color} opacity={0.3} transparent />
      </mesh>
      
      {/* Room Label */}
      <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.6} color="#2c3e50" anchorX="center" anchorY="middle">
        {name}
      </Text>

      {/* Dynamic Populated Props based on Room Type */}
      {isLift ? (
        <group>
          <DecorProp geometry={nodes.Exit_sign?.geometry} material={materials.doorRed} pos={[0, 1.5, -3.8]} scale={[2,2,2]} />
          <DecorProp geometry={nodes.Door_swing?.geometry} material={materials.metal} pos={[0, 0, -4]} />
        </group>
      ) : name.includes('Ward') || name.includes('Casualty') || name.includes('ICU') ? (
        <group>
          {/* Hospital Beds with Blue Fabric */}
          <DecorProp geometry={nodes.Bed?.geometry} material={materials.fabricBlue} pos={[-1.5, 0.05, -2]} scale={[1.2, 1.2, 1.2]} />
          <DecorProp geometry={nodes.Bed?.geometry} material={materials.fabricBlue} pos={[1.5, 0.05, -2]} scale={[1.2, 1.2, 1.2]} />
          {/* IV stands (Metal + Glass bag) */}
          <DecorProp geometry={nodes.Iv_bag_holder?.geometry} material={materials.metal} pos={[-2.5, 0.05, -2]} />
          <DecorProp geometry={nodes.IV_bag?.geometry} material={materials.glass} pos={[-2.5, 1.5, -2]} />
        </group>
      ) : name.includes('Reception') || name.includes('Registration') ? (
        <group>
          {/* Wooden desks and chairs and plants */}
          <DecorProp geometry={nodes.Table?.geometry} material={materials.wood} pos={[0, 0.05, 0]} scale={[1.5, 1, 1.5]} />
          <DecorProp geometry={nodes.Chair?.geometry} material={materials.fabricBlue} pos={[0, 0.05, 1.5]} />
          <DecorProp geometry={nodes.Plant_leaves?.geometry} material={materials.plant} pos={[-2, 0.05, -2]} scale={[1.5, 1.5, 1.5]} />
          <DecorProp geometry={nodes.Plant_leaves?.geometry} material={materials.plant} pos={[2, 0.05, -2]} scale={[1.5, 1.5, 1.5]} />
        </group>
      ) : (
        <group>
          {/* Doctor Offices / Pharmacies */}
          <DecorProp geometry={nodes.Cabinet_1?.geometry} material={materials.wood} pos={[-2, 0.05, -3]} scale={[1.5, 1.5, 1.5]} />
          <DecorProp geometry={nodes.Cabinet_2?.geometry} material={materials.metal} pos={[2, 0.05, -3]} scale={[1.5, 1.5, 1.5]} />
          <DecorProp geometry={nodes.Landline_phone?.geometry} material={materials.doorRed} pos={[-2, 1.2, -3]} />
        </group>
      )}

      {/* Ceiling Light in every room */}
      <DecorProp geometry={nodes.Ceiling_Light?.geometry} material={materials.glowYellow} pos={[0, 1.9, 0]} scale={[2, 2, 2]} />
    </group>
  );
}

function HospitalMap({ floorData, nodes }) {
  const { walls, rooms, route } = floorData;

  return (
    <group>
      {/* Extracted Modular Walls */}
      {walls.map((wall, idx) => (
        <ModularWall key={idx} pos={wall.pos} size={wall.size} nodes={nodes} />
      ))}

      {/* Add Benches and Wheelchairs randomly in Corridors */}
      <DecorProp geometry={nodes.Bench?.geometry} material={materials.wood} pos={[-4, 0.05, 0]} rotation={[0, Math.PI/2, 0]} scale={[1.2, 1.2, 1.2]} />
      <DecorProp geometry={nodes.Bench?.geometry} material={materials.wood} pos={[4, 0.05, 0]} rotation={[0, Math.PI/2, 0]} scale={[1.2, 1.2, 1.2]} />
      <DecorProp geometry={nodes.Wheel_chair?.geometry} material={materials.metal} pos={[-1.5, 0.05, -1]} rotation={[0, 0.5, 0]} scale={[1.5, 1.5, 1.5]} />
      <DecorProp geometry={nodes.Wheel_chair?.geometry} material={materials.metal} pos={[8, 0.05, -1]} rotation={[0, -0.5, 0]} scale={[1.5, 1.5, 1.5]} />

      {/* Rooms & Props */}
      {rooms.map((room, idx) => (
        <RoomZone key={idx} name={room.name} pos={room.pos} color={room.color} isLift={room.isLift} nodes={nodes} />
      ))}

      {/* Navigation Path */}
      <Line points={route} color="#00ff88" lineWidth={8} dashed={true} dashScale={20} dashSize={1} />
      <mesh position={route[route.length - 1]} rotation={[-Math.PI/2, 0, 0]}><ringGeometry args={[0.5, 0.8, 32]} /><meshBasicMaterial color="#00ff88" /></mesh>
      <mesh position={route[0]} rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[0.4, 32]} /><meshBasicMaterial color="#3498db" /></mesh>
    </group>
  );
}

export default function App() {
  const [activeFloorId, setActiveFloorId] = useState(0);
  const currentFloor = hospitalLayout.floors.find(f => f.id === activeFloorId);
  const { nodes } = useGLTF('/hospital.glb');
  
  if (!nodes || !nodes.Tile_Wall) return <div style={{color: 'white', background: 'black', height: '100vh'}}>Loading 3D Assets...</div>;

  const startX = currentFloor.route[0][0];
  const startZ = currentFloor.route[0][2];

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1.5rem', background: '#1a1a2e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#00ff88' }}>Smart Hospital Navigation</h1>
          <p style={{ margin: '0.2rem 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>{currentFloor.name} - Populated Color Test</p>
        </div>
      </header>
      
      <main style={{ flex: 1, position: 'relative', background: '#0f3460' }}>
        <div style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(26, 26, 46, 0.8)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10 }}>
          <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1rem', textAlign: 'center' }}>Floors</h3>
          {hospitalLayout.floors.slice().reverse().map((floor) => (
            <button key={floor.id} onClick={() => setActiveFloorId(floor.id)} style={{ padding: '12px 20px', border: 'none', borderRadius: '6px', background: activeFloorId === floor.id ? '#00ff88' : '#16213e', color: activeFloorId === floor.id ? '#000' : '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
              {floor.level}
            </button>
          ))}
        </div>

        <Canvas camera={{ position: [startX, 8, startZ + 8], fov: 60, near: 0.1, far: 1000 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
          <Environment preset="apartment" />
          
          <React.Suspense fallback={null}>
            <HospitalMap floorData={currentFloor} nodes={nodes} />
          </React.Suspense>
          
          <OrbitControls makeDefault target={[startX, 0, startZ]} maxPolarAngle={Math.PI / 2.2} minDistance={2} maxDistance={30} />
        </Canvas>
      </main>
    </div>
  );
}

useGLTF.preload('/hospital.glb');
