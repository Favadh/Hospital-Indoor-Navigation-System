import React, { useState } from 'react';

const SVG_W = 1920;
const SVG_H = 1080;

// ============================================================================
// POINT & CLICK INSPECTOR COMPONENT (Preserved for Admin Module / Dev Tools)
// ============================================================================
export default function PointPickerInspector({ onClose, nodes = [], edges = [] }) {
  const [clickedPin, setClickedPin] = useState(null);
  const [clickHistory, setClickHistory] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.nodeId, n));

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const svgX = Math.round((clickX / rect.width) * SVG_W);
    const svgY = Math.round((clickY / rect.height) * SVG_H);

    const newPoint = { x: svgX, y: svgY, time: new Date().toLocaleTimeString() };
    setClickedPin(newPoint);
    setClickHistory((prev) => [newPoint, ...prev]);
  };

  const copyPointText = (pt, idx) => {
    navigator.clipboard.writeText(`X = ${pt.x}, Y = ${pt.y}`);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getNodeColor = (type) => {
    switch (type) {
      case 'room': return '#ff3838';
      case 'entrance': return '#00ff88';
      case 'junction': return '#00d2d3';
      default: return '#ffffff';
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(10, 10, 20, 0.96)', zIndex: 9999, display: 'flex', flexDirection: 'column',
      color: 'white', fontFamily: 'sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', background: '#161625', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '2px solid #00ff88'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#00ff88', fontSize: '1.2rem' }}>🎯 Point Inspector (Admin & Dev Coordinate Tool)</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Click anywhere to see exact X, Y coordinates on your map!</p>
        </div>
        <button onClick={onClose} style={{ padding: '8px 18px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          ✖ Close Inspector
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Map View with SVG + Full Graph Overlay */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '1200px', aspectRatio: '16/9', border: '2px solid #00ff88', borderRadius: '8px', overflow: 'hidden', cursor: 'crosshair', background: '#ffffff' }} onClick={handleMapClick}>
            <img src="/Hospital G.svg" alt="Hospital Map" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />

            {/* 2D SVG Overlay of EDGES */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
              {edges.map((e, idx) => {
                const n1 = nodeMap.get(e.from);
                const n2 = nodeMap.get(e.to);
                if (!n1 || !n2) return null;
                return (
                  <line
                    key={`2d-edge-${idx}`}
                    x1={n1.x} y1={n1.y}
                    x2={n2.x} y2={n2.y}
                    stroke="#00ff88"
                    strokeWidth="3"
                    strokeDasharray="5 5"
                  />
                );
              })}
            </svg>

            {/* 2D Overlay of NODES */}
            {nodes.map((n) => (
              <div key={n.nodeId} style={{
                position: 'absolute',
                left: `${(n.x / SVG_W) * 100}%`,
                top: `${(n.y / SVG_H) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '14px', height: '14px', borderRadius: '50%',
                background: getNodeColor(n.type),
                border: '2px solid white', boxShadow: '0 0 6px rgba(0,0,0,0.8)',
                pointerEvents: 'none', zIndex: 2
              }}>
                <span style={{
                  position: 'absolute',
                  bottom: '14px', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.88)', color: 'white', padding: '2px 5px',
                  borderRadius: '3px', fontSize: '9px', whiteSpace: 'nowrap'
                }}>
                  {n.name} ({n.x}, {n.y})
                </span>
              </div>
            ))}

            {/* Active Clicked Pin */}
            {clickedPin && (
              <div style={{
                position: 'absolute',
                left: `${(clickedPin.x / SVG_W) * 100}%`,
                top: `${(clickedPin.y / SVG_H) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#ff00ff', border: '3px solid white', boxShadow: '0 0 16px #ff00ff',
                pointerEvents: 'none', zIndex: 10
              }}>
                <span style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', background: '#ff00ff', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  📍 (X: {clickedPin.x}, Y: {clickedPin.y})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Coords History */}
        <div style={{ width: '320px', background: '#161625', padding: '20px', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#00ff88', fontSize: '1rem' }}>📍 Clicked Coordinates History</h3>
          
          {clickedPin && (
            <div style={{ background: 'rgba(255, 0, 255, 0.15)', border: '2px solid #ff00ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>LATEST CLICKED POINT</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff00ff', margin: '4px 0' }}>
                X = {clickedPin.x}, Y = {clickedPin.y}
              </div>
              <button onClick={() => copyPointText(clickedPin, 999)} style={{ padding: '6px 12px', background: '#ff00ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                📋 Copy `X = {clickedPin.x}, Y = {clickedPin.y}`
              </button>
            </div>
          )}

          {/* Legend */}
          <div style={{ background: '#111', padding: '10px', borderRadius: '6px', border: '1px solid #333', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#00ff88' }}>Graph Legend:</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff3838' }} /> Rooms at Doors ({nodes.filter(n=>n.type==='room').length})</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ff88' }} /> Entrances ({nodes.filter(n=>n.type==='entrance').length})</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00d2d3' }} /> Hallway Junctions ({nodes.filter(n=>n.type==='junction').length})</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><div style={{ width: '20px', height: '2px', background: '#00ff88' }} /> Edges ({edges.length} Walkable Paths)</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: '#111', padding: '10px', borderRadius: '6px', border: '1px solid #333' }}>
            {clickHistory.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.85rem', textAlign: 'center' }}>Click anywhere on the map to record coordinates!</p>}
            {clickHistory.map((pt, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #222', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><b>Point #{clickHistory.length - i}</b></span>
                <span style={{ color: '#00ff88', fontWeight: 'bold' }}>X={pt.x}, Y={pt.y}</span>
                <button onClick={() => copyPointText(pt, i)} style={{ padding: '3px 6px', fontSize: '0.75rem', background: '#333', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                  {copiedIndex === i ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
