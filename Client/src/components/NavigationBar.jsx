import React, { useMemo } from 'react';
import { MapPin, Target } from 'lucide-react';
import { svgToWorld } from '../constants/mapConstants';
import './NavigationBar.css';

/**
 * Google Maps-Style Route Planner Card (Exact Friend's UI & UX Architecture)
 * - Start Location (🔵 Blue my_location) & Destination (🔴 Red location_on).
 * - Distance & Estimated Time display in emerald green.
 * - Prominent "Start" Navigation pill button.
 * - Accessible "Avoid Stairs" option.
 */
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
  isTrackingActive,
  onStartTracking,
  onOpenScanner,
}) {
  // If navigating is active, this top card is hidden (matches Google Maps clean map view)
  if (isTrackingActive && routeData && routeData.path && routeData.path.length >= 2) {
    return null;
  }

  // Calculate route distance and estimated walk time using actual 3D Euclidean coordinates
  const { totalMeters, approxMins } = useMemo(() => {
    if (!routeData?.path || routeData.path.length < 2) {
      return { totalMeters: 0, approxMins: 0 };
    }
    let totalWorldUnits = 0;
    for (let i = 0; i < routeData.path.length - 1; i++) {
      const [x1, z1] = svgToWorld(routeData.path[i].x, routeData.path[i].y);
      const [x2, z2] = svgToWorld(routeData.path[i + 1].x, routeData.path[i + 1].y);
      totalWorldUnits += Math.hypot(x2 - x1, z2 - z1);
    }
    // 1 step = 22.5 world units = 0.75m -> 1 world unit = 0.75 / 22.5 = 0.0333m
    const meters = Math.max(1, Math.round(totalWorldUnits * (0.75 / 22.5)));
    const mins = Math.max(1, Math.ceil(meters / 65)); // 65 meters/min average indoor walking speed
    return { totalMeters: meters, approxMins: mins };
  }, [routeData]);

  const handleSwap = () => {
    if (!startName || !destName) return;
    const prevStart = startName;
    const prevDest = destName;
    onStartChange(prevDest);
    onDestChange(prevStart);
  };

  return (
    <div className="gmaps-planner-overlay">
      <div className="gmaps-planner-card animate-scale-in">
        {/* Card Header */}
        <div className="gmaps-planner-header">
          <div className="gmaps-planner-title">
            <h2>Route Planner</h2>
          </div>

          <button
            className="gmaps-btn-qr-scan"
            onClick={onOpenScanner}
            title="Scan Location QR"
            type="button"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="3" height="3" fill="currentColor" />
              <rect x="14" y="7" width="3" height="3" fill="currentColor" />
              <rect x="7" y="14" width="3" height="3" fill="currentColor" />
            </svg>
            <span>Scan QR</span>
          </button>
        </div>

        {/* Search Bars */}
        <div className="gmaps-search-inputs">
          {/* Start Location Input */}
          <div className="gmaps-search-bar">
            <Target size={18} color="#00ff88" className="gmaps-input-pin gmaps-pin-start" />
            <select
              value={startName}
              onChange={(e) => onStartChange(e.target.value)}
              className="gmaps-bar-select"
              aria-label="Start Location"
            >
              {selectableStartNodes.map((n, idx) => (
                <option key={n._id || n.name || idx} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Location Input */}
          <div className="gmaps-search-bar">
            <MapPin size={18} color="#ff4d4f" className="gmaps-input-pin gmaps-pin-dest" />
            <select
              value={destName || ''}
              onChange={(e) => onDestChange(e.target.value)}
              className="gmaps-bar-select gmaps-select-destination"
              aria-label="Destination Location"
            >
              <option value="" disabled>
                Choose destination...
              </option>
              {selectableDestNodes.map((n, idx) => (
                <option key={n._id || n.name || idx} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottom Row: Distance Estimate & Action Buttons */}
        <div className="gmaps-planner-footer">
          <div className="gmaps-distance-display">
            {routeData ? (
              <span className="gmaps-distance-active">
                ~{totalMeters}m <span className="gmaps-time-estimate">(Approx. {approxMins} min)</span>
              </span>
            ) : (
              <span className="gmaps-distance-idle">Select destination to calculate route</span>
            )}
          </div>

          <div className="gmaps-footer-btns">
            {routeData && (
              <button
                className="gmaps-btn-outline"
                onClick={onClearRoute}
                type="button"
              >
                Clear
              </button>
            )}

            <button
              className="gmaps-btn-primary"
              onClick={onFindRoute}
              disabled={isNavigating || !destName}
              type="button"
            >
              {isNavigating ? (
                <>
                  <span className="gmaps-btn-spinner" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" fill="currentColor" />
                  </svg>
                  <span>Start</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Toast */}
        {navError && (
          <div className="gmaps-planner-error animate-shake">
            <span>⚠️ {navError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
