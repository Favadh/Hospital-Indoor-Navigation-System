import React from 'react';
import { Link } from 'react-router-dom';
import './ServerErrorScreen.css';

/**
 * Reusable animated Server Unreachable / Connection Lost Error screen.
 *
 * @param {string} title - Alert title text
 * @param {string} desc - Alert message description
 * @param {Function} onRetry - Handler function for retry button
 * @param {string} homePath - Path for the Home navigation button (default: '/')
 * @param {boolean} isOverlay - If true, wraps in a full-screen dark overlay
 */
export default function ServerErrorScreen({
  title = 'Server Connection Lost',
  desc = 'Unable to connect to the navigation server. Make sure you have stable connection try again.',
  onRetry = () => window.location.reload(),
  homePath = '/',
  isOverlay = true,
}) {
  const content = (
    <div className="map-loader-card">
      <div className="map-alert-spinner">
        <div className="map-alert-ring ring-alert-outer" />
        <div className="map-alert-ring ring-alert-middle" />
        <div className="map-alert-ring ring-alert-inner" />
        <div className="map-alert-core">
          <svg
            className="map-alert-beacon-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 9V14M12 17.5V18M10.29 3.86L1.82 18A2 2 0 003.55 21H20.45A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
              stroke="#ff4757"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <h2 className="map-alert-title">{title}</h2>
      <p className="map-alert-desc">{desc}</p>
      <div className="map-error-actions">
        {onRetry && (
          <button onClick={onRetry} className="btn-retry-alert">
            Retry
          </button>
        )}
        {homePath && (
          <Link to={homePath} className="btn-home-alert">
            Go Home
          </Link>
        )}
      </div>
    </div>
  );

  if (!isOverlay) return content;

  return <div className="map-status-overlay">{content}</div>;
}
