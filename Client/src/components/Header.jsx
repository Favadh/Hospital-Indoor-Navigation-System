import React from 'react';

export default function Header({
  isDev,
  showGraph,
  onToggleGraph,
  onOpenInspector,
}) {
  return (
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
            onClick={onOpenInspector}
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
          onClick={onToggleGraph}
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
  );
}
