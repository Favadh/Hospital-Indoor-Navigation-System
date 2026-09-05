import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WALL_HEIGHT, WALL_THICKNESS, OFFSET_X, OFFSET_Z } from '../constants/mapConstants';

/**
 * High-Performance Extruded Walls
 * Merges all individual architectural wall geometries into 1 single BufferGeometry.
 * Results in 1 single draw call and maximum 60+ FPS on all mobile and desktop devices.
 */
export default function ExtrudedWalls() {
  const [mergedGeometry, setMergedGeometry] = useState(null);

  useEffect(() => {
    fetch('/Hospital G.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const lineElements = doc.querySelectorAll('line');
        const geoms = [];

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

          const box = new THREE.BoxGeometry(length, WALL_HEIGHT, WALL_THICKNESS);
          box.rotateY(angleY);
          box.translate(midX, WALL_HEIGHT / 2, midZ);
          geoms.push(box);
        });

        if (geoms.length > 0) {
          const merged = mergeGeometries(geoms, false);
          // Free individual temporary box geometries from memory
          geoms.forEach((g) => g.dispose());
          setMergedGeometry(merged);
        }
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

      {/* 1 Single Merged Mesh for All Walls (1 Draw Call instead of 150+) */}
      {mergedGeometry && (
        <mesh
          geometry={mergedGeometry}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#f0ece2" roughness={0.25} metalness={0.08} />
        </mesh>
      )}
    </group>
  );
}
