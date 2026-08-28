import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Live User Marker with:
 * - Real-time position interpolation (smooth step gliding)
 * - Rotating Directional Compass Heading Arrow (facing where the phone points)
 * - Pulsing Radar Floor Beacon
 */
export default function LiveUserMarker({ position, heading = 0, isActive = true }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const arrowRef = useRef();

  // Target coordinates for smooth lerping
  const targetPos = useRef(new THREE.Vector3(position[0], 16, position[1]));
  const targetRot = useRef(heading);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Update targets
    targetPos.current.set(position[0], 16, position[1]);
    targetRot.current = heading;

    // Smooth position lerping
    groupRef.current.position.lerp(targetPos.current, Math.min(1, delta * 12));

    // Smooth heading rotation lerping around Y axis
    if (arrowRef.current) {
      // In Three.js: 0 rad heading = North (-Z), rotate around Y axis
      arrowRef.current.rotation.y = THREE.MathUtils.lerp(
        arrowRef.current.rotation.y,
        -heading,
        Math.min(1, delta * 15)
      );
    }

    // Pulse animation on floor ring
    if (ringRef.current) {
      const time = state.clock.getElapsedTime();
      const scale = 1 + 0.25 * Math.sin(time * 3);
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={[position[0], 16, position[1]]}>
      {/* 1. Pulsing Electric Cyan Radar Ring on Floor */}
      <mesh ref={ringRef} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[16, 24, 32]} />
        <meshBasicMaterial color="#00d2d3" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Central Glowing Location Sphere */}
      <mesh position={[0, 10, 0]}>
        <sphereGeometry args={[9, 20, 20]} />
        <meshStandardMaterial
          color="#00d2d3"
          emissive="#00d2d3"
          emissiveIntensity={2.2}
        />
      </mesh>

      {/* 3. Real-Time Directional Compass Arrow (Points where phone is facing) */}
      <group ref={arrowRef} position={[0, 14, 0]}>
        {/* Forward Pointer Cone */}
        <mesh position={[0, 0, -22]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[7, 18, 16]} />
          <meshStandardMaterial
            color="#ff9f43"
            emissive="#ff9f43"
            emissiveIntensity={2.0}
          />
        </mesh>

        {/* Direction Beam Indicator */}
        <mesh position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 14, 12]} />
          <meshStandardMaterial
            color="#ff9f43"
            emissive="#ff9f43"
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    </group>
  );
}
