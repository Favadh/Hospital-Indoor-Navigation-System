import React from 'react';
import { Text, Line } from '@react-three/drei';

// --- COORDINATE CONVERSION (must match App.jsx constants) ---
const SVG_W = 1920;
const SVG_H = 1080;
const OFFSET_X = -SVG_W / 2;
const OFFSET_Z = -SVG_H / 2;

function svgToWorld(sx, sy) {
  return [sx + OFFSET_X, sy + OFFSET_Z];
}

// ============================================================================
// 3D GRAPH DEBUG OVERLAY (Admin / Dev Tool)
// Renders all nodes as colored spheres and all edges as green lines on the 3D map
// ============================================================================
export default function GraphDebugOverlay({ nodes, edges }) {
  const getNodeColor = (type) => {
    switch (type) {
      case 'room': return '#ff3838';
      case 'entrance': return '#00ff88';
      case 'junction': return '#00d2d3';
      default: return '#ffffff';
    }
  };

  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.name, n));

  return (
    <group>
      {/* Render Edges */}
      {edges.map((e, idx) => {
        const n1 = nodeMap.get(e.from);
        const n2 = nodeMap.get(e.to);
        if (!n1 || !n2) return null;

        const p1 = svgToWorld(n1.x, n1.y);
        const p2 = svgToWorld(n2.x, n2.y);
        const points = [
          [p1[0], 15, p1[1]],
          [p2[0], 15, p2[1]],
        ];

        return (
          <Line key={`edge-${idx}`} points={points} color="#00ff88" lineWidth={3} opacity={0.6} transparent />
        );
      })}

      {/* Render Nodes */}
      {nodes.map((n, idx) => {
        const [wx, wz] = svgToWorld(n.x, n.y);
        const color = getNodeColor(n.type);

        return (
          <group key={n._id || n.name || idx} position={[wx, 15, wz]}>
            <mesh>
              <sphereGeometry args={[10, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>

            <Text
              position={[0, 22, 0]}
              rotation={[-Math.PI / 3, 0, 0]}
              fontSize={13}
              color="#ffffff"
              outlineWidth={1}
              outlineColor="#000000"
              anchorX="center"
              anchorY="bottom"
              fontWeight="bold"
            >
              {`${n.name}\n(${n.x}, ${n.y})`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
