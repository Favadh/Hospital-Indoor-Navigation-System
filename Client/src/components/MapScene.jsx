import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import ExtrudedWalls from './ExtrudedWalls';
import DepartmentLabels from './DepartmentLabels';
import DynamicNavigationRoute from './DynamicNavigationRoute';
import LiveUserMarker from './LiveUserMarker';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Camera Controller that positions the camera behind the current start location,
 * facing directly towards the first corridor node with configurable zoom & height.
 */
function NavigationCameraController({
  routeData,
  behindDistance = 900,
  camHeight = 1100,
  lookAheadDist = 120,
}) {
  const { camera } = useThree();
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    if (!routeData?.path || routeData.path.length < 2 || !controls) return;

    const path = routeData.path;
    const startNode = path[0];
    const firstCorridorNode = path[1];

    const [x0, z0] = svgToWorld(startNode.x, startNode.y);
    const [x1, z1] = svgToWorld(firstCorridorNode.x, firstCorridorNode.y);

    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const dirX = dx / len;
    const dirZ = dz / len;

    // Target slightly ahead down the hallway
    const targetX = x0 + dirX * lookAheadDist;
    const targetY = 15;
    const targetZ = z0 + dirZ * lookAheadDist;

    // Camera positioned behind start location with specified height & distance
    const camX = x0 - dirX * behindDistance;
    const camY = camHeight;
    const camZ = z0 - dirZ * behindDistance;

    // Apply orientation and update controls
    controls.target.set(targetX, targetY, targetZ);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(targetX, targetY, targetZ);
    controls.update();
  }, [routeData, behindDistance, camHeight, lookAheadDist, camera, controls]);

  return null;
}

/**
 * Track-Up Camera Controller (Google Maps style):
 * - Camera follows the live arrow marker, always looking in the direction of movement.
 * - Smoothly rotates the entire 3D scene so "up" = direction of travel.
 * - Auto-disengages on user pan/rotate/zoom gestures.
 * - Re-engages and re-centres when the Track-Up FAB button is clicked.
 */
function TrackUpCameraController({
  liveUserPosition,
  liveHeading,
  isTrackUpActive,
  onUserInteraction,
  trackUpDistance = 500,
  trackUpHeight = 600,
  trackUpLookAhead = 100,
}) {
  const { camera } = useThree();
  const controls = useThree((state) => state.controls);

  const smoothCamPos = useRef(new THREE.Vector3());
  const smoothTarget = useRef(new THREE.Vector3());
  const hasSnapped = useRef(false);
  const interactionDetected = useRef(false);

  // Detect user manual interaction (pan/rotate/zoom) on OrbitControls
  useEffect(() => {
    if (!controls) return;

    const handleStart = () => {
      if (isTrackUpActive) {
        interactionDetected.current = true;
      }
    };

    controls.addEventListener('start', handleStart);
    return () => {
      controls.removeEventListener('start', handleStart);
    };
  }, [controls, isTrackUpActive]);

  // When Track-Up is toggled off externally, reset snap flag
  useEffect(() => {
    if (!isTrackUpActive) {
      hasSnapped.current = false;
    }
  }, [isTrackUpActive]);

  useFrame((state) => {
    if (!controls || !isTrackUpActive || !liveUserPosition) return;

    // If user touched the screen while track-up was on, disengage
    if (interactionDetected.current) {
      interactionDetected.current = false;
      if (onUserInteraction) onUserInteraction();
      return;
    }

    const [ux, uz] = liveUserPosition;

    controls.target.lerp(new THREE.Vector3(ux, 15, uz), 0.05);

    const rad = liveHeading;
    const idealCameraPos = new THREE.Vector3(
      ux - Math.cos(rad) * trackUpDistance,
      trackUpHeight,
      uz - Math.sin(rad) * trackUpDistance
    );
    state.camera.position.lerp(idealCameraPos, 0.05);
    controls.update();
  });

  return null;
}

