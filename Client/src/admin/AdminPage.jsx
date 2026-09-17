import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Crosshair,
  MapPin,
  Compass,
  Layers,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import Header from '../components/Header';
import PointPickerInspector from './PointPickerInspector';
import api from '../utils/axiosInstance';
import './AdminPage.css';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('medinav_admin_auth') === 'true'
  );

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Admin Dashboard Data
  const [nodes, setNodes] = useState([]);
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      api
        .get('/api/nodes')
        .then((res) => {
          if (res.data?.data) {
            setNodes(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      // Standard local admin authentication (can be expanded with backend API)
      if (
        (username.trim().toLowerCase() === 'admin' && password === 'admin123') ||
        (username.trim().toLowerCase() === 'admin' && password === 'admin')
      ) {
        setIsAuthenticated(true);
        sessionStorage.setItem('medinav_admin_auth', 'true');
      } else {
        setErrorMsg('Invalid username or password. (Hint: admin / admin123)');
      }
      setIsLoading(false);
    }, 400);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('medinav_admin_auth');
    setUsername('');
    setPassword('');
    setErrorMsg('');
  };

  const roomCount = nodes.filter((n) => n.type === 'room').length;
  const entranceCount = nodes.filter((n) => n.type === 'entrance').length;
  const junctionCount = nodes.filter((n) => n.type === 'junction').length;

  return (
    <div className="admin-page-container">
      <Header />

      {!isAuthenticated ? (
        /* ================================================================= */
        /* 1. ADMIN LOGIN FORM */
        /* ================================================================= */
        <div className="admin-auth-wrapper">
          <div className="admin-login-card animate-scale-in">
            {/* Header Badge */}
            <div className="admin-login-header">
              <div className="admin-shield-icon">
                <ShieldCheck size={32} color="#00ff88" />
              </div>
              <h1 className="admin-login-title">Admin Portal</h1>
              <p className="admin-login-subtitle">
                Authenticate to access hospital wayfinding & coordinate tools
              </p>
            </div>

            {errorMsg && (
              <div className="admin-login-error">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="admin-form">
              {/* Username Input */}
              <div className="admin-input-group">
                <label className="admin-label">Username</label>
                <div className="admin-input-box">
                  <User size={18} className="admin-field-icon" />
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Enter admin username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="admin-input-group">
                <label className="admin-label">Password</label>
                <div className="admin-input-box">
                  <KeyRound size={18} className="admin-field-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="admin-input"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="admin-pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Demo Hint */}
              <div className="admin-hint-box">
                <Sparkles size={14} color="#00ff88" />
                <span>Demo Credentials: <code>admin</code> / <code>admin123</code></span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="admin-btn-submit"
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="admin-card-footer">
              <Link to="/" className="admin-back-link">
                ← Return to Home Page
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ================================================================= */
        /* 2. ADMIN DASHBOARD & COORDINATE TOOLS */
        /* ================================================================= */
        <div className="admin-dashboard-wrapper animate-fade-in">
          <div className="admin-dash-topbar">
            <div>
              <div className="admin-dash-badge">
                <CheckCircle2 size={15} color="#00ff88" /> Authenticated Administrator
              </div>
              <h1 className="admin-dash-title">Hospital Navigation Management</h1>
              <p className="admin-dash-subtitle">
                Configure spatial nodes, calibrate coordinates, and inspect 2D/3D map graph
              </p>
            </div>

            <button onClick={handleLogout} className="admin-btn-logout">
              <LogOut size={16} /> Logout
            </button>
          </div>

          {/* Metric Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap icon-nodes">
                <Layers size={22} color="#00ff88" />
              </div>
              <div className="admin-stat-data">
                <div className="admin-stat-num">{nodes.length || 24}</div>
                <div className="admin-stat-label">Total Map Nodes</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap icon-rooms">
                <MapPin size={22} color="#ff4757" />
              </div>
              <div className="admin-stat-data">
                <div className="admin-stat-num">{roomCount || 15}</div>
                <div className="admin-stat-label">Rooms / Departments</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap icon-entrances">
                <Compass size={22} color="#4285F4" />
              </div>
              <div className="admin-stat-data">
                <div className="admin-stat-num">{entranceCount || 4}</div>
                <div className="admin-stat-label">Hospital Entrances</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap icon-junctions">
                <Crosshair size={22} color="#00d2d3" />
              </div>
              <div className="admin-stat-data">
                <div className="admin-stat-num">{junctionCount || 5}</div>
                <div className="admin-stat-label">Hallway Junctions</div>
              </div>
            </div>
          </div>

          {/* Admin Action Cards */}
          <div className="admin-tools-grid">
            {/* Tool 1: Interactive Point & Click Coordinate Inspector */}
            <div className="admin-tool-card highlight-card">
              <div className="admin-tool-content">
                <div className="admin-tool-header">
                  <div className="admin-tool-icon">
                    <Crosshair size={24} color="#00ff88" />
                  </div>
                  <h3>Point & Click Coordinate Inspector</h3>
                </div>
                <p>
                  Click anywhere on the hospital SVG blueprint to visually inspect and copy exact
                  SVG (X, Y) coordinates in real-time. Useful for placing new rooms and doors.
                </p>
                <button
                  className="admin-btn-action"
                  onClick={() => setShowInspector(true)}
                >
                  <Crosshair size={18} /> Launch 2D Point Inspector
                </button>
              </div>
            </div>

            {/* Tool 2: Launch 3D Live Map */}
            <div className="admin-tool-card">
              <div className="admin-tool-content">
                <div className="admin-tool-header">
                  <div className="admin-tool-icon">
                    <Compass size={24} color="#4285F4" />
                  </div>
                  <h3>Live 3D Map View & Test</h3>
                </div>
                <p>
                  Test turn-by-turn routing, PDR pedometer strides, compass tracking, and track-up follow
                  camera in the full 3D WebGL scene.
                </p>
                <Link to="/map" className="admin-btn-action-secondary">
                  <Compass size={18} /> Open 3D Map View
                </Link>
              </div>
            </div>
          </div>

          {/* Point Picker Inspector Modal */}
          {showInspector && (
            <PointPickerInspector
              onClose={() => setShowInspector(false)}
              nodes={nodes}
              edges={[]}
            />
          )}
        </div>
      )}
    </div>
  );
}
