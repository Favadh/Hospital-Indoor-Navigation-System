import React from 'react';
import { Line } from '@react-three/drei';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Renders the shortest path as a 3D solid glowing line with
 * start (green circle) and destination (red ring) floor markers.
 */
export default function DynamicNavigationRoute({ routePath }) {
  if (!routePath || routePath.length < 2) return null;

  const points3D = routePath.map((n) => {
    const [wx, wz] = svgToWorld(n.x, n.y);
    return [wx, 18, wz];
  });

  const startNode = routePath[0];
  const destNode = routePath[routePath.length - 1];
  const [startWx, startWz] = svgToWorld(startNode.x, startNode.y);
  const [destWx, destWz] = svgToWorld(destNode.x, destNode.y);

  return (
    <group>
      {/* Solid 3D Glowing Active Navigation Line */}
      <Line
        points={points3D}
        color="#00c96b"
        lineWidth={8}
      />

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