/**
 * Ultra-Smooth Mobile Gesture Controller:
 * 1. Single-Finger Drag: Physics-damped Pan.
 * 2. Double-Tap and Hold & Drag: Silky 3D Orbit with velocity momentum & smooth glide.
 * 3. Two-Finger Pinch: Smooth Zoom.
 */
function DoubleTapOrbitController({ onUserInteraction }) {
  const { gl, camera } = useThree();
  const controls = useThree((state) => state.controls);

  const stateRef = useRef({
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    touchStartTime: 0,
    touchStartX: 0,
    touchStartY: 0,
    isDoubleTapActive: false,
    prevX: 0,
    prevY: 0,
    velocityX: 0,
    velocityY: 0,
    targetTheta: 0,
    targetPhi: 0,
    currentTheta: 0,
    currentPhi: 0,
    radius: 1000,
  });

  // Continuous smooth frame loop (Damped Interpolation + Momentum Decay)
  useFrame((_, delta) => {
    if (!controls) return;
    const s = stateRef.current;

    const hasMomentum = Math.abs(s.velocityX) > 0.00005 || Math.abs(s.velocityY) > 0.00005;

    if (s.isDoubleTapActive || hasMomentum) {
      if (!s.isDoubleTapActive && hasMomentum) {
        s.targetTheta += s.velocityX;
        s.targetPhi += s.velocityY;
        s.targetPhi = Math.max(0.05, Math.min(Math.PI / 2.05, s.targetPhi));
        s.velocityX *= 0.92;
        s.velocityY *= 0.92;
      }

      const damp = Math.min(1, 1 - Math.exp(-14 * delta));
      s.currentTheta = THREE.MathUtils.lerp(s.currentTheta, s.targetTheta, damp);
      s.currentPhi = THREE.MathUtils.lerp(s.currentPhi, s.targetPhi, damp);
      s.currentPhi = Math.max(0.05, Math.min(Math.PI / 2.05, s.currentPhi));

      const offset = new THREE.Vector3();
      const spherical = new THREE.Spherical(s.radius, s.currentPhi, s.currentTheta);
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);

      if (!s.isDoubleTapActive && !hasMomentum) {
        controls.enabled = true;
        controls.update();
      }
    }
  });

  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement || !controls) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const s = stateRef.current;

        s.touchStartTime = now;
        s.touchStartX = touch.clientX;
        s.touchStartY = touch.clientY;
        s.prevX = touch.clientX;
        s.prevY = touch.clientY;
        s.velocityX = 0;
        s.velocityY = 0;

        const timeDiff = now - s.lastTapTime;
        const dist = Math.hypot(touch.clientX - s.lastTapX, touch.clientY - s.lastTapY);

        if (timeDiff > 20 && timeDiff < 500 && dist < 120) {
          s.isDoubleTapActive = true;
          controls.enabled = false;

          // Notify parent that user is interacting
          if (onUserInteraction) onUserInteraction();

          const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
          const spherical = new THREE.Spherical().setFromVector3(offset);
          s.currentTheta = spherical.theta;
          s.targetTheta = spherical.theta;
          s.currentPhi = spherical.phi;
          s.targetPhi = spherical.phi;
          s.radius = spherical.radius;

          if (navigator.vibrate) {
            try {
              navigator.vibrate(30);
            } catch {}
          }
        } else {
          s.isDoubleTapActive = false;
          controls.enabled = true;
        }
      } else {
        stateRef.current.isDoubleTapActive = false;
        controls.enabled = true;
      }
    };

    const handleTouchMove = (e) => {
      const s = stateRef.current;
      if (s.isDoubleTapActive && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - s.prevX;
        const deltaY = touch.clientY - s.prevY;
        s.prevX = touch.clientX;
        s.prevY = touch.clientY;

        const height = domElement.clientHeight || window.innerHeight;
        const rotateSpeed = 1.6;

        const dTheta = -(2 * Math.PI * deltaX * rotateSpeed) / height;
        const dPhi = -(2 * Math.PI * deltaY * rotateSpeed) / height;

        s.targetTheta += dTheta;
        s.targetPhi += dPhi;
        s.targetPhi = Math.max(0.05, Math.min(Math.PI / 2.05, s.targetPhi));

        s.velocityX = s.velocityX * 0.35 + dTheta * 0.65;
        s.velocityY = s.velocityY * 0.35 + dPhi * 0.65;

        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      const s = stateRef.current;
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const now = Date.now();
        const duration = now - s.touchStartTime;
        const moveDist = Math.hypot(touch.clientX - s.touchStartX, touch.clientY - s.touchStartY);

        if (!s.isDoubleTapActive) {
          if (duration < 300 && moveDist < 30) {
            s.lastTapTime = now;
            s.lastTapX = touch.clientX;
            s.lastTapY = touch.clientY;
          } else {
            s.lastTapTime = 0;
          }
        } else {
          s.lastTapTime = 0;
        }
      }

      if (s.isDoubleTapActive) {
        s.isDoubleTapActive = false;
      }
    };

    domElement.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    domElement.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });

    return () => {
      domElement.removeEventListener('touchstart', handleTouchStart, { capture: true });
      domElement.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [gl, camera, controls, onUserInteraction]);

  return null;
}

