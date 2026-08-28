import React from 'react';
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
  return (
    <div className="nav-floating-container">
      {/* Glassmorphic Navigation Panel — Always Editable */}
      <div className="nav-glass-panel">
        <div className="nav-form-row">
          {/* Start & Destination Selectors */}
          <div className="nav-select-group">
            {/* Start Location Select */}
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
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="nav-arrow-separator">➔</span>

            {/* Destination Location Select */}
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

          {/* Action Buttons */}
          <div className="nav-actions-group">
            <button
              onClick={onFindRoute}
              disabled={isNavigating}
              className="btn-find-route"
            >
              {isNavigating ? 'Computing...' : 'Find Route'}
            </button>

            {routeData && (
              <button
                onClick={onClearRoute}
                className="btn-clear-route"
              >
                ✖ Clear
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
    </div>
  );
}
