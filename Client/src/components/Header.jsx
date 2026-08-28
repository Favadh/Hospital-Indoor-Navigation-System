import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const location = useLocation();

  return (
    <header className="floating-header">
      {/* Brand Logo & Name */}
      <Link to="/" className="floating-brand-link">
        <div className="floating-brand-logo">🏥</div>
        <div className="floating-brand-name">
          Medi<span style={{ color: '#00ff88' }}>Nav</span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="floating-nav-links">
        <Link
          to="/"
          className={`floating-nav-item ${
            location.pathname === '/' ? 'active' : 'inactive'
          }`}
        >
          Home
        </Link>

        <Link
          to="/map"
          className={`floating-nav-item ${
            location.pathname === '/map' ? 'active' : 'inactive'
          }`}
        >
          3D Map
        </Link>
      </nav>
    </header>
  );
}
