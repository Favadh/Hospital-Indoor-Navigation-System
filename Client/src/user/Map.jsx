import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/axiosInstance';
import Header from '../components/Header';
import NavigationBar from '../components/NavigationBar';
import MapScene from '../components/MapScene';
import QRScannerModal from '../components/QRScannerModal';
import MapLoader from '../components/MapLoader';
import ServerErrorScreen from '../components/ServerErrorScreen';
import './Map.css';

/**
 * Map Page — Dedicated 3D Hospital Map & Navigation screen.
 * Supports URL search params (?start=...&destination=...) e.g., after QR code scans.
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

  // Trigger Dijkstra Navigation API with custom or current start/dest
  const handleFindShortestPath = useCallback(
    async (customStart, customDest) => {
      const s = customStart || startName;
      const d = customDest || destName;

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
    },
    [startName, destName]
  );

  // Fetch Nodes from Backend on mount & auto-calculate if query params exist
  useEffect(() => {
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

          // If both start and dest were explicitly specified in URL params, auto-calculate route
          if (queryStart && queryDest && queryStart !== queryDest) {
            handleFindShortestPath(queryStart, queryDest);
          }
        }
      } catch {
        setServerError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams, handleFindShortestPath]);

  // Filterable Node Lists for dropdowns
  const selectableStartNodes = nodes.filter((n) => n.type === 'entrance' || n.type === 'room');
  const selectableDestNodes = nodes.filter((n) => n.type === 'room' || n.type === 'entrance');

  const handleClearRoute = () => {
    setRouteData(null);
    setNavError(null);
  };

  const handleRetry = () => {
    setServerError(false);
    setIsLoading(true);
    window.location.reload();
  };

  // When QR code is scanned & destination selected in modal
  const handleScanSuccess = (scanResult) => {
    setShowScannerModal(false);
    const start = typeof scanResult === 'object' ? scanResult.start : scanResult;
    const dest = typeof scanResult === 'object' ? scanResult.destination : '';

    if (start) setStartName(start);
    if (dest) setDestName(dest);

    if (start && dest && start !== dest) {
      handleFindShortestPath(start, dest);
      setSearchParams({ start, destination: dest });
    } else if (start) {
      setSearchParams({ start });
    }
  };

  // Server Down Prompt
  if (serverError) {
    return <ServerErrorScreen onRetry={handleRetry} homePath="/" />;
  }

  // Loading State
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
        onStartChange={setStartName}
        onDestChange={setDestName}
        onFindRoute={() => handleFindShortestPath(startName, destName)}
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
      />

      {/* Floating QR Scanner Button */}
      <button
        className="map-qr-fab"
        onClick={() => setShowScannerModal(true)}
        title="Scan Location QR Code"
        aria-label="Scan Location QR"
      >
        <span className="map-qr-fab-icon">📷</span>
        
      </button>

      <QRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
        availableNodes={nodes}
      />
    </div>
  );
}
