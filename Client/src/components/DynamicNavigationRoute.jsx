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

  const lastProjRef = useRef(null);
  const lastIndexRef = useRef(-1);

  const [points, setPoints] = useState({
    completed: [],
    remaining: fullPoints3D,
  });

  const smoothPosRef = useRef({
    x: liveUserPosition ? liveUserPosition[0] : 0,
    z: liveUserPosition ? liveUserPosition[1] : 0,
  });

  // Snap position on route change or teleport
  useEffect(() => {
    lastProjRef.current = null;
    lastIndexRef.current = -1;
    if (liveUserPosition) {
      smoothPosRef.current.x = liveUserPosition[0];
      smoothPosRef.current.z = liveUserPosition[1];
    }
  }, [liveUserPosition, routePath]);

  useFrame((_, delta) => {
    if (!liveUserPosition) return;

    const smooth = smoothPosRef.current;
    const distToTarget = Math.hypot(liveUserPosition[0] - smooth.x, liveUserPosition[1] - smooth.z);

    if (distToTarget > 180) {
      smooth.x = liveUserPosition[0];
      smooth.z = liveUserPosition[1];
    } else {
      const damp = Math.min(1, 1 - Math.exp(-12 * delta));
      smooth.x += (liveUserPosition[0] - smooth.x) * damp;
      smooth.z += (liveUserPosition[1] - smooth.z) * damp;
    }

    const ux = smooth.x;
    const uz = smooth.z;

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

      const last = lastProjRef.current;
      const moved =
        !last ||
        closestIndex !== lastIndexRef.current ||
        Math.hypot(projPoint[0] - last[0], projPoint[2] - last[2]) > 0.3;

      if (moved) {
        lastProjRef.current = projPoint;
        lastIndexRef.current = closestIndex;

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
      }
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
    </group>
  );
}
