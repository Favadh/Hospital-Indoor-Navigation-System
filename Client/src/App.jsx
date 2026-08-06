import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line, Environment } from '@react-three/drei';
import PointPickerInspector from './components/PointPickerInspector.jsx';

// --- CONSTANTS & COORDINATE CONVERSION ---
const WALL_HEIGHT = 80;
const WALL_THICKNESS = 8;
const SVG_W = 1920;
const SVG_H = 1080;
const OFFSET_X = -SVG_W / 2; // -960
const OFFSET_Z = -SVG_H / 2; // -540

// Converts 2D SVG (x, y) coordinates directly to 3D World (x, z) coordinates
function svgToWorld(sx, sy) {
  return [sx + OFFSET_X, sy + OFFSET_Z];
}

// 40 Fallback Nodes
const LOCAL_NODES = [
  { nodeId: 'main_entrance', name: 'Main Entrance', type: 'entrance', x: 940, y: 999 },
  { nodeId: 'emergency_entrance', name: 'Emergency Entrance', type: 'entrance', x: 1500, y: 999 },
  { nodeId: 'reception', name: 'Reception', type: 'room', x: 400, y: 438 },
  { nodeId: 'registration', name: 'Registration', type: 'room', x: 840, y: 438 },
  { nodeId: 'waiting_area', name: 'Waiting Area', type: 'room', x: 620, y: 720 },
  { nodeId: 'pharmacy', name: 'Pharmacy', type: 'room', x: 240, y: 720 },
  { nodeId: 'cafeteria', name: 'Cafeteria', type: 'room', x: 240, y: 215 },
  { nodeId: 'toilet', name: 'Toilet', type: 'room', x: 400, y: 160 },
  { nodeId: 'lift', name: 'Lift', type: 'room', x: 872, y: 160 },
  { nodeId: 'stair', name: 'Stair', type: 'room', x: 929, y: 160 },
  { nodeId: 'ot', name: 'OT', type: 'room', x: 1437, y: 175 },
  { nodeId: 'lab', name: 'Lab', type: 'room', x: 1437, y: 451 },
  { nodeId: 'casuality', name: 'Casuality', type: 'room', x: 1437, y: 839 },
  { nodeId: 'icu', name: 'ICU', type: 'room', x: 1560, y: 141 },
  { nodeId: 'recovery_ward', name: 'Recovery Ward', type: 'room', x: 1560, y: 361 },
  { nodeId: 'xray', name: 'X-Ray', type: 'room', x: 1560, y: 601 },
  { nodeId: 'emergency', name: 'Emergency', type: 'room', x: 1560, y: 841 },

  // Junctions
  { nodeId: 'j_west', name: 'West Corridor Junction', type: 'junction', x: 312, y: 500 },
  { nodeId: 'j_pharmacy', name: 'Pharmacy Junction', type: 'junction', x: 312, y: 720 },
  { nodeId: 'j_reception', name: 'Reception Hallway', type: 'junction', x: 400, y: 500 },
  { nodeId: 'j_mid_center', name: 'Mid Center Corridor', type: 'junction', x: 620, y: 500 },
  { nodeId: 'j_registration', name: 'Registration Hallway', type: 'junction', x: 840, y: 500 },
  { nodeId: 'j_north_west_wing', name: 'North West Wing Junction', type: 'junction', x: 400, y: 215 },
  { nodeId: 'j_north_mid', name: 'Central North Corridor', type: 'junction', x: 620, y: 215 },
  { nodeId: 'j_lift', name: 'Lift Junction', type: 'junction', x: 872, y: 215 },
  { nodeId: 'j_stair', name: 'Stair Junction', type: 'junction', x: 929, y: 215 },
  { nodeId: 'j_main_hallway', name: 'Main Hallway Junction', type: 'junction', x: 940, y: 720 },
  { nodeId: 'j_rw_connector', name: 'Right Wing Connector', type: 'junction', x: 1500, y: 653 },
  { nodeId: 'j_rw_ot', name: 'OT Hallway Junction', type: 'junction', x: 1500, y: 175 },
  { nodeId: 'j_rw_lab', name: 'Lab Hallway Junction', type: 'junction', x: 1500, y: 451 },
  { nodeId: 'j_rw_icu', name: 'ICU Hallway Junction', type: 'junction', x: 1500, y: 141 },
  { nodeId: 'j_rw_recovery', name: 'Recovery Hallway Junction', type: 'junction', x: 1500, y: 361 },
  { nodeId: 'j_rw_xray', name: 'X-Ray Hallway Junction', type: 'junction', x: 1500, y: 601 },
  { nodeId: 'j_rw_emergency_wing', name: 'Emergency Wing Junction', type: 'junction', x: 1500, y: 841 },
  { nodeId: 'j_north_east_spine', name: 'North East Spine Junction', type: 'junction', x: 1053, y: 215 },
  { nodeId: 'j_south_main', name: 'South Main Junction', type: 'junction', x: 1053, y: 653 },
  { nodeId: 'j_east_mid_hallway', name: 'East Mid Hallway Junction', type: 'junction', x: 1053, y: 500 },
  { nodeId: 'j_main_entrance_hallway', name: 'Main Entrance Connector', type: 'junction', x: 940, y: 653 },
  { nodeId: 'j_south_corridor_loop', name: 'South Entrance Hallway', type: 'junction', x: 940, y: 916 },
  { nodeId: 'j_south_west_loop', name: 'South West Outer Junction', type: 'junction', x: 312, y: 916 },
];

