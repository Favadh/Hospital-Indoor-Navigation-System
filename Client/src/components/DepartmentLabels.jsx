import React from 'react';
import { Text } from '@react-three/drei';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Renders floating 3D text labels for each room and entrance on the map.
 */
export default function DepartmentLabels({ nodes }) {
  // Only show labels for rooms and entrances, not junctions
  const labelNodes = nodes.filter((n) => n.type === 'room' || n.type === 'entrance');

  return (
    <group>
      {labelNodes.map((n, idx) => {
        const [wx, wz] = svgToWorld(n.x, n.y);

        return (
          <Text
            key={n._id || n.name || idx}
            position={[wx, 30, wz]}
            rotation={[-Math.PI / 3, 0, 0]}
            fontSize={16}
            color={n.type === 'entrance' ? '#00ff88' : '#ffffff'}
            outlineWidth={1.5}
            outlineColor="#000000"
            anchorX="center"
            anchorY="bottom"
            fontWeight="bold"
          >
            {n.name}
          </Text>
        );
      })}
    </group>
  );
}
