import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import ExtrudedWalls from './ExtrudedWalls';
import DepartmentLabels from './DepartmentLabels';
import DynamicNavigationRoute from './DynamicNavigationRoute';

/**
 * Assembles the full 3D Canvas scene: lighting, walls, navigation route,
 * department labels, and orbit camera controls.
 */
export default function MapScene({ nodes, routeData }) {
  return (
    <main style={{ flex: 1, position: 'relative', background: '#1e272e' }}>
      <Canvas camera={{ position: [0, 950, 1050], fov: 50, near: 1, far: 6000 }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[600, 1000, 500]} intensity={1.3} castShadow />
        <directionalLight position={[-500, 700, -400]} intensity={0.4} />
        <Environment preset="city" />

        <React.Suspense fallback={null}>
          <ExtrudedWalls />
          {nodes && nodes.length > 0 && <DepartmentLabels nodes={nodes} />}
          {routeData && <DynamicNavigationRoute routePath={routeData.path} />}
        </React.Suspense>

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={150}
          maxDistance={2500}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </main>
  );
}