const LOCAL_EDGES = [
  { from: 'cafeteria', to: 'j_north_west_wing' },
  { from: 'toilet', to: 'j_north_west_wing' },
  { from: 'lift', to: 'j_lift' },
  { from: 'stair', to: 'j_stair' },
  { from: 'reception', to: 'j_reception' },
  { from: 'registration', to: 'j_registration' },
  { from: 'pharmacy', to: 'j_pharmacy' },
  { from: 'ot', to: 'j_rw_ot' },
  { from: 'lab', to: 'j_rw_lab' },
  { from: 'casuality', to: 'j_rw_emergency_wing' },
  { from: 'emergency', to: 'j_rw_emergency_wing' },
  { from: 'icu', to: 'j_rw_icu' },
  { from: 'recovery_ward', to: 'j_rw_recovery' },
  { from: 'xray', to: 'j_rw_xray' },
  { from: 'main_entrance', to: 'j_south_corridor_loop' },
  { from: 'emergency_entrance', to: 'j_rw_emergency_wing' },
  { from: 'main_entrance', to: 'emergency_entrance' },
  { from: 'j_north_west_wing', to: 'j_north_mid' },
  { from: 'j_north_mid', to: 'j_lift' },
  { from: 'j_lift', to: 'j_stair' },
  { from: 'j_stair', to: 'j_north_east_spine' },
  { from: 'j_west', to: 'j_reception' },
  { from: 'j_reception', to: 'j_mid_center' },
  { from: 'j_mid_center', to: 'j_registration' },
  { from: 'j_registration', to: 'j_east_mid_hallway' },
  { from: 'j_north_mid', to: 'j_mid_center' },
  { from: 'j_north_east_spine', to: 'j_east_mid_hallway' },
  { from: 'j_east_mid_hallway', to: 'j_south_main' },
  { from: 'j_main_entrance_hallway', to: 'j_south_main' },
  { from: 'j_south_main', to: 'j_rw_connector' },
  { from: 'j_main_entrance_hallway', to: 'j_main_hallway' },
  { from: 'j_main_hallway', to: 'waiting_area' },
  { from: 'waiting_area', to: 'j_pharmacy' },
  { from: 'j_west', to: 'j_pharmacy' },
  { from: 'j_pharmacy', to: 'j_south_west_loop' },
  { from: 'j_south_west_loop', to: 'j_south_corridor_loop' },
  { from: 'j_south_corridor_loop', to: 'j_main_entrance_hallway' },
  { from: 'j_rw_icu', to: 'j_rw_ot' },
  { from: 'j_rw_ot', to: 'j_rw_recovery' },
  { from: 'j_rw_recovery', to: 'j_rw_lab' },
  { from: 'j_rw_lab', to: 'j_rw_xray' },
  { from: 'j_rw_xray', to: 'j_rw_connector' },
  { from: 'j_rw_connector', to: 'j_rw_emergency_wing' },
];

