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
import MapMatcher from '../utils/mapMatcher';
import './Map.css';

function getCardinalDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return directions[index];
}

/**
 * Map Page — Dedicated 3D Hospital Map & Navigation screen.
 */
export default function Map() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCalibModal, setShowCalibModal] = useState(false);

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

  // Calibration Parameters
  const [stepPeakThreshold, setStepPeakThreshold] = useState(1.25);
  const [baseStepLength, setBaseStepLength] = useState(10.5);
  const [minStepIntervalMs, setMinStepIntervalMs] = useState(420);
  const [compassOffset, setCompassOffset] = useState(0);
  const [maxPathAngleDeg, setMaxPathAngleDeg] = useState(55);
  const [isPathGatingActive, setIsPathGatingActive] = useState(true);
  const [liveBounce, setLiveBounce] = useState(0);

  const hasInitializedRef = useRef(false);
  const routeDataRef = useRef(routeData);

  useEffect(() => {
    routeDataRef.current = routeData;
    pdrEngine.setActiveRoutePath(routeData?.path || null);
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

      await sensorManager.start();
      pdrEngine.setActiveRoutePath(routeDataRef.current?.path || null);
      pdrEngine.start(startX, startZ);
      setIsTrackingActive(true);
    }
  };

  // Live Position & Step Listeners
  useEffect(() => {
    if (!isTrackingActive) return;

    const unsubPos = pdrEngine.onPosition((pos) => {
      setLiveUserPos([pos.x, pos.z]);
    });

    const unsubStep = pdrEngine.onStep(() => {
      setStepCount((prev) => prev + 1);
    });

    const unsubOrientation = sensorManager.onOrientation((headingDeg) => {
      const aligned = (headingDeg + compassOffset + 360) % 360;
      setLiveHeading((aligned * Math.PI) / 180);
      setHeadingDegrees(Math.round(aligned / 2) * 2);
    });

    const unsubDebug = pdrEngine.onDebug((data) => {
      setLiveBounce(data.smoothedBounce);
    });

    return () => {
      unsubPos();
      unsubStep();
      unsubOrientation();
      unsubDebug();
    };
  }, [isTrackingActive, compassOffset]);

  // Adjust Calibration Values
  const handleSensitivityChange = (val) => {
    setStepPeakThreshold(val);
    pdrEngine.setStepPeakThreshold(val);
  };

  const handleStepLengthChange = (val) => {
    setBaseStepLength(val);
    pdrEngine.setBaseStepLength(val);
  };

  const handleIntervalChange = (val) => {
    setMinStepIntervalMs(val);
    pdrEngine.setMinStepIntervalMs(val);
  };

  const handleAdjustCompass = (deltaDeg) => {
    const newOffset = (compassOffset + deltaDeg + 360) % 360;
    setCompassOffset(newOffset);
    pdrEngine.setCompassOffset(newOffset);
  };

  const handlePathGatingChange = (active, angle = maxPathAngleDeg) => {
    setIsPathGatingActive(active);
    setMaxPathAngleDeg(angle);
    pdrEngine.setPathGating(active, angle);
  };

  // Step simulation for testing / desktop
  const handleSimulateStep = () => {
    pdrEngine.simulateStep(null, baseStepLength);
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
              <span className="live-hud-compass">
                🧭 {headingDegrees}° {getCardinalDirection(headingDegrees)}
              </span>
              <span className="live-hud-steps">🚶 {stepCount} steps</span>
            </div>

            {/* Calibration & Tuning Modal Trigger */}
            <button
              className="btn-calib-toggle"
              onClick={() => setShowCalibModal(true)}
              title="Open Sensor Calibration & Settings"
            >
              ⚙️ Tune
            </button>

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

      {/* Sensor Calibration & Tuning Modal */}
      {showCalibModal && (
        <div className="calib-modal-overlay" onClick={() => setShowCalibModal(false)}>
          <div className="calib-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="calib-modal-header">
              <h3>⚙️ Sensor & Movement Tuning</h3>
              <button className="btn-calib-close" onClick={() => setShowCalibModal(false)}>
                ✕
              </button>
            </div>

            <div className="calib-modal-body">
              {/* Live Telemetry Meter */}
              <div className="calib-telemetry-box">
                <div className="telemetry-label">
                  <span>Live Body Bounce:</span>
                  <strong>{liveBounce.toFixed(2)} m/s²</strong>
                </div>
                <div className="telemetry-bar-bg">
                  <div
                    className="telemetry-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, (liveBounce / 3.0) * 100))}%`,
                      background: liveBounce >= stepPeakThreshold ? '#00ff88' : '#00d2d3',
                    }}
                  />
                  <div
                    className="telemetry-threshold-line"
                    style={{
                      left: `${Math.min(100, (stepPeakThreshold / 3.0) * 100)}%`,
                    }}
                    title={`Trigger Threshold: ${stepPeakThreshold} m/s²`}
                  />
                </div>
                <span className="telemetry-hint">
                  Green trigger line at {stepPeakThreshold} m/s²
                </span>
              </div>

              {/* 1. Step Sensitivity Setting */}
              <div className="calib-control-group">
                <div className="calib-control-header">
                  <label>Step Sensitivity (Peak Threshold):</label>
                  <span>{stepPeakThreshold} m/s²</span>
                </div>
                <input
                  type="range"
                  min="0.60"
                  max="2.20"
                  step="0.05"
                  value={stepPeakThreshold}
                  onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                  className="calib-slider"
                />
                <div className="calib-presets">
                  <button
                    className={`btn-preset ${stepPeakThreshold === 0.85 ? 'active' : ''}`}
                    onClick={() => handleSensitivityChange(0.85)}
                  >
                    High (Soft Walk)
                  </button>
                  <button
                    className={`btn-preset ${stepPeakThreshold === 1.25 ? 'active' : ''}`}
                    onClick={() => handleSensitivityChange(1.25)}
                  >
                    Normal (1.25)
                  </button>
                  <button
                    className={`btn-preset ${stepPeakThreshold === 1.65 ? 'active' : ''}`}
                    onClick={() => handleSensitivityChange(1.65)}
                  >
                    Low (Firm Step)
                  </button>
                </div>
              </div>

              {/* 2. Step Stride Distance Setting */}
              <div className="calib-control-group">
                <div className="calib-control-header">
                  <label>Step Stride Distance:</label>
                  <span>{baseStepLength} map units</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="25.0"
                  step="0.5"
                  value={baseStepLength}
                  onChange={(e) => handleStepLengthChange(Number(e.target.value))}
                  className="calib-slider"
                />
                <div className="calib-presets">
                  <button
                    className={`btn-preset ${baseStepLength === 7.5 ? 'active' : ''}`}
                    onClick={() => handleStepLengthChange(7.5)}
                  >
                    Small (7.5)
                  </button>
                  <button
                    className={`btn-preset ${baseStepLength === 10.5 ? 'active' : ''}`}
                    onClick={() => handleStepLengthChange(10.5)}
                  >
                    Standard (10.5)
                  </button>
                  <button
                    className={`btn-preset ${baseStepLength === 15.0 ? 'active' : ''}`}
                    onClick={() => handleStepLengthChange(15.0)}
                  >
                    Large (15.0)
                  </button>
                </div>
              </div>

              {/* 3. Path Alignment Heading Gating */}
              <div className="calib-control-group">
                <div className="calib-control-header">
                  <label>Corridor Path Forward Angle:</label>
                  <span>±{maxPathAngleDeg}° {isPathGatingActive ? '(Active)' : '(Off)'}</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="90"
                  step="5"
                  value={maxPathAngleDeg}
                  onChange={(e) => handlePathGatingChange(isPathGatingActive, Number(e.target.value))}
                  className="calib-slider"
                />
                <div className="calib-presets">
                  <button
                    className={`btn-preset ${maxPathAngleDeg === 40 ? 'active' : ''}`}
                    onClick={() => handlePathGatingChange(true, 40)}
                  >
                    Strict (±40°)
                  </button>
                  <button
                    className={`btn-preset ${maxPathAngleDeg === 55 ? 'active' : ''}`}
                    onClick={() => handlePathGatingChange(true, 55)}
                  >
                    Natural (±55°)
                  </button>
                  <button
                    className={`btn-preset ${maxPathAngleDeg === 75 ? 'active' : ''}`}
                    onClick={() => handlePathGatingChange(true, 75)}
                  >
                    Wide (±75°)
                  </button>
                </div>
              </div>

              {/* 4. Cadence Lockout Interval */}
              <div className="calib-control-group">
                <div className="calib-control-header">
                  <label>Cadence Lockout (Anti-Double-Trigger):</label>
                  <span>{minStepIntervalMs} ms</span>
                </div>
                <input
                  type="range"
                  min="260"
                  max="650"
                  step="20"
                  value={minStepIntervalMs}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="calib-slider"
                />
              </div>

              {/* 5. Compass Alignment Offset */}
              <div className="calib-control-group">
                <div className="calib-control-header">
                  <label>Building Compass Alignment Offset:</label>
                  <span>{compassOffset}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={compassOffset > 180 ? compassOffset - 360 : compassOffset}
                  onChange={(e) => setCompassOffset(Number(e.target.value))}
                  className="calib-slider"
                />
                <div className="calib-presets">
                  <button className="btn-preset" onClick={() => handleAdjustCompass(-15)}>
                    ⟲ -15°
                  </button>
                  <button className="btn-preset" onClick={() => handleAdjustCompass(15)}>
                    ⟳ +15°
                  </button>
                  <button className="btn-preset" onClick={() => handleAdjustCompass(180)}>
                    Flip 180°
                  </button>
                  <button
                    className="btn-preset"
                    onClick={() => {
                      setCompassOffset(0);
                      pdrEngine.setCompassOffset(0);
                    }}
                  >
                    Reset (0°)
                  </button>
                </div>
              </div>
            </div>

            <div className="calib-modal-footer">
              <button className="btn-calib-done" onClick={() => setShowCalibModal(false)}>
                ✓ Done & Save
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
