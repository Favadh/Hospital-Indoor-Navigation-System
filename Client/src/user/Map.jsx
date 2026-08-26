import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/axiosInstance';
import Header from '../components/Header';
import NavigationBar from '../components/NavigationBar';
import MapScene from '../components/MapScene';
import './Map.css';

/**
 * Map Page — Dedicated 3D Hospital Map & Navigation screen.
 * Supports URL search params (?start=...&destination=...) e.g., after QR code scans.
 */
export default function Map() {
  const [searchParams] = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState(false);

  // Navigation State
  const [startName, setStartName] = useState(searchParams.get('start') || '');
  const [destName, setDestName] = useState(searchParams.get('destination') || '');
  const [routeData, setRouteData] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState(null);

  // Fetch Nodes from Backend on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const nodesRes = await api.get('/api/nodes');
        const fetchedNodes = nodesRes.data?.data || [];

        if (!fetchedNodes.length) {
          setServerError(true);
        } else {
          setNodes(fetchedNodes);

          // If startName not provided by URL params, set default
          const queryStart = searchParams.get('start');
          const queryDest = searchParams.get('destination');

          if (!queryStart) {
            const firstEntrance = fetchedNodes.find((n) => n.type === 'entrance');
            if (firstEntrance) setStartName(firstEntrance.name);
          } else {
            setStartName(queryStart);
          }

          if (!queryDest) {
            const firstRoom = fetchedNodes.find((n) => n.type === 'room');
            if (firstRoom) setDestName(firstRoom.name);
          } else {
            setDestName(queryDest);
          }
        }
      } catch {
        setServerError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  // Filterable Node Lists for dropdowns
  const selectableStartNodes = nodes.filter((n) => n.type === 'entrance' || n.type === 'room');
  const selectableDestNodes = nodes.filter((n) => n.type === 'room' || n.type === 'entrance');

  // Trigger Dijkstra Navigation API
  const handleFindShortestPath = async () => {
    if (!startName || !destName) return;
    if (startName === destName) {
      setNavError('Start and Destination locations must be different!');
      return;
    }

    setIsNavigating(true);
    setNavError(null);

    try {
      const res = await api.get('/api/navigation/shortest-path', {
        params: { start: startName, destination: destName },
      });

      if (res.data.success && res.data.path) {
        setRouteData(res.data);
      } else {
        setNavError(res.data.message || 'Path not found');
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

  const handleRetry = () => {
    setServerError(false);
    setIsLoading(true);
    window.location.reload();
  };

  // Server Down Prompt
  if (serverError) {
    return (
      <div className="map-status-overlay">
        <div className="map-error-card">
          <div className="map-error-icon">⚠️</div>
          <h2 className="map-error-title">Server Unreachable</h2>
          <p className="map-error-desc">
            Unable to connect to the navigation server. Please make sure the backend is running and try again.
          </p>
          <div className="map-error-actions">
            <button onClick={handleRetry} className="btn-retry">
              🔄 Retry Connection
            </button>
            <Link to="/" className="btn-home">
              🏠 Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="map-status-overlay">
        <div className="map-loading-box">
          <div className="map-spinner-icon">🏥</div>
          <p className="map-loading-text">Loading 3D Hospital Map...</p>
        </div>
      </div>
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
        onFindRoute={handleFindShortestPath}
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
      />
    </div>
  );
}
