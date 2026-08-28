import React from 'react';
import { Text } from '@react-three/drei';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Renders floating 3D text labels for each room and entrance on the map.
 * - Default: White (#ffffff) for all rooms and entrances (Main Entrance, Emergency, etc.)
 * - When navigating/selected:
 *   - Current / Start Location: Green (#00ff88)
 *   - Destination Location: Red (#ff3838)
 */
export default function DepartmentLabels({ nodes, startName, destName, routeData }) {
  // Only show labels for rooms and entrances, not junctions
  const labelNodes = nodes.filter((n) => n.type === 'room' || n.type === 'entrance');

  // Determine active start and destination names if a route is active
  const activeStart = routeData?.startNode?.name || routeData?.path?.[0]?.name || startName;
  const activeDest =
    routeData?.destNode?.name ||
    routeData?.path?.[routeData?.path?.length - 1]?.name ||
    destName;

  return (
    <group>
      {labelNodes.map((n, idx) => {
        const [wx, wz] = svgToWorld(n.x, n.y);

        // Determine label color
        let textColor = '#ffffff';
        if (activeStart && n.name === activeStart) {
          textColor = '#00ff88'; // Green for Current/Start location
        } else if (activeDest && n.name === activeDest) {
          textColor = '#ff3838'; // Red for Destination location
        }

        return (
          <Text
            key={n._id || n.name || idx}
            position={[wx, 30, wz]}
            rotation={[-Math.PI / 3, 0, 0]}
            fontSize={16}
            color={textColor}
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
