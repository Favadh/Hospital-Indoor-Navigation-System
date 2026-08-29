import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Green Navigation Arrow Marker
 * - Perfectly aligned with Three.js world axes: Points directly towards -Z (North) at heading = 0.
 * - Rotates horizontally with silky smooth, zero-lag damping.
 */
export default function LiveUserMarker({ position, heading = 0, isActive = true }) {
  const groupRef = useRef();
  const arrowRef = useRef();
  const ringRef = useRef();

  const targetPos = useRef(new THREE.Vector3(position[0], 18, position[1]));

  // Create an extruded 3D Chevron Arrow Shape (Pointing Forward towards -Z)
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Tip at +Y in 2D shape (which maps to -Z forward in 3D world after X: -PI/2 rotation)
    shape.moveTo(0, 26); // Arrow tip
    shape.lineTo(16, -14);
    shape.lineTo(6, -8);
    shape.lineTo(6, -20);
    shape.lineTo(-6, -20);
    shape.lineTo(-6, -8);
    shape.lineTo(-16, -14);
    shape.closePath();

    const extrudeSettings = {
      depth: 5,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 1.2,
      bevelThickness: 1.2,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    targetPos.current.set(position[0], 18, position[1]);
    groupRef.current.position.lerp(targetPos.current, Math.min(1, delta * 12));

    if (arrowRef.current) {
      // Heading in radians: 0 rad = North (-Z), rotates around world Y axis
      const currentRot = arrowRef.current.rotation.y;
      const targetRot = -heading;
      let diff = ((targetRot - currentRot + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;

      // Responsive smooth rotation
      arrowRef.current.rotation.y = THREE.MathUtils.lerp(
        currentRot,
        currentRot + diff,
        Math.min(1, delta * 14)
      );
    }

    if (ringRef.current) {
      const time = state.clock.getElapsedTime();
      const scale = 1 + 0.18 * Math.sin(time * 3);
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={[position[0], 18, position[1]]}>
      {/* 1. Floor Pulsing Emerald Glow Ring */}
      <mesh ref={ringRef} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 22, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Forward-Facing Green 3D Navigation Arrow (Rotates Horizontally) */}
      <group ref={arrowRef} position={[0, 10, 0]}>
        <mesh geometry={arrowGeometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={2.4}
            roughness={0.15}
            metalness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
