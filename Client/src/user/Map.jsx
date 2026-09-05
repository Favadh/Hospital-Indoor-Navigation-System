import React, { useEffect, useState, useRef } from 'react';
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
import './Map.css';

function getCardinalDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return directions[index];
}

/**
 * Map Page — Dedicated 3D Hospital Map & Navigation screen (Google Maps UI/UX):
 * - Top Route Planner Card (Start, Destination, Time Estimate, Start button).
 * - Full 3D Map View during Active Navigation.
 * - Bottom Google Maps Navigation Card (Remaining Steps, Live Pace, Exit Navigation button).
 * - Stacked Right Action FABs (Recenter/Compass FAB + QR Scanner FAB).
 */
export default function Map() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  // Navigation State
  const [startName, setStartName] = useState(searchParams.get('start') || '');
  const [destName, setDestName] = useState(searchParams.get('destination') || '');
  const [routeData, setRouteData] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);

  // Live Sensor Tracking State (true only during active turn-by-turn navigation after Start is clicked)
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [liveUserPos, setLiveUserPos] = useState(null);
  const [liveHeading, setLiveHeading] = useState(0); // in radians
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [stepCount, setStepCount] = useState(0);

  // Camera Settings (Matching Friend's Exact 35° Isometric FOV & Pitch)
  const [camBehindDistance, setCamBehindDistance] = useState(550);
  const [camHeight, setCamHeight] = useState(450);

  // Track-Up Camera Follow Mode
  const [isTrackUpActive, setIsTrackUpActive] = useState(false);

  const hasInitializedRef = useRef(false);
  const routeDataRef = useRef(routeData);
  const destNameRef = useRef(destName);
  const startNameRef = useRef(startName);
  const nodesRef = useRef(nodes);
  const hasArrivedRef = useRef(false);

  useEffect(() => {
    routeDataRef.current = routeData;
    pdrEngine.setActiveRoutePath(routeData?.path || null);
    setHasArrived(false);
    hasArrivedRef.current = false;
  }, [routeData]);

  useEffect(() => {
    destNameRef.current = destName;
    setHasArrived(false);
    hasArrivedRef.current = false;
  }, [destName]);

  useEffect(() => {
    startNameRef.current = startName;
  }, [startName]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Trigger Dijkstra Navigation API
  const computeRoute = async (sName, dName) => {
    const s = sName || startName;
    const d = dName || destName;

    if (!s || !d) return;
    if (s === d) {
      setNavError('Start and Destination locations must be different!');
      setRouteData(null);
      return;
    }

    setIsNavigating(true);
    setNavError(null);
    setHasArrived(false);
    hasArrivedRef.current = false;

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

  // Auto-calculate route preview whenever both Start and Destination are selected
  useEffect(() => {
    if (startName && destName && startName !== destName) {
      computeRoute(startName, destName);
    } else if (!destName) {
      setRouteData(null);
      setNavError(null);
    }
  }, [startName, destName]);

  // Check Destination Arrival
  const checkArrival = (currentPos) => {
    const currentRoute = routeDataRef.current?.path;
    const targetDest = destNameRef.current;
    if (!currentRoute || currentRoute.length < 2 || !targetDest || hasArrivedRef.current) return;

    const destNode = currentRoute[currentRoute.length - 1];
    const [destWx, destWz] = svgToWorld(destNode.x, destNode.y);
    const distToDest = Math.hypot(currentPos.x - destWx, currentPos.z - destWz);

    if (distToDest <= 35) {
      hasArrivedRef.current = true;
      setHasArrived(true);
      setShowArrivalModal(true);

      if (navigator.vibrate) {
        try {
          navigator.vibrate([120, 80, 200, 100, 300]);
        } catch {}
      }
    }
  };

  // Fetch Nodes & Auto-Start Live Movement on Mount
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

          const startNode = fetchedNodes.find((n) => n.name === initialStart) || fetchedNodes[0];
          let startX = 0;
          let startZ = 0;
          if (startNode) {
            const [wx, wz] = svgToWorld(startNode.x, startNode.y);
            startX = wx;
            startZ = wz;
          }

          setLiveUserPos([startX, startZ]);

          pdrEngine.start(startX, startZ);
          sensorManager.start().catch(() => {});
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

  // Called when user clicks "Start" button in Route Planner Card
  const handleFindRoute = () => {
    if (!startName || !destName) return;
    if (!routeData) {
      computeRoute(startName, destName);
    }
    setStepCount(0);
    pdrEngine.setTracking(true);
    pdrEngine.steps = 0;
    setIsTrackingActive(true);
    setIsTrackUpActive(true);
    setSearchParams({ start: startName, destination: destName });
  };

  const handleExitNavigation = () => {
    setIsTrackingActive(false);
    setIsTrackUpActive(false);
    setStepCount(0);
    pdrEngine.setTracking(false);
    pdrEngine.steps = 0;
  };

  const handleClearRoute = () => {
    setIsTrackingActive(false);
    setIsTrackUpActive(false);
    setStepCount(0);
    setDestName('');
    setRouteData(null);
    setNavError(null);
    setShowArrivalModal(false);
    pdrEngine.setActiveRoutePath(null);
    pdrEngine.setTracking(false);
    pdrEngine.steps = 0;
    setSearchParams(startName ? { start: startName } : {});
  };

  const handleRetry = () => {
    setServerError(false);
    setIsLoading(true);
    window.location.reload();
  };

  // Live Position & Step Listeners
  useEffect(() => {
    const unsubPos = pdrEngine.onPosition((pos) => {
      setLiveUserPos([pos.x, pos.z]);
      if (pos.heading !== undefined) {
        setLiveHeading(pos.heading);
      }
      if (pos.headingDeg !== undefined) {
        setHeadingDegrees(Math.round(pos.headingDeg / 2) * 2);
      }
      if (isTrackingActive) {
        checkArrival(pos);
      }
    });

    const unsubStep = pdrEngine.onStep((stepData) => {
      setStepCount(stepData.steps);
    });

    return () => {
      unsubPos();
      unsubStep();
    };
  }, [isTrackingActive]);

  // Step simulation for testing / desktop
  const handleSimulateStep = () => {
    pdrEngine.simulateStep();
  };

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

  // Calculate remaining steps directly from routeData for 100% immediate accuracy
  const totalDistance = React.useMemo(() => {
    if (!routeData?.path || routeData.path.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < routeData.path.length - 1; i++) {
      const p1 = svgToWorld(routeData.path[i].x, routeData.path[i].y);
      const p2 = svgToWorld(routeData.path[i + 1].x, routeData.path[i + 1].y);
      total += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    }
    return total;
  }, [routeData]);

  const totalEstimatedSteps = Math.ceil(totalDistance / pdrEngine.baseStepLength) || 0;
  const stepsRemaining = Math.max(0, totalEstimatedSteps - stepCount);

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

  const isRouteActive = Boolean(routeData && routeData.path && routeData.path.length >= 2);

  return (
    <div className="map-page-container">
      <Header />

      {/* Top Google Maps Route Planner Card */}
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
        isTrackingActive={isTrackingActive}
        onOpenScanner={() => setShowScannerModal(true)}
      />

      {/* 3D Canvas Scene */}
      <MapScene
        nodes={nodes}
        routeData={routeData}
        startName={startName}
        destName={destName}
        liveUserPosition={liveUserPos}
        liveHeading={liveHeading}
        isTrackingActive={isTrackingActive}
        camBehindDistance={camBehindDistance}
        camHeight={camHeight}
        isTrackUpActive={isTrackUpActive}
        onTrackUpDisengage={() => setIsTrackUpActive(false)}
      />

      {/* ─────────────────────────────────────────────────────────────
          RIGHT-SIDE FLOATING ACTION BUTTONS (Google Maps Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="gmaps-right-fabs">
        {/* Recenter / Compass FAB */}
        <button
          className={`gmaps-fab gmaps-fab-recenter ${isTrackUpActive ? 'active' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsTrackUpActive(true);
          }}
          title={isTrackUpActive ? 'Following route (Click to free pan)' : 'Re-center on user marker'}
          aria-label="Re-center camera"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="gmaps-recenter-svg"
          >
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          {isTrackUpActive && <span className="gmaps-fab-pulse" />}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM NAVIGATION CARD (Friend's Exact Google Maps UX)
      ───────────────────────────────────────────────────────────── */}
      {isRouteActive && isTrackingActive ? (
        <div className="gmaps-active-nav-card animate-slide-up">
          {stepsRemaining > 0 ? (
            <>
              <div className="gmaps-nav-icon-row">
                <span className="gmaps-walk-icon">🚶‍♂️</span>
              </div>
              <div className="gmaps-steps-number">{stepsRemaining}</div>
              <div className="gmaps-steps-label">steps remaining (~{Math.round(stepsRemaining * 0.75)} m)</div>
              <div className="gmaps-dest-subtext">
                to <span className="gmaps-dest-highlight">{destName}</span>
              </div>
            </>
          ) : (
            <>
              <div className="gmaps-nav-icon-row">
                <span className="gmaps-arrival-pin">📍</span>
              </div>
              <div className="gmaps-arrived-heading">You have arrived!</div>
              <div className="gmaps-arrived-subtext">Destination reached.</div>
            </>
          )}

          <div className="gmaps-nav-btn-group">
            <button
              className="gmaps-btn-sim-step"
              onClick={handleSimulateStep}
              title="Simulate Step Forward"
              type="button"
            >
              + Step
            </button>

            <button
              className="gmaps-btn-exit-nav"
              onClick={handleExitNavigation}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Exit Navigation</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          CELEBRATORY ARRIVAL MODAL
      ───────────────────────────────────────────────────────────── */}
      {showArrivalModal && (
        <div className="arrival-modal-overlay" onClick={() => setShowArrivalModal(false)}>
          <div className="arrival-modal-content animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="arrival-icon-wrapper">
              <span className="arrival-trophy-icon">🎉</span>
              <div className="arrival-pulse-ring" />
            </div>
            <h2 className="arrival-title">You Have Arrived!</h2>
            <p className="arrival-subtitle">
              You reached <strong className="arrival-dest-name">{destName}</strong>
            </p>
            <div className="arrival-btn-row">
              <button
                className="btn-arrival-done"
                onClick={() => {
                  setShowArrivalModal(false);
                  handleClearRoute();
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <QRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
        availableNodes={nodes}
      />
    </div>
  );
}
