import React from 'react';
import { Text, Line } from '@react-three/drei';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Renders the shortest path as a 3D glowing dashed line with
 * start (green circle) and destination (red ring) markers.
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
      {/* 3D Glowing Active Navigation Line */}
      <Line
        points={points3D}
        color="#00ff88"
        lineWidth={10}
        dashed={true}
        dashScale={12}
        dashSize={6}
      />

      {/* Start Location Pin */}
      <group position={[startWx, 22, startWz]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[18, 32]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
        <Text
          position={[0, 30, 0]}
          rotation={[-Math.PI / 3, 0, 0]}
          fontSize={18}
          color="#00ff88"
          outlineWidth={2}
          outlineColor="#000000"
          fontWeight="bold"
        >
          🚩 START: {startNode.name}
        </Text>
      </group>

      {/* Destination Location Pin */}
      <group position={[destWx, 22, destWz]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[16, 26, 32]} />
          <meshBasicMaterial color="#ff3838" />
        </mesh>
        <Text
          position={[0, 30, 0]}
          rotation={[-Math.PI / 3, 0, 0]}
          fontSize={18}
          color="#ff3838"
          outlineWidth={2}
          outlineColor="#000000"
          fontWeight="bold"
        >
          🎯 DESTINATION: {destNode.name}
        </Text>
      </group>
    </group>
  );
}
