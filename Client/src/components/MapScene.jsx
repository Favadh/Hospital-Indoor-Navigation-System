import React, { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import ExtrudedWalls from './ExtrudedWalls';
import DepartmentLabels from './DepartmentLabels';
import DynamicNavigationRoute from './DynamicNavigationRoute';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Focuses the 3D camera and OrbitControls on the specified target position.
 */
function CameraFocusController({ targetPos }) {
  const { camera } = useThree();
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    if (!targetPos) return;
    const [tx, ty, tz] = targetPos;

    // Angle camera 450 units above and 450 units back from the current location
    camera.position.set(tx, 450, tz + 450);
    if (controls) {
      controls.target.set(tx, ty, tz);
      controls.update();
    } else {
      camera.lookAt(tx, ty, tz);
    }
  }, [targetPos, camera, controls]);

  return null;
}

/**
 * 3D Pin Beacon marker highlighting the user's current location on the map.
 */
function CurrentLocationBeacon({ position }) {
  return (
    <group position={position}>
      {/* Floor Pulse Ring */}
      <mesh position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 22, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.7} />
      </mesh>

      {/* Floating Center Sphere */}
      <mesh position={[0, 12, 0]}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Directional Beacon Pin */}
      <mesh position={[0, 26, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[7, 16, 16]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={1.8}
        />
      </mesh>
    </group>
  );
}

/**
 * Assembles the full 3D Canvas scene: lighting, walls, navigation route,
 * department labels, current location beacon, and orbit camera controls.
 */
export default function MapScene({ nodes, routeData, startName }) {
  // Find coordinates of current location node
  const startNode = useMemo(() => {
    if (!nodes || !startName) return null;
    return nodes.find((n) => n.name === startName);
  }, [nodes, startName]);

  const targetWorldPos = useMemo(() => {
    if (!startNode) return [0, 0, 0];
    const [wx, wz] = svgToWorld(startNode.x, startNode.y);
    return [wx, 0, wz];
  }, [startNode]);

  return (
    <main
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#1e272e',
      }}
    >
      <Canvas
        style={{ width: '100%', height: '100%', display: 'block' }}
        camera={{
          position: targetWorldPos
            ? [targetWorldPos[0], 450, targetWorldPos[2] + 450]
            : [0, 950, 1050],
          fov: 50,
          near: 1,
          far: 6000,
        }}
        shadows
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[600, 1000, 500]}
          intensity={1.3}
          castShadow
        />
        <directionalLight position={[-500, 700, -400]} intensity={0.4} />
        <Environment preset="city" />

        <CameraFocusController targetPos={targetWorldPos} />

        <React.Suspense fallback={null}>
          <ExtrudedWalls />
          {nodes && nodes.length > 0 && <DepartmentLabels nodes={nodes} />}
          {startNode && <CurrentLocationBeacon position={targetWorldPos} />}
          {routeData && <DynamicNavigationRoute routePath={routeData.path} />}
        </React.Suspense>

        <OrbitControls
          makeDefault
          target={targetWorldPos || [0, 0, 0]}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={120}
          maxDistance={2800}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </main>
  );
}
