import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Navigation Arrow Marker with White Halo Base (Friend's Exact Chevron & Base Geometry)
 * - 100% Locked & Aligned with path progression.
 * - Smooth Stride Gliding: Continuous cubic ease-out stride interpolation.
 * - True 3D Chevron Arrow with White Halo base disk.
 */
export default function LiveUserMarker({ position, heading = 0, isActive = true }) {
  const groupRef = useRef();
  const arrowRef = useRef();
  const haloRef = useRef();

  // Animation interpolation state
  const animRef = useRef({
    currentPos: new THREE.Vector3(position[0], 18, position[1]),
    startPos: new THREE.Vector3(position[0], 18, position[1]),
    targetPos: new THREE.Vector3(position[0], 18, position[1]),
    startTime: performance.now(),
    duration: 420, // ms duration of stride glide
    isAnimating: false,
  });

  // Track position prop updates and trigger continuous stride glide
  useEffect(() => {
    const a = animRef.current;
    const targetX = position[0];
    const targetZ = position[1];

    const dist = Math.hypot(targetX - a.currentPos.x, targetZ - a.currentPos.z);

    if (dist < 0.1) return;

    if (dist > 180) {
      // Teleport / initial load jump: snap immediately
      a.currentPos.set(targetX, 18, targetZ);
      a.startPos.set(targetX, 18, targetZ);
      a.targetPos.set(targetX, 18, targetZ);
      a.isAnimating = false;
      if (groupRef.current) {
        groupRef.current.position.set(targetX, 18, targetZ);
      }
    } else {
      // Natural walking stride glide
      a.startPos.copy(a.currentPos);
      a.targetPos.set(targetX, 18, targetZ);
      a.startTime = performance.now();
      a.duration = Math.max(350, Math.min(500, dist * 18));
      a.isAnimating = true;
    }
  }, [position]);

  // Create friend's 3D Chevron Shape (Tip at +X)
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

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    return geom;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const a = animRef.current;
    const now = performance.now();

    // 1. Continuous Position Gliding (Cubic Ease-Out)
    if (a.isAnimating) {
      const elapsed = now - a.startTime;
      const progress = Math.min(1.0, Math.max(0.0, elapsed / a.duration));

      // Cubic Ease-Out
      const easeOut = 1 - Math.pow(1 - progress, 3);

      a.currentPos.x = a.startPos.x + (a.targetPos.x - a.startPos.x) * easeOut;
      a.currentPos.z = a.startPos.z + (a.targetPos.z - a.startPos.z) * easeOut;

      // Subtle natural vertical step bounce
      const stepBounce = Math.sin(progress * Math.PI) * 1.5;
      a.currentPos.y = 18 + stepBounce;

      if (progress >= 1.0) {
        a.isAnimating = false;
        a.currentPos.copy(a.targetPos);
      }
    } else {
      a.currentPos.lerp(a.targetPos, Math.min(1, delta * 8));
      a.currentPos.y = 18;
    }

    groupRef.current.position.copy(a.currentPos);

    // 2. Shortest-Arc Heading Rotation
    if (arrowRef.current) {
      const currentRot = arrowRef.current.rotation.y;
      const targetRot = -heading;
      let diff = ((targetRot - currentRot + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;

      const rotDamp = Math.min(1, 1 - Math.exp(-12 * delta));
      arrowRef.current.rotation.y = currentRot + diff * rotDamp;
    }

    // 3. Subtle breathing scale for white halo
    if (haloRef.current) {
      const time = state.clock.getElapsedTime();
      const scale = 1 + 0.06 * Math.sin(time * 2.5);
      haloRef.current.scale.set(scale, scale, 1);
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={[position[0], 18, position[1]]}>
      {/* 1. White Halo Base Disk */}
      <mesh ref={haloRef} position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={998}>
        <circleGeometry args={[32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthTest={false} depthWrite={false} />
      </mesh>

      {/* 2. 3D Chevron Arrow */}
      <group ref={arrowRef} rotation={[0, -heading, 0]}>
        <mesh geometry={arrowGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 4, 0]} renderOrder={1000} castShadow>
          <meshStandardMaterial
            color="#00ff88"
            emissive="#004422"
            emissiveIntensity={0.4}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
}
