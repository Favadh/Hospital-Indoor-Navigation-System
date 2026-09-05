import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Animated Pinpoint Marker for Destination
 * Features:
 * - Floating, gently bobbing 3D red teardrop pin with white core and border outline.
 * - Animated base floor circle below with halo breathing pulse scaling.
 */
export default function DestinationPinpoint({ position }) {
  const pinRef = useRef();
  const baseCircleRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pinRef.current) {
      pinRef.current.position.y = 36 + Math.sin(t * 3.5) * 4;
    }
    if (baseCircleRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.12;
      baseCircleRef.current.scale.set(s, s, s);
    }
  });

  if (!position) return null;

  return (
    <group position={[position[0], 0, position[1]]}>
      {/* 1. Base Floor Circle with Halo Pulse Animation */}
      <mesh
        ref={baseCircleRef}
        position={[0, 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      >
        <circleGeometry args={[14, 32]} />
        <meshBasicMaterial
          color="#ff3838"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Floating 3D Red Teardrop Pin */}
      <group ref={pinRef} position={[0, 36, 0]}>
        {/* White Pin Outline */}
        <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 0]} renderOrder={998}>
          <coneGeometry args={[14, 26, 32]} />
          <meshBasicMaterial color="#ffffff" depthWrite={false} />
        </mesh>
        <mesh position={[0, 13, 0]} renderOrder={998}>
          <sphereGeometry args={[14, 32, 32]} />
          <meshBasicMaterial color="#ffffff" depthWrite={false} />
        </mesh>

        {/* Red Pin Core */}
        <mesh rotation={[Math.PI, 0, 0]} position={[0, 1, 0]} renderOrder={1000}>
          <coneGeometry args={[11.5, 23, 32]} />
          <meshBasicMaterial color="#EA4335" depthWrite={false} />
        </mesh>
        <mesh position={[0, 13, 0]} renderOrder={1000}>
          <sphereGeometry args={[11.5, 32, 32]} />
          <meshBasicMaterial color="#EA4335" depthWrite={false} />
        </mesh>

        {/* Inner White Dot */}
        <mesh position={[0, 13, 0]} renderOrder={1001}>
          <sphereGeometry args={[5, 32, 32]} />
          <meshBasicMaterial color="#ffffff" depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
