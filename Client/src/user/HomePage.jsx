import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Compass,
  MapPin,
  ArrowRight,
  Siren,
  Building2,
  Smartphone,
  Accessibility,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import Header from '../components/Header';
import QRScannerModal from '../components/QRScannerModal';
import api from '../utils/axiosInstance';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Fetch list of rooms/entrances for quick navigation buttons
  useEffect(() => {
    api.get('/api/nodes')
      .then((res) => {
        if (res.data?.data) {
          setNodes(res.data.data);
        }
      })
      .catch(() => console.log('Nodes fetch deferred'));
  }, []);

  // If user opens a QR code link landing on the root URL (/?start=...), forward to /map
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('start') || params.get('from') || params.get('location');
    const destParam = params.get('destination') || params.get('dest');
    if (startParam && destParam) {
      navigate(`/map?start=${encodeURIComponent(startParam)}&destination=${encodeURIComponent(destParam)}`, { replace: true });
    } else if (startParam) {
      navigate(`/map?start=${encodeURIComponent(startParam)}`, { replace: true });
    }
  }, [navigate]);

  const handleScanSuccess = (scanResult) => {
    setShowScannerModal(false);
    const start = typeof scanResult === 'object' ? scanResult.start : scanResult;
    const dest = typeof scanResult === 'object' ? scanResult.destination : '';
    if (dest) {
      navigate(`/map?start=${encodeURIComponent(start)}&destination=${encodeURIComponent(dest)}`);
    } else {
      navigate(`/map?start=${encodeURIComponent(start)}`);
    }
  };

  const popularDestinations = ['ICU', 'Emergency', 'Pharmacy', 'Lab', 'Reception', 'Casuality'];

  return (
    <div className="home-container">
      <Header />

      {/* ===================================================================== */}
      {/* 1. HERO SECTION */}
      {/* ===================================================================== */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} color="#00ff88" style={{ marginRight: '6px' }} /> Smart 3D Indoor Wayfinding System
        </div>

        <h1 className="hero-title">
          Navigate the Hospital with <span className="hero-highlight">Precision & Ease</span>
        </h1>

        <p className="hero-subtitle">
          Scan QR codes at hospital entrances or kiosks to immediately load turn-by-turn 3D vector paths directly to your doctor, clinic, or emergency ward.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={() => setShowScannerModal(true)}>
            Scan Location QR
          </button>

          <Link to="/map" className="btn-secondary">
            Open 3D Map
          </Link>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. HOW IT WORKS (SIMPLE USER MANUAL) */}
      {/* ===================================================================== */}
      <section className="section-container">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Follow three simple steps to reach any department within seconds.
          </p>
        </div>

        <div className="steps-grid">
          {/* Step 1 */}
          <div className="step-card">
            <div className="step-number step-number-1">1</div>
            <h3 className="step-title">Scan or Select Starting Point</h3>
            <p className="step-desc">
              Scan the QR code placed on room doors or entrance walls, or manually select your current entrance on the map.
            </p>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-number step-number-2">2</div>
            <h3 className="step-title">Choose Your Destination</h3>
            <p className="step-desc">
              Select any department (ICU, Pharmacy, Lab, Doctor Clinic, Radiology) from our directory or the dropdown selector.
            </p>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-number step-number-3">3</div>
            <h3 className="step-title">Follow the 3D Glowing Route</h3>
            <p className="step-desc">
              Our Dijkstra shortest-path engine generates an animated 3D route guiding you step-by-step through corridors to your destination.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. QUICK NAVIGATION SHORTCUTS */}
      {/* ===================================================================== */}
      <section className="shortcuts-section">
        <div className="shortcuts-container">
          <div className="shortcuts-top-bar">
            <div>
              <h2 className="section-title" style={{ fontSize: '1.6rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={24} color="#00ff88" /> Quick Department Finder
              </h2>
              <p className="section-subtitle" style={{ textAlign: 'left' }}>
                Jump straight into navigation for frequently visited areas
              </p>
            </div>
            <Link to="/map" className="shortcuts-link">
              View All on Map →
            </Link>
          </div>

          <div className="shortcuts-grid">
            {popularDestinations.map((dept) => (
              <button
                key={dept}
                className="dept-card"
                onClick={() => navigate(`/map?destination=${encodeURIComponent(dept)}`)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="#ff4d4f" /> {dept}
                </span>
                <span className="dept-arrow">➔</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. ABOUT OUR SERVICE & KEY FEATURES */}
      {/* ===================================================================== */}
      <section className="section-container">
        <div className="section-header">
          <h2 className="section-title">Built for Fast, Reliable Hospital Guidance</h2>
          <p className="section-subtitle">
            Engineered to eliminate patient stress and confusion in complex medical facilities.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Compass size={24} color="#00ff88" />
            </div>
            <h3 className="feature-title">Dijkstra Algorithm Precision</h3>
            <p className="feature-desc">
              Calculates mathematically optimal, obstacle-free paths across corridor junctions and hall intersections in milliseconds.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Siren size={24} color="#ff4757" />
            </div>
            <h3 className="feature-title">Instant Emergency Routing</h3>
            <p className="feature-desc">
              Quick one-tap routing for rapid emergency response to Casualty, Trauma units, ICU, and Blood Banks.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Building2 size={24} color="#4285F4" />
            </div>
            <h3 className="feature-title">True 2.5D Architectural Model</h3>
            <p className="feature-desc">
              Extruded walls and spatial depth rendered via WebGL and Three.js offer intuitive visual orientation compared to flat blueprints.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Smartphone size={24} color="#00ff88" />
            </div>
            <h3 className="feature-title">Zero Installation Required</h3>
            <p className="feature-desc">
              Runs seamlessly in standard mobile browsers. Patients don't need to download bulky native apps or share location permissions.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Accessibility size={24} color="#00d2d3" />
            </div>
            <h3 className="feature-title">Accessible & Step-Free</h3>
            <p className="feature-desc">
              Includes designated lift junctions, wide corridors, and wheelchair-accessible paths across the medical facility.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <ShieldCheck size={24} color="#00ff88" />
            </div>
            <h3 className="feature-title">100% Private & On-Premise</h3>
            <p className="feature-desc">
              No GPS tracking, personal data collection, or patient history logs. Navigation computations happen securely and privately.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. SCANNER MODAL */}
      {/* ===================================================================== */}
      <QRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
        availableNodes={nodes}
      />

      {/* ===================================================================== */}
      {/* 6. FOOTER */}
      {/* ===================================================================== */}
      <footer className="footer">
        <div className="footer-content">
          <div>
            <span style={{ fontWeight: '700', color: '#ffffff' }}>
              Medi<span style={{ color: '#00ff88' }}>Nav</span>
            </span> — Smart Hospital Indoor Navigation System
          </div>
          <div className="footer-links">
            <Link to="/map" className="footer-link">3D Floor Map</Link>
            <span style={{ color: '#333' }}>|</span>
            <span className="footer-helpline">Emergency Helpline: 108</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
