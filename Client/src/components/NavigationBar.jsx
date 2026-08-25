import React from 'react';

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
  return (
    <>
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
              value={startName}
              onChange={(e) => onStartChange(e.target.value)}
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
                <option key={n._id || n.name || idx} value={n.name}>
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
              value={destName}
              onChange={(e) => onDestChange(e.target.value)}
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
                <option key={n._id || n.name || idx} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button
              onClick={onFindRoute}
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
                onClick={onClearRoute}
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
    </>
  );
}
