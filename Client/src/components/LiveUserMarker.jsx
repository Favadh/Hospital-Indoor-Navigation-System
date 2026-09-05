import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Navigation Arrow Marker with White Halo Base
 * - Silky-Smooth Continuous Gliding Stride Animation along the Path.
 * - True 3D Chevron Arrow with White Halo base disk.
 */
export default function LiveUserMarker({ position, heading = 0 }) {
  const groupRef = useRef();
  const arrowRef = useRef();
  const pulseRingRef = useRef();
  const currentPos = useRef(new THREE.Vector3(position ? position[0] : 0, 20, position ? position[1] : 0));
  const targetPos = useRef(new THREE.Vector3(position ? position[0] : 0, 20, position ? position[1] : 0));
  const currentHeading = useRef(typeof heading === 'number' ? heading : 0);

  useEffect(() => {
    if (!position) return;
    const dist = Math.hypot(position[0] - currentPos.current.x, position[1] - currentPos.current.z);
    if (dist > 180) {
      // Snap instantly on long teleport / route init
      currentPos.current.set(position[0], 20, position[1]);
      targetPos.current.set(position[0], 20, position[1]);
      currentHeading.current = typeof heading === 'number' ? heading : 0;
      if (groupRef.current) {
        groupRef.current.position.set(position[0], 20, position[1]);
      }
      if (arrowRef.current) {
        arrowRef.current.rotation.y = -currentHeading.current;
      }
    } else {
      targetPos.current.set(position[0], 20, position[1]);
    }
  }, [position]);

  // Create 3D Chevron Shape (Tip at +X)
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(25, 0); // Tip
    shape.lineTo(-15, -18); // Right back
    shape.lineTo(-5, 0); // Inner notch
    shape.lineTo(-15, 18); // Left back
    shape.lineTo(25, 0);

    const extrudeSettings = {
      depth: 4,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 1.5,
      bevelThickness: 1.5,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const safeDelta = Math.min(delta || 0.016, 0.1);

    // Silky smooth continuous stride gliding animation
    const posDamp = Math.min(1, 1 - Math.exp(-7 * safeDelta));
    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * posDamp;
    currentPos.current.z += (targetPos.current.z - currentPos.current.z) * posDamp;
    groupRef.current.position.set(currentPos.current.x, 20, currentPos.current.z);

    // Google Maps-grade ultra-stable shortest-arc rotation damping
    if (arrowRef.current) {
      const targetHeading = typeof heading === 'number' ? heading : 0;
      let diff = ((targetHeading - currentHeading.current + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;

      const rotDamp = Math.min(1, 1 - Math.exp(-10 * safeDelta));
      currentHeading.current += diff * rotDamp;
      arrowRef.current.rotation.y = -currentHeading.current;
    }

    // Subtle gentle pulse ring breathing
    if (pulseRingRef.current) {
      const t = state.clock.getElapsedTime();
      const s = 1 + Math.sin(t * 3) * 0.08;
      pulseRingRef.current.scale.set(s, s, s);
    }
  });

  if (!position) return null;

  return (
    <group ref={groupRef}>
      {/* 1. Outer Dark Emerald Pulse Ring */}
      <mesh
        ref={pulseRingRef}
        position={[0, 1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <circleGeometry args={[32, 32]} />
        <meshBasicMaterial
          color="#005728"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Inner Crisp White Halo Base Disk */}
      <mesh
        position={[0, 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      >
        <circleGeometry args={[22, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Deep Dark High-Contrast 3D Chevron Arrow */}
      <group ref={arrowRef}>
        <mesh
          geometry={arrowGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 5, 0]}
          renderOrder={4}
          castShadow
        >
          <meshStandardMaterial
            color="#005728"
            emissive="#003816"
            emissiveIntensity={0.25}
            roughness={0.95}
            metalness={0.0}
            envMapIntensity={0.0}
          />
        </mesh>
      </group>
    </group>
  );
}
