import React, { useEffect, useState } from 'react';
import api from '../utils/axiosInstance';
import Header from '../components/Header';
import NavigationBar from '../components/NavigationBar';
import MapScene from '../components/MapScene';
import PointPickerInspector from '../admin/PointPickerInspector';

/**
 * HomePage — Main navigation page.
 * Manages all state (nodes, edges, navigation) and composes the full UI layout.
 */
export default function HomePage() {
  const [showGraph, setShowGraph] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState(false);

  // Navigation State
  const [startName, setStartName] = useState('');
  const [destName, setDestName] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState(null);

  const isDev = import.meta.env.DEV || process.env.NODE_ENV !== 'production';

  // Fetch Nodes & Edges from Backend on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesRes, edgesRes] = await Promise.all([
          api.get('/api/nodes'),
          api.get('/api/edges'),
        ]);

        const fetchedNodes = nodesRes.data?.data || [];
        const fetchedEdges = edgesRes.data?.data || [];

        if (!fetchedNodes.length) {
          setServerError(true);
        } else {
          setNodes(fetchedNodes);
          setEdges(fetchedEdges);

          // Set default selections to first entrance and first room
          const firstEntrance = fetchedNodes.find((n) => n.type === 'entrance');
          const firstRoom = fetchedNodes.find((n) => n.type === 'room');
          if (firstEntrance) setStartName(firstEntrance.name);
          if (firstRoom) setDestName(firstRoom.name);
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
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0c0c1d', fontFamily: "'Inter', 'Segoe UI', sans-serif"
      }}>
        <div style={{
          background: '#161625', border: '2px solid #e74c3c', borderRadius: '16px',
          padding: '40px 50px', textAlign: 'center', maxWidth: '480px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#e74c3c', margin: '0 0 10px 0', fontSize: '1.4rem' }}>Server Unreachable</h2>
          <p style={{ color: '#dcdde1', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            Unable to connect to the navigation server. Please make sure the backend is running and try again.
          </p>
          <button
            onClick={handleRetry}
            style={{
              padding: '10px 28px', borderRadius: '8px', background: '#00ff88', color: '#000',
              border: 'none', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 255, 136, 0.4)'
            }}
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0c0c1d', fontFamily: "'Inter', 'Segoe UI', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px', animation: 'spin 1.5s linear infinite' }}>🏥</div>
          <p style={{ color: '#00ff88', fontSize: '1.1rem', fontWeight: 'bold' }}>Connecting to server...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <Header
        isDev={isDev}
        showGraph={showGraph}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onOpenInspector={() => setShowInspector(true)}
      />

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
        edges={edges}
        showGraph={showGraph}
        routeData={routeData}
      />

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
