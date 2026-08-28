import React from 'react';
import './MapLoader.css';

/**
 * Reusable animated 3D Map / Radar Loader component.
 *
 * @param {string} title - Main status header
 * @param {string} subtitle - Secondary description text
 * @param {boolean} isOverlay - If true, wraps in a full-screen dark overlay
 */
export default function MapLoader({
  title = 'Initializing 3D Map',
  subtitle = 'Calibrating hospital nodes & pathways...',
  isOverlay = true,
}) {
  const content = (
    <div className="map-loader-card">
      <div className="map-radar-spinner">
        <div className="map-radar-ring ring-outer" />
        <div className="map-radar-ring ring-middle" />
        <div className="map-radar-ring ring-inner" />
        <div className="map-radar-beam" />
        <div className="map-radar-core">
          <svg
            className="map-nav-beacon-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L19 21L12 17L5 21L12 2Z"
              fill="#00ff88"
              stroke="#00ff88"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <h3 className="map-loading-title">{title}</h3>
      <p className="map-loading-subtitle">{subtitle}</p>
    </div>
  );

  if (!isOverlay) return content;

  return <div className="map-status-overlay">{content}</div>;
}
