import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header style={{
      padding: '0.75rem 2rem',
      background: 'linear-gradient(135deg, #0c0c1d 0%, #16162a 100%)',
      color: 'white',
      zIndex: 20,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      borderBottom: '1px solid rgba(0, 255, 136, 0.2)'
    }}>
      {/* Brand Logo & Name */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #00ff88 0%, #00b894 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', boxShadow: '0 2px 10px rgba(0, 255, 136, 0.4)'
        }}>
          🏥
        </div>
        <div>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px' }}>
            Medi<span style={{ color: '#00ff88' }}>Nav</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: '#a4b0be', display: 'block', marginTop: '-2px', letterSpacing: '0.3px' }}>
            SMART HOSPITAL GUIDE
          </span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link
          to="/"
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: location.pathname === '/' ? '#00ff88' : '#dcdde1',
            background: location.pathname === '/' ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
            border: location.pathname === '/' ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          🏠 Home
        </Link>

        <Link
          to="/map"
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '700',
            color: location.pathname === '/map' ? '#000000' : '#ffffff',
            background: location.pathname === '/map' ? '#00ff88' : '#1e272e',
            border: '1px solid #00ff8866',
            boxShadow: location.pathname === '/map' ? '0 2px 10px rgba(0, 255, 136, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          🗺️ 3D Map
        </Link>
      </nav>
    </header>
  );
}
