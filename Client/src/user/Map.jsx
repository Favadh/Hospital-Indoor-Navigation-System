import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/axiosInstance';
import Header from '../components/Header';
import NavigationBar from '../components/NavigationBar';
import MapScene from '../components/MapScene';
import QRScannerModal from '../components/QRScannerModal';
import MapLoader from '../components/MapLoader';
import ServerErrorScreen from '../components/ServerErrorScreen';
import { svgToWorld } from '../constants/mapConstants';
import pdrEngine from '../utils/pdrEngine';
import sensorManager from '../utils/sensorManager';
import MapMatcher from '../utils/mapMatcher';
import './Map.css';

/**
 * Map Page — Dedicated 3D Hospital Map & Navigation screen.
 * Supports:
 * - Dijkstra route calculation
 * - In-built Mobile Sensor Live Tracking (PDR, Accelerometer, Magnetometer)
 * - 3D live user position marker & heading cone
 */
export default function Map() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Navigation State
  const [startName, setStartName] = useState(searchParams.get('start') || '');
  const [destName, setDestName] = useState(searchParams.get('destination') || '');
  const [routeData, setRouteData] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState(null);

  // Live Sensor Tracking State
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [liveUserPos, setLiveUserPos] = useState(null);
  const [liveHeading, setLiveHeading] = useState(0); // in radians
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [stepCount, setStepCount] = useState(0);

  const hasInitializedRef = useRef(false);
  const routeDataRef = useRef(routeData);

  useEffect(() => {
    routeDataRef.current = routeData;
  }, [routeData]);

  // Trigger Dijkstra Navigation API
  const computeRoute = async (sName, dName) => {
    const s = sName || startName;
    const d = dName || destName;

    if (!s || !d) return;
    if (s === d) {
      setNavError('Start and Destination locations must be different!');
      return;
    }

    setIsNavigating(true);
    setNavError(null);

    try {
      const res = await api.get('/api/navigation/shortest-path', {
        params: { start: s, destination: d },
      });

      if (res.data.success && res.data.path) {
        setRouteData(res.data);
      } else {
        setNavError(res.data.message || 'Path not found');
        setRouteData(null);
      }
    } catch {
      setNavError('Error connecting to navigation server');
      setRouteData(null);
    } finally {
      setIsNavigating(false);
    }
  };

  // Fetch Nodes once on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const fetchData = async () => {
      try {
        const nodesRes = await api.get('/api/nodes');
        const fetchedNodes = nodesRes.data?.data || [];

        if (!fetchedNodes.length) {
          setServerError(true);
        } else {
          setNodes(fetchedNodes);

          const queryStart = searchParams.get('start');
          const queryDest = searchParams.get('destination');

          let initialStart = queryStart || '';
          let initialDest = queryDest || '';

          if (!initialStart) {
            const firstEntrance = fetchedNodes.find((n) => n.type === 'entrance');
            if (firstEntrance) initialStart = firstEntrance.name;
          }

          if (!initialDest) {
            const firstRoom = fetchedNodes.find((n) => n.type === 'room');
            if (firstRoom) initialDest = firstRoom.name;
          }

          setStartName(initialStart);
          setDestName(initialDest);

          if (queryStart && queryDest && queryStart !== queryDest) {
            computeRoute(queryStart, queryDest);
          }
        }
      } catch {
        setServerError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filterable Node Lists for dropdowns
  const selectableStartNodes = nodes.filter((n) => n.type === 'entrance' || n.type === 'room');
  const selectableDestNodes = nodes.filter((n) => n.type === 'room' || n.type === 'entrance');

  const handleStartChange = (newStart) => {
    setStartName(newStart);
    setNavError(null);

    // If live tracking is active, reposition to new start node
    const startNode = nodes.find((n) => n.name === newStart);
    if (startNode) {
      const [wx, wz] = svgToWorld(startNode.x, startNode.y);
      pdrEngine.setInitialPosition(wx, wz);
      setLiveUserPos([wx, wz]);
    }
  };

  const handleDestChange = (newDest) => {
    setDestName(newDest);
    setNavError(null);
  };

  const handleFindRoute = () => {
    computeRoute(startName, destName);
    setSearchParams({ start: startName, destination: destName });
  };

  const handleClearRoute = () => {
    setRouteData(null);
    setNavError(null);
  };

  const handleRetry = () => {
    setServerError(false);
    setIsLoading(true);
    window.location.reload();
  };

  // Toggle In-Built Sensor Live Tracking
  const toggleLiveTracking = async () => {
    if (isTrackingActive) {
      pdrEngine.stop();
      setIsTrackingActive(false);
    } else {
      // Find starting node world position
      const startNode = nodes.find((n) => n.name === startName) || nodes[0];
      let startX = 0;
      let startZ = 0;

      if (startNode) {
        const [wx, wz] = svgToWorld(startNode.x, startNode.y);
        startX = wx;
        startZ = wz;
      }

      setLiveUserPos([startX, startZ]);
      setStepCount(0);

      const success = await sensorManager.start();
      pdrEngine.start(startX, startZ);
      setIsTrackingActive(true);

      if (!success) {
        console.warn('Sensors simulated or permission not explicitly required');
      }
    }
  };

  // Live Position & Step Listeners
  useEffect(() => {
    if (!isTrackingActive) return;

    const unsubPos = pdrEngine.onPosition((pos) => {
      // Snap to active route or corridor if route exists
      const snapped = MapMatcher.snapToRoute(pos, routeDataRef.current?.path);
      setLiveUserPos([snapped.x, snapped.z]);
    });

    const unsubStep = pdrEngine.onStep(() => {
      setStepCount((prev) => prev + 1);
    });

    const unsubOrientation = sensorManager.onOrientation((headingDeg) => {
      setLiveHeading((headingDeg * Math.PI) / 180);
      setHeadingDegrees(Math.round(headingDeg));
    });

    return () => {
      unsubPos();
      unsubStep();
      unsubOrientation();
    };
  }, [isTrackingActive]);

  // Step simulation for testing / desktop
  const handleSimulateStep = () => {
    pdrEngine.simulateStep();
  };

  // When QR code is scanned & destination selected in modal
  const handleScanSuccess = (scanResult) => {
    setShowScannerModal(false);
    const start = typeof scanResult === 'object' ? scanResult.start : scanResult;
    const dest = typeof scanResult === 'object' ? scanResult.destination : '';

    if (start) {
      setStartName(start);
      const startNode = nodes.find((n) => n.name === start);
      if (startNode) {
        const [wx, wz] = svgToWorld(startNode.x, startNode.y);
        pdrEngine.setInitialPosition(wx, wz);
        setLiveUserPos([wx, wz]);
      }
    }
    if (dest) setDestName(dest);

    if (start && dest && start !== dest) {
      computeRoute(start, dest);
      setSearchParams({ start, destination: dest });
    } else if (start) {
      setSearchParams({ start });
    }
  };

  if (serverError) {
    return <ServerErrorScreen onRetry={handleRetry} homePath="/" />;
  }

  if (isLoading) {
    return (
      <MapLoader
        title="Initializing 3D Map"
        subtitle="Calibrating hospital nodes & pathways..."
      />
    );
  }

  return (
    <div className="map-page-container">
      <Header />

      <NavigationBar
        startName={startName}
        destName={destName}
        onStartChange={handleStartChange}
        onDestChange={handleDestChange}
        onFindRoute={handleFindRoute}
        onClearRoute={handleClearRoute}
        isNavigating={isNavigating}
        routeData={routeData}
        navError={navError}
        selectableStartNodes={selectableStartNodes}
        selectableDestNodes={selectableDestNodes}
      />

      <MapScene
        nodes={nodes}
        routeData={routeData}
        startName={startName}
        destName={destName}
        liveUserPosition={liveUserPos}
        liveHeading={liveHeading}
        isTrackingActive={isTrackingActive}
      />

      {/* Floating Action Controls */}
      <div className="map-bottom-controls">
        {/* Live Sensor Tracking Toggle Button */}
        <button
          className={`map-sensor-fab ${isTrackingActive ? 'active' : ''}`}
          onClick={toggleLiveTracking}
          title={isTrackingActive ? 'Stop Live Sensor Tracking' : 'Start Live Movement Tracking'}
          aria-label="Toggle Live Sensor Tracking"
        >
          <span className="map-sensor-icon">{isTrackingActive ? '📍' : '📡'}</span>
          <span className="map-sensor-label">
            {isTrackingActive ? 'Tracking Live' : 'Live Tracking'}
          </span>
        </button>

        {/* Live Sensor HUD when Tracking */}
        {isTrackingActive && (
          <div className="map-live-hud">
            <div className="live-hud-badge">
              <span className="live-pulse-dot" />
              <span className="live-hud-compass">🧭 {headingDegrees}°</span>
              <span className="live-hud-steps">🚶 {stepCount} steps</span>
            </div>
            {/* Step Simulator Button for Testing */}
            <button
              className="btn-simulate-step"
              onClick={handleSimulateStep}
              title="Simulate 1 Step Forward"
            >
              + Step
            </button>
          </div>
        )}

        {/* Floating QR Scanner Button */}
        <button
          className="map-qr-fab"
          onClick={() => setShowScannerModal(true)}
          title="Scan Location QR Code"
          aria-label="Scan Location QR"
        >
          <svg
            className="map-qr-fab-svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" strokeDasharray="2 2" />
            <rect x="7" y="7" width="2" height="2" fill="currentColor" />
            <rect x="15" y="7" width="2" height="2" fill="currentColor" />
            <rect x="7" y="15" width="2" height="2" fill="currentColor" />
          </svg>
        </button>
      </div>

      <QRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
        availableNodes={nodes}
      />
    </div>
  );
}
