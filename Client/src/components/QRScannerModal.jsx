import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Lock, AlertTriangle, MapPin, Navigation, ArrowLeft, ArrowRight, Target } from 'lucide-react';
import './QRScannerModal.css';

/**
 * Parses scanned location text or URL into a location name.
 */
export function parseLocationFromQR(decodedText, availableNodes = []) {
  if (!decodedText) return '';
  let candidate = decodedText.trim();

  // 1. Check if it's a URL
  try {
    const url = new URL(candidate, window.location.origin);
    const paramVal =
      url.searchParams.get('start') ||
      url.searchParams.get('from') ||
      url.searchParams.get('location') ||
      url.searchParams.get('room') ||
      url.searchParams.get('node') ||
      url.searchParams.get('destination') ||
      url.searchParams.get('dest');
    if (paramVal) {
      candidate = decodeURIComponent(paramVal).trim();
    }
  } catch {
    // Not a valid URL
  }

  // 2. Check if it's JSON
  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed === 'object' && parsed !== null) {
      candidate =
        parsed.start ||
        parsed.from ||
        parsed.location ||
        parsed.room ||
        parsed.name ||
        parsed.node ||
        parsed.destination ||
        candidate;
    }
  } catch {
    // Not JSON
  }

  // 3. Match against known nodes list (case-insensitive) if available
  if (Array.isArray(availableNodes) && availableNodes.length > 0) {
    const exactMatch = availableNodes.find(
      (n) => n.name && n.name.toLowerCase() === candidate.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.name;
    }
  }

  return candidate;
}

/**
 * Web Audio feedback tone on successful scan
 */
