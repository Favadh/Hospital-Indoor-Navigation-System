import React, { useEffect, useState } from 'react';
import { WALL_HEIGHT, WALL_THICKNESS, OFFSET_X, OFFSET_Z } from '../constants/mapConstants';

/**
 * Parses the Hospital SVG file and extrudes wall lines into 3D box meshes.
 * Also renders the outer ground plate and interior floor plate.
 */
export default function ExtrudedWalls() {
  const [walls, setWalls] = useState([]);

  useEffect(() => {
    fetch('/Hospital G.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const lineElements = doc.querySelectorAll('line');
        const segs = [];
        let id = 0;

        lineElements.forEach((el) => {
          const stroke = el.getAttribute('stroke');
          if (stroke !== 'black') return;

          const x1 = parseFloat(el.getAttribute('x1'));
          const y1 = parseFloat(el.getAttribute('y1'));
          const x2 = parseFloat(el.getAttribute('x2'));
          const y2 = parseFloat(el.getAttribute('y2'));

          const dx = x2 - x1;
          const dz = y2 - y1;
          const length = Math.hypot(dx, dz);
          if (length < 0.5) return;

          const midX = (x1 + x2) / 2 + OFFSET_X;
          const midZ = (y1 + y2) / 2 + OFFSET_Z;
          const angleY = -Math.atan2(dz, dx);

          segs.push({ id: id++, length, midX, midZ, angleY });
        });

        setWalls(segs);
      });
  }, []);

  return (
    <group>
      {/* Outer Ground Plate */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2100, 1300]} />
        <meshStandardMaterial color="#b2bec3" roughness={0.9} />
      </mesh>

      {/* Interior Floor */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1840, 1000]} />
        <meshStandardMaterial color="#dfe6e9" roughness={0.85} />
      </mesh>

      {/* Extruded Architectural Walls */}
      {walls.map((w) => (
        <mesh
          key={w.id}
          position={[w.midX, WALL_HEIGHT / 2, w.midZ]}
          rotation={[0, w.angleY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w.length, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#f0ece2" roughness={0.25} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}