// ============================================================================
// 3D EXTRUDED WALLS
// ============================================================================
function ExtrudedWalls() {
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

      {/* Interior Floor matching SVG #D9D9D9 fill */}
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
          <meshStandardMaterial
            color="#f0ece2"
            roughness={0.25}
            metalness={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// 3D GRAPH DEBUG OVERLAY
// ============================================================================
function GraphDebugOverlay({ nodes, edges }) {
  const getNodeColor = (type) => {
    switch (type) {
      case 'room': return '#ff3838';
      case 'entrance': return '#00ff88';
      case 'junction': return '#00d2d3';
      default: return '#ffffff';
    }
  };

  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.nodeId, n));

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
      {nodes.map((n) => {
        const [wx, wz] = svgToWorld(n.x, n.y);
        const color = getNodeColor(n.type);

        return (
          <group key={n.nodeId} position={[wx, 15, wz]}>
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

// ============================================================================
// DYNAMIC 3D DIJKSTRA NAVIGATION ROUTE RENDERER
// ============================================================================
function DynamicNavigationRoute({ routePath }) {
  if (!routePath || routePath.length < 2) return null;

  const points3D = routePath.map((n) => {
    const [wx, wz] = svgToWorld(n.x, n.y);
    return [wx, 18, wz]; // Height = 18 (floating above floor & graph overlay)
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

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [showGraph, setShowGraph] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [nodes, setNodes] = useState(LOCAL_NODES);
  const [edges, setEdges] = useState(LOCAL_EDGES);

  // Navigation State
  const [startNodeId, setStartNodeId] = useState('main_entrance');
  const [destNodeId, setDestNodeId] = useState('icu');
  const [routeData, setRouteData] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState(null);

  const isDev = import.meta.env.DEV || process.env.NODE_ENV !== 'production';

  // Fetch Nodes & Edges from Backend
  useEffect(() => {
    fetch('http://localhost:8000/api/nodes')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.length) setNodes(data.data);
      })
      .catch(() => console.log('Using local fallback node coordinates'));

    fetch('http://localhost:8000/api/edges')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.length) setEdges(data.data);
      })
      .catch(() => console.log('Using local fallback edge connections'));
  }, []);

  // Filterable Node Lists for Form
  const selectableStartNodes = nodes.filter((n) => n.type === 'entrance' || n.type === 'room');
  const selectableDestNodes = nodes.filter((n) => n.type === 'room' || n.type === 'entrance');

  // Trigger Dijkstra Navigation API
  const handleFindShortestPath = async () => {
    if (!startNodeId || !destNodeId) return;
    if (startNodeId === destNodeId) {
      setNavError('Start and Destination locations must be different!');
      return;
    }

    setIsNavigating(true);
    setNavError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/navigation/shortest-path?start=${startNodeId}&destination=${destNodeId}`
      );
      const data = await response.json();

      if (data.success && data.path) {
        setRouteData(data);
      } else {
        setNavError(data.message || 'Path not found');
        setRouteData(null);
      }
    } catch (error) {
      setNavError('Error connecting to navigation server');
      setRouteData(null);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleClearRoute = () => {
    setRouteData(null);
    setNavError(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Top Header */}
      <header style={{
        padding: '0.8rem 2rem',
        background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a2e 100%)',
        color: 'white',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        borderBottom: '2px solid #00ff8833'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#00ff88', letterSpacing: '0.5px' }}>
            🏥 Smart Hospital Indoor Navigation
          </h1>
          <p style={{ margin: '0.1rem 0 0 0', opacity: 0.7, fontSize: '0.8rem', color: '#dcdde1' }}>
            Powered by Dijkstra Shortest Path Algorithm & 2.5D Vector Maps
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isDev && (
            <button
              onClick={() => setShowInspector(true)}
              style={{
                padding: '7px 14px',
                borderRadius: '16px',
                border: '1px solid #00ff88',
                background: 'rgba(0, 255, 136, 0.15)',
                color: '#00ff88',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              🎯 Dev Tool: Inspector
            </button>
          )}

          <button
            onClick={() => setShowGraph(!showGraph)}
            style={{
              padding: '7px 14px',
              borderRadius: '16px',
              border: showGraph ? '1px solid #00ff88' : '1px solid #718093',
              background: showGraph ? 'rgba(0, 255, 136, 0.2)' : '#16213e',
              color: showGraph ? '#00ff88' : '#dcdde1',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            {showGraph ? '🌐 Full Graph: ON' : '🌐 Full Graph: OFF'}
          </button>
        </div>
      </header>

      {/* Navigation Control Bar */}
      <div style={{
        background: '#161625',
        padding: '12px 2rem',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 9,
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Start Location Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#00ff88', fontWeight: 'bold' }}>🚩 Current Location:</label>
            <select
              value={startNodeId}
              onChange={(e) => setStartNodeId(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#0c0c1d',
                color: 'white',
                border: '1px solid #00ff8855',
                fontSize: '0.88rem',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              {selectableStartNodes.map((n, idx) => (
                <option key={n.nodeId || n._id || idx} value={n.nodeId || n._id}>
                  {n.name} ({n.type})
                </option>
              ))}
            </select>
          </div>

          <div style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '14px' }}>➔</div>

          {/* Destination Location Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#ff3838', fontWeight: 'bold' }}>🎯 Destination:</label>
            <select
              value={destNodeId}
              onChange={(e) => setDestNodeId(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#0c0c1d',
                color: 'white',
                border: '1px solid #ff383855',
                fontSize: '0.88rem',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              {selectableDestNodes.map((n, idx) => (
                <option key={n.nodeId || n._id || idx} value={n.nodeId || n._id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button
              onClick={handleFindShortestPath}
              disabled={isNavigating}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                background: '#00ff88',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 255, 136, 0.4)'
              }}
            >
              {isNavigating ? '⏳ Computing Path...' : '🧭 Find Route'}
            </button>

            {routeData && (
              <button
                onClick={handleClearRoute}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                ✖ Clear
              </button>
            )}
          </div>
        </div>

        {/* HUD Info Badge */}
        {routeData && (
          <div style={{
            background: 'rgba(0, 255, 136, 0.15)',
            border: '1px solid #00ff88',
            padding: '8px 16px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: '#00ff88', fontWeight: 'bold' }}>Shortest Path Found: </span>
            <b>{routeData.totalDistance} px</b> | <b>{routeData.waypointCount} Waypoints</b>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {navError && (
        <div style={{ background: '#e74c3c', color: 'white', padding: '6px 2rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 'bold' }}>
          ⚠️ {navError}
        </div>
      )}

      {/* 3D Canvas */}
      <main style={{ flex: 1, position: 'relative', background: '#1e272e' }}>
        <Canvas camera={{ position: [0, 950, 1050], fov: 50, near: 1, far: 6000 }} shadows>
          <ambientLight intensity={0.7} />
          <directionalLight position={[600, 1000, 500]} intensity={1.3} castShadow />
          <directionalLight position={[-500, 700, -400]} intensity={0.4} />
          <Environment preset="city" />

          <React.Suspense fallback={null}>
            <ExtrudedWalls />
            {showGraph && <GraphDebugOverlay nodes={nodes} edges={edges} />}
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

      {/* Dev Tool Inspector Modal */}
      {showInspector && (
        <PointPickerInspector
          onClose={() => setShowInspector(false)}
          nodes={nodes}
          edges={edges}
        />
      )}
    </div>
  );
}