function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // A6

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio restrictions
  }
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  availableNodes = [],
  initialStart = '',
}) {
  const scannerRef = useRef(null);
  const hasHandledScanRef = useRef(false);

  const [step, setStep] = useState(initialStart ? 2 : 1); // 1 = Scan Start Location, 2 = Select Destination
  const [currentStart, setCurrentStart] = useState(initialStart || '');
  const [selectedDest, setSelectedDest] = useState('');

  const [cameraState, setCameraState] = useState('active'); // 'active' | 'error' | 'insecure_context'
  const [errorMessage, setErrorMessage] = useState('');

  const scannerElementId = 'qr-camera-stream-box';

  // Filter selectable destination rooms / departments
  const destinationOptions = availableNodes.filter(
    (n) => n.type === 'room' || n.type === 'entrance'
  );

  const popularDestinations = [
    'Emergency',
    'Pharmacy',
    'ICU',
    'Radiology',
    'Laboratory',
    'Cafeteria',
    'Reception',
    'Casuality',
  ];

  // Stop camera helper
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
    }
  };

  // Handle successful scan or location selection in Step 1
  const handleStartLocationSelected = (locationName) => {
    if (!locationName) return;

    setCurrentStart(locationName);

    // Audio & Haptic Feedback
    if (navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch {}
    }
    playSuccessSound();

    // Stop live camera feed
    stopCamera();

    // Default destination: first room that is different from start
    const defaultDest =
      destinationOptions.find((n) => n.name !== locationName)?.name ||
      'Pharmacy';
    setSelectedDest(defaultDest);

    // Advance immediately to Step 2
    setStep(2);
  };

  const handleDecodedResult = (rawDecodedText) => {
    if (hasHandledScanRef.current) return;
    hasHandledScanRef.current = true;

    const locationName = parseLocationFromQR(rawDecodedText, availableNodes);
    handleStartLocationSelected(locationName);
  };

  // Immediate start scanner
  const startScanner = async () => {
    setCameraState('active');
    setErrorMessage('');
    hasHandledScanRef.current = false;

    // Check if running in an insecure HTTP context on a LAN IP
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCameraState('insecure_context');
      return;
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(minEdge * 0.72));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      try {
        await scannerRef.current.start(
          { facingMode: 'environment' },
          scanConfig,
          (decodedText) => handleDecodedResult(decodedText),
          () => {}
        );
      } catch {
        // Fallback to user camera
        await scannerRef.current.start(
          { facingMode: 'user' },
          scanConfig,
          (decodedText) => handleDecodedResult(decodedText),
          () => {}
        );
      }

      setCameraState('active');
    } catch (err) {
      console.error('Camera Scanner start failed:', err);
      setCameraState('error');
      const errStr = String(err?.message || err || '');
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser.');
      } else if (errStr.includes('NotFoundError') || errStr.includes('device')) {
        setErrorMessage('No camera device found. Please select your location below.');
      } else {
        setErrorMessage('Unable to access camera. Please select your location below.');
      }
    }
  };

  // Final confirmation to start navigation
  const handleConfirmNavigation = (destinationToUse) => {
    const finalDest = destinationToUse || selectedDest;
    if (!currentStart || !finalDest) return;

    if (onScanSuccess) {
      onScanSuccess({
        start: currentStart,
        destination: finalDest,
      });
    }
  };

  // Reset modal when reopened
  useEffect(() => {
    if (isOpen) {
      if (initialStart) {
        setCurrentStart(initialStart);
        const defaultDest =
          destinationOptions.find((n) => n.name !== initialStart)?.name || 'Pharmacy';
        setSelectedDest(defaultDest);
        setStep(2);
      } else {
        setStep(1);
        setCurrentStart('');
        setSelectedDest('');
        hasHandledScanRef.current = false;
        startScanner();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, initialStart]);

  if (!isOpen) return null;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-title-box">
            
            <h3 className="qr-modal-title">
              {step === 1 ? 'Scan Current Location' : 'Choose Destination'}
            </h3>
          </div>
          <button className="qr-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ================================================================= */}
        {/* STEP 1: SCAN OR SELECT CURRENT LOCATION */}
        {/* ================================================================= */}
        {step === 1 && (
          <div className="qr-step-container">
            {/* Live Camera Viewfinder */}
            <div className="qr-scanner-wrapper">
              <div id={scannerElementId} className="qr-reader-container" />

              {/* Glowing Target Reticle & Scanning Laser */}
              {cameraState === 'active' && (
                <div className="qr-reticle">
                  <div className="qr-corner top-left" />
                  <div className="qr-corner top-right" />
                  <div className="qr-corner bottom-left" />
                  <div className="qr-corner bottom-right" />
                  <div className="qr-laser-line" />
                </div>
              )}

              {/* Insecure Context Overlay */}
              {cameraState === 'insecure_context' && (
                <div className="qr-state-overlay">
                  <div className="qr-state-icon">
                    <Lock size={24} color="#ffaa00" />
                  </div>
                  <p className="qr-state-text qr-state-error" style={{ marginBottom: '14px' }}>
                    Camera access is blocked on HTTP network addresses.
                  </p>
                  <button
                    className="qr-btn-retry"
                    style={{ background: '#00ff88', color: '#000', padding: '8px 16px', fontWeight: 'bold' }}
                    onClick={() => {
                      window.location.href = `https://${window.location.host}${window.location.pathname}${window.location.search}`;
                    }}
                  >
                    Switch to HTTPS
                  </button>
                </div>
              )}

              {/* Error Overlay */}
              {cameraState === 'error' && (
                <div className="qr-state-overlay">
                  <div className="qr-state-icon">
                    <AlertTriangle size={24} color="#ff4757" />
                  </div>
                  <p className="qr-state-text qr-state-error">{errorMessage}</p>
                  <button className="qr-btn-retry" onClick={startScanner}>
                    Retry Camera
                  </button>
                </div>
              )}
            </div>

            {/* Quick Location Presets */}
            <div>
              <p className="qr-preset-label">Or select current location:</p>
              <div className="qr-preset-container" style={{ marginBottom: 0 }}>
                {['Main Entrance', 'Emergency Entrance', 'Pharmacy', 'Cafeteria', 'Reception', 'ICU'].map(
                  (loc) => (
                    <button
                      key={loc}
                      className="qr-btn-preset"
                      onClick={() => handleStartLocationSelected(loc)}
                    >
                      <Target size={13} style={{ marginRight: '5px' }} /> {loc}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2: SELECT DESTINATION & START DIRECT ROUTING */}
        {/* ================================================================= */}
        {step === 2 && (
          <div className="qr-step-container">
            {/* Start Location Confirmed Banner */}
            <div className="qr-location-summary-card">
              <div className="qr-location-summary-left">
                <Target size={18} color="#00ff88" style={{ marginRight: '8px', flexShrink: 0 }} />
                <div>
                  <div className="qr-location-summary-label">Current Location</div>
                  <div className="qr-location-summary-val">{currentStart}</div>
                </div>
              </div>
              <button
                className="qr-btn-change-start"
                onClick={() => {
                  setStep(1);
                  setTimeout(() => startScanner(), 100);
                }}
              >
                Change
              </button>
            </div>

            {/* Destination Dropdown */}
            <div className="qr-dest-field-group">
              <label className="qr-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} color="#ff4d4f" /> Where do you want to go?
              </label>
              <select
                className="qr-dest-dropdown"
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
              >
                {destinationOptions.map((n, idx) => (
                  <option key={n._id || n.name || idx} value={n.name}>
                    {n.name} {n.type ? `(${n.type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Popular 1-Tap Destination Chips */}
            <div>
              <p className="qr-preset-label">Popular Destinations:</p>
              <div className="qr-popular-grid">
                {popularDestinations.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    className={`qr-btn-popular-dest ${selectedDest === dest ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDest(dest);
                      handleConfirmNavigation(dest);
                    }}
                  >
                    <MapPin size={13} color="#ff4d4f" />
                    <span>{dest}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="qr-step2-actions">
              <button
                type="button"
                className="qr-btn-back"
                onClick={() => {
                  setStep(1);
                  setTimeout(() => startScanner(), 100);
                }}
              >
                <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back
              </button>
              <button
                type="button"
                className="qr-btn-start-nav"
                onClick={() => handleConfirmNavigation(selectedDest)}
              >
                <span>Start 3D Navigation</span>
                <ArrowRight size={15} style={{ marginLeft: '6px' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
