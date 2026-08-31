import React from 'react';
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
 * Renders the navigation route as a progress bar:
 * - Un-traversed path ahead is grey (#576574).
 * - Traversed path behind the user is filled with glowing green (#00ff88).
 * - Strictly follows the corridor centerline: NEVER bends or connects sideways to off-path arrows.
 * - Stops progress if the user drifts away from the corridor.
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

  let completedPoints = [];
  let remainingPoints = fullPoints3D;

  if (isTrackingActive && liveUserPosition) {
    const ux = liveUserPosition[0];
    const uz = liveUserPosition[1];

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

    // Only progress if user is within reasonable corridor distance (<= 65 units)
    if (bestProj && minDistance <= 65) {
      // The projected point directly on the corridor centerline (NEVER bent sideways)
      const projPoint = [bestProj.x, 18, bestProj.z];

      completedPoints = [
        ...fullPoints3D.slice(0, closestIndex + 1),
        projPoint,
      ];

      remainingPoints = [
        projPoint,
        ...fullPoints3D.slice(closestIndex + 1),
      ];
    } else {
      // If user drifts far away from path, freeze progression and show straight route
      remainingPoints = fullPoints3D;
      completedPoints = [];
    }
  }

  return (
    <group>
      {/* 1. Traversed Path Behind (Muted Grey — already walked) */}
      {completedPoints && completedPoints.length >= 2 && (
        <Line
          points={completedPoints}
          color="#5765749d"
          lineWidth={8}
        />
      )}

      {/* 2. Remaining Path Ahead (Glowing Green — regresses as arrow moves) */}
      {remainingPoints && remainingPoints.length >= 2 && (
        <Line
          points={remainingPoints}
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
