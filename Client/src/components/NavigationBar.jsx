import React, { useState, useEffect } from 'react';
import './NavigationBar.css';

export default function NavigationBar({
  startName,
  destName,
  onStartChange,
  onDestChange,
  onFindRoute,
  onClearRoute,
  isNavigating,
  routeData,
  navError,
  selectableStartNodes,
  selectableDestNodes,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse to compact HUD pill once route is generated
  useEffect(() => {
    if (routeData) {
      setIsCollapsed(true);
    }
  }, [routeData]);

  const handleRouteClick = () => {
    onFindRoute();
  };

  return (
    <div className="nav-floating-container">
      {/* 1. If Route is Active and Collapsed, show ultra-compact HUD Pill */}
      {routeData && isCollapsed ? (
        <div className="nav-hud-bar">
          <div className="nav-hud-info">
            <span>🚩</span>
            <span className="nav-hud-route-name">{startName}</span>
            <span>➔</span>
            <span>🎯</span>
            <span className="nav-hud-route-name">{destName}</span>
            {/* <span className="nav-hud-stats">
              {routeData.totalDistance}px • {routeData.waypointCount} steps
            </span> */}
          </div>

          <div className="nav-hud-actions">
            <button
              className="btn-hud-edit"
              onClick={() => setIsCollapsed(false)}
              title="Edit Route Locations"
            >
              Edit
            </button>
            <button
              className="btn-hud-clear"
              onClick={() => {
                onClearRoute();
                setIsCollapsed(false);
              }}
              title="Clear Route"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        /* 2. Full Glassmorphic Navigation Panel */
        <div className="nav-glass-panel">
          <div className="nav-form-row">
            {/* Start & Destination Group */}
            <div className="nav-select-group">
              {/* Start Select */}
              <div className="nav-input-wrapper">
                <span className="nav-input-icon">🚩</span>
                <select
                  value={startName}
                  onChange={(e) => onStartChange(e.target.value)}
                  className="nav-select"
                  aria-label="Start Location"
                >
                  {selectableStartNodes.map((n, idx) => (
                    <option key={n._id || n.name || idx} value={n.name}>
                      {n.name} ({n.type})
                    </option>
                  ))}
                </select>
              </div>

              <span className="nav-arrow-separator">➔</span>

              {/* Destination Select */}
              <div className="nav-input-wrapper">
                <span className="nav-input-icon">🎯</span>
                <select
                  value={destName}
                  onChange={(e) => onDestChange(e.target.value)}
                  className="nav-select dest-select"
                  aria-label="Destination Location"
                >
                  {selectableDestNodes.map((n, idx) => (
                    <option key={n._id || n.name || idx} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons Group */}
            <div className="nav-actions-group">
              <button
                onClick={handleRouteClick}
                disabled={isNavigating}
                className="btn-find-route"
              >
                {isNavigating ? '⏳ Computing...' : '🧭 Find Route'}
              </button>

              {routeData && (
                <button
                  onClick={onClearRoute}
                  className="btn-clear-route"
                >
                  ✖ Clear
                </button>
              )}

              {routeData && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="btn-toggle-nav"
                  title="Minimize Panel"
                >
                  ▲ Minimize
                </button>
              )}
            </div>
          </div>

          {/* Inline Error Toast */}
          {navError && (
            <div className="nav-error-toast">
              <span>⚠️ {navError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