/**
 * Assembles the full 3D Canvas scene: lighting, walls, navigation route,
 * department labels, live user position marker, and orbit camera controls.
 */
export default function MapScene({
  nodes,
  routeData,
  startName,
  destName,
  liveUserPosition,
  liveHeading,
  isTrackingActive,
  camBehindDistance = 480,
  camHeight = 520,
  isTrackUpActive = false,
  onTrackUpDisengage,
}) {
  // Memoize the disengage callback to avoid re-renders
  const disengageRef = useRef(onTrackUpDisengage);
  useEffect(() => {
    disengageRef.current = onTrackUpDisengage;
  }, [onTrackUpDisengage]);

  const handleUserInteraction = useCallback(() => {
    if (disengageRef.current) disengageRef.current();
  }, []);

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
          position: [0, 950, 1050],
          fov: 50,
          near: 1,
          far: 6000,
        }}
        dpr={[1, 2]}
        shadows
      >
        {/* --- Lighting --- */}
        <ambientLight intensity={1.0} />

        <directionalLight
          position={[600, 1200, 500]}
          intensity={3.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <directionalLight
          position={[-500, 800, -400]}
          intensity={1.5}
          color="#ffffff"
        />

        <Environment preset="city" />

        <React.Suspense fallback={null}>
          <ExtrudedWalls />
          {nodes && nodes.length > 0 && (
            <DepartmentLabels
              nodes={nodes}
              startName={startName}
              destName={destName}
              routeData={routeData}
            />
          )}
          {routeData && (
            <DynamicNavigationRoute
              routePath={routeData.path}
              liveUserPosition={liveUserPosition}
              isTrackingActive={isTrackingActive}
            />
          )}

          {/* Live User Movement Marker */}
          {isTrackingActive && liveUserPosition && (
            <LiveUserMarker
              position={liveUserPosition}
              heading={liveHeading}
              isActive={isTrackingActive}
            />
          )}
        </React.Suspense>

        {/* 3D Orbit Controls */}
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={150}
          maxDistance={2500}
          enableDamping={true}
          dampingFactor={0.07}
          panSpeed={1.0}
          rotateSpeed={0.85}
          zoomSpeed={0.95}
          touches={{
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />

        {/* Automatic Initial Camera Orientation on Route Calculation with configurable Zoom */}
        <NavigationCameraController
          routeData={routeData}
          behindDistance={camBehindDistance}
          camHeight={camHeight}
        />

        {/* Track-Up Follow Camera (Google Maps style) */}
        <TrackUpCameraController
          liveUserPosition={liveUserPosition}
          liveHeading={liveHeading}
          isTrackUpActive={isTrackUpActive}
          onUserInteraction={handleUserInteraction}
        />

        <DoubleTapOrbitController onUserInteraction={handleUserInteraction} />
      </Canvas>
    </main>
  );
}
