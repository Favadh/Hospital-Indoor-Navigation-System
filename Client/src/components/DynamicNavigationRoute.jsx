import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Projects point P(px, pz) onto segment A(ax, az) -> B(bx, bz)
 */
function projectPointOnSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;

  const abLenSq = abx * abx + abz * abz;
  if (abLenSq === 0) return { x: ax, z: az, t: 0 };

  let t = (apx * abx + apz * abz) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: ax + t * abx,
    z: az + t * abz,
    t,
  };
}

/**
 * Renders the navigation route with continuous smooth regression:
 * - Un-traversed path ahead is glowing green (#00ff88) and smoothly regresses at 60fps.
 * - Traversed path behind the user is muted grey (#576574).
 * - Continuous interpolation ensures zero step-jump stuttering.
 */
export default function DynamicNavigationRoute({
  routePath,
  liveUserPosition,
  isTrackingActive,
}) {
  if (!routePath || routePath.length < 2) return null;

  const fullPoints3D = routePath.map((n) => {
    const [wx, wz] = svgToWorld(n.x, n.y);
    return [wx, 18, wz];
  });

  const startNode = routePath[0];
  const destNode = routePath[routePath.length - 1];
  const [startWx, startWz] = svgToWorld(startNode.x, startNode.y);
  const [destWx, destWz] = svgToWorld(destNode.x, destNode.y);

  // Smooth interpolated position for 60fps continuous line regression
  const smoothPosRef = useRef(
    liveUserPosition ? [liveUserPosition[0], liveUserPosition[1]] : [startWx, startWz]
  );

  const [points, setPoints] = useState({
    completed: [],
    remaining: fullPoints3D,
  });

  // Snap position on route change or teleport
  useEffect(() => {
    if (liveUserPosition) {
      const dist = Math.hypot(
        liveUserPosition[0] - smoothPosRef.current[0],
        liveUserPosition[1] - smoothPosRef.current[1]
      );
      if (dist > 180) {
        smoothPosRef.current = [liveUserPosition[0], liveUserPosition[1]];
      }
    }
  }, [liveUserPosition, routePath]);

  useFrame((_, delta) => {
    if (!isTrackingActive || !liveUserPosition) return;

    const targetX = liveUserPosition[0];
    const targetZ = liveUserPosition[1];

    // Smoothly glide line projection coordinate towards target
    const lerpFactor = Math.min(1, delta * 8.5);
    smoothPosRef.current[0] += (targetX - smoothPosRef.current[0]) * lerpFactor;
    smoothPosRef.current[1] += (targetZ - smoothPosRef.current[1]) * lerpFactor;

    const ux = smoothPosRef.current[0];
    const uz = smoothPosRef.current[1];

    let minDistance = Infinity;
    let closestIndex = 0;
    let bestProj = null;

    for (let i = 0; i < fullPoints3D.length - 1; i++) {
      const pA = fullPoints3D[i];
      const pB = fullPoints3D[i + 1];
      const proj = projectPointOnSegment(ux, uz, pA[0], pA[2], pB[0], pB[2]);
      const dist = Math.hypot(ux - proj.x, uz - proj.z);

      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
        bestProj = proj;
      }
    }

    if (bestProj && minDistance <= 65) {
      const projPoint = [bestProj.x, 18, bestProj.z];

      const newCompleted = [
        ...fullPoints3D.slice(0, closestIndex + 1),
        projPoint,
      ];

      const newRemaining = [
        projPoint,
        ...fullPoints3D.slice(closestIndex + 1),
      ];

      setPoints({
        completed: newCompleted,
        remaining: newRemaining,
      });
    } else {
      setPoints({
        completed: [],
        remaining: fullPoints3D,
      });
    }
  });

  return (
    <group>
      {/* 1. Traversed Path Behind (Muted Grey — already walked) */}
      {points.completed && points.completed.length >= 2 && (
        <Line
          points={points.completed}
          color="#576574"
          lineWidth={8}
        />
      )}

      {/* 2. Remaining Path Ahead (Glowing Green — regresses smoothly) */}
      {points.remaining && points.remaining.length >= 2 && (
        <Line
          points={points.remaining}
          color="#00ff88"
          lineWidth={10}
        />
      )}

      {/* Start Location Floor Marker */}
      <mesh position={[startWx, 14, startWz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 32]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {/* Destination Location Floor Ring */}
      <mesh position={[destWx, 14, destWz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12, 20, 32]} />
        <meshBasicMaterial color="#ff3838" />
      </mesh>
    </group>
  );
}
