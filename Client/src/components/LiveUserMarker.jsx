import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Green Navigation Arrow Marker with Continuous Fluid Walking Animation
 * - Smooth Stride Gliding: Eliminates discrete step jumping with continuous cubic ease-out stride interpolation.
 * - Organic Walking Bob: Adds a subtle natural vertical cadence during movement.
 * - Continuous Heading Rotation: Smooth shortest-arc yaw rotation.
 */
export default function LiveUserMarker({ position, heading = 0, isActive = true }) {
  const groupRef = useRef();
  const arrowRef = useRef();
  const ringRef = useRef();

  // Animation interpolation state
  const animRef = useRef({
    currentPos: new THREE.Vector3(position[0], 18, position[1]),
    startPos: new THREE.Vector3(position[0], 18, position[1]),
    targetPos: new THREE.Vector3(position[0], 18, position[1]),
    startTime: performance.now(),
    duration: 420, // ms duration of stride glide
    isAnimating: false,
    lastInputX: position[0],
    lastInputZ: position[1],
  });

  // Track position prop updates and trigger continuous stride glide
  useEffect(() => {
    const a = animRef.current;
    const targetX = position[0];
    const targetZ = position[1];

    const dist = Math.hypot(targetX - a.currentPos.x, targetZ - a.currentPos.z);

    if (dist < 0.1) return;

    if (dist > 180) {
      // Teleport / initial load / re-routing jump: snap immediately
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
      a.duration = Math.max(380, Math.min(520, dist * 18));
      a.isAnimating = true;
    }

    a.lastInputX = targetX;
    a.lastInputZ = targetZ;
  }, [position]);

  // Create an extruded 3D Chevron Arrow Shape (Pointing Forward towards -Z)
  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape();
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

    const a = animRef.current;
    const now = performance.now();

    // 1. Continuous Position Gliding (Cubic Ease-Out)
    if (a.isAnimating) {
      const elapsed = now - a.startTime;
      const progress = Math.min(1.0, Math.max(0.0, elapsed / a.duration));

      // Cubic Ease-Out: 1 - (1 - t)^3 (starts briskly, glides smoothly to a soft landing)
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
      // Asymptotic settle when stationary
      a.currentPos.lerp(a.targetPos, Math.min(1, delta * 8));
      a.currentPos.y = 18;
    }

    groupRef.current.position.copy(a.currentPos);

    // 2. Continuous Shortest-Arc Heading Rotation
    if (arrowRef.current) {
      const currentRot = arrowRef.current.rotation.y;
      const targetRot = -heading;
      let diff = ((targetRot - currentRot + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;

      // Smooth damped turn interpolation (exponential decay)
      const rotDamp = Math.min(1, 1 - Math.exp(-12 * delta));
      arrowRef.current.rotation.y = currentRot + diff * rotDamp;
    }

    // 3. Pulse animation for floor ring
    if (ringRef.current) {
      const time = state.clock.getElapsedTime();
      const scale = 1 + 0.16 * Math.sin(time * 3);
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={[position[0], 18, position[1]]}>
      {/* 1. Floor Pulsing Emerald Glow Ring */}
      <mesh ref={ringRef} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 22, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Forward-Facing Green 3D Navigation Arrow (Glides smoothly) */}
      <group ref={arrowRef} position={[0, 10, 0]}>
        <mesh geometry={arrowGeometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#00ff88"
            emissive="#006633"
            emissiveIntensity={0.4}
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>
      </group>
    </group>
  );
}
