import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  MapPin,
  Compass,
  Users,
  Activity,
  CheckCircle2,
  Crosshair,
  UserPlus,
} from 'lucide-react';

export default function DashboardTab({
  nodes = [],
  adminsList = [],
  onOpenInspector,
  onNavigateToAdmins,
  onNavigateToMaps,
  onOpenAddAdminModal,
  isSuperAdmin,
}) {
  const roomCount = nodes.filter((n) => n.type === 'room').length;
  const entranceCount = nodes.filter((n) => n.type === 'entrance').length;
  const junctionCount = nodes.filter((n) => n.type === 'junction').length;
  const floor0Count = nodes.filter((n) => Number(n.floor) === 0).length;
  const floor1Count = nodes.filter((n) => Number(n.floor) === 1).length;
  const activeAdminsCount = adminsList.filter((a) => a.status === 'Active').length;

  return (
    <div className="tab-pane animate-fade-in">
      {/* Welcome & Top Banner */}
      <div className="pane-header-banner">
        <div className="banner-text">
          <div className="status-pill-live">
            <span className="live-dot"></span> System Operational • Database Connected
          </div>
          <h1 className="pane-title">Hospital Navigation Dashboard</h1>
          <p className="pane-subtitle">
            Real-time overview of hospital spatial infrastructure, shortest-path Dijkstra graph, and system administrators.
          </p>
        </div>
        <div className="banner-actions">
          <button
            className="action-btn-primary"
            onClick={onOpenInspector}
          >
            <Crosshair size={17} />
            <span>Launch Point Inspector</span>
          </button>
          <Link to="/map" className="action-btn-secondary">
            <Compass size={17} />
            <span>Open 3D Map</span>
          </Link>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="admin-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box icon-emerald">
            <Layers size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{nodes.length}</div>
            <div className="metric-label">Total Spatial Nodes</div>
            <div className="metric-sub">{floor0Count} Ground • {floor1Count} 1st Floor</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box icon-rose">
            <MapPin size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{roomCount}</div>
            <div className="metric-label">Rooms & Clinics</div>
            <div className="metric-sub">Navigable destinations</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box icon-blue">
            <Compass size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{entranceCount}</div>
            <div className="metric-label">Hospital Entrances</div>
            <div className="metric-sub">QR Code Enabled</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box icon-purple">
            <Users size={22} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{adminsList.length}</div>
            <div className="metric-label">Registered Admins</div>
            <div className="metric-sub">
              {activeAdminsCount} currently Active
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Two-Column Content */}
      <div className="dash-columns-grid">
        {/* Left Column: Spatial Architecture & Quick Actions */}
        <div className="dash-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="card-header-title">
                <Activity size={18} color="#00ff88" />
                <h3>Spatial Node Distribution</h3>
              </div>
              <button
                className="text-btn"
                onClick={onNavigateToMaps}
              >
                View Map Nodes →
              </button>
            </div>

            <div className="distribution-breakdown">
              <div className="dist-row">
                <div className="dist-info">
                  <span className="dist-name">Rooms & Clinics</span>
                  <span className="dist-count">
                    {roomCount} nodes ({Math.round((roomCount / (nodes.length || 1)) * 100)}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-rose"
                    style={{ width: `${(roomCount / (nodes.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="dist-row">
                <div className="dist-info">
                  <span className="dist-name">Hallway Junctions</span>
                  <span className="dist-count">
                    {junctionCount} nodes ({Math.round((junctionCount / (nodes.length || 1)) * 100)}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-cyan"
                    style={{ width: `${(junctionCount / (nodes.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="dist-row">
                <div className="dist-info">
                  <span className="dist-name">Hospital Entrances</span>
                  <span className="dist-count">
                    {entranceCount} nodes ({Math.round((entranceCount / (nodes.length || 1)) * 100)}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-blue"
                    style={{ width: `${(entranceCount / (nodes.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* System Engine Health */}
            <div className="system-health-box">
              <div className="health-item">
                <CheckCircle2 size={16} color="#00ff88" />
                <span>Dijkstra Shortest Path Routing: <strong>Active</strong></span>
              </div>
              <div className="health-item">
                <CheckCircle2 size={16} color="#00ff88" />
                <span>PDR Pedometer & Sensor Engine: <strong>Calibrated</strong></span>
              </div>
              <div className="health-item">
                <CheckCircle2 size={16} color="#00ff88" />
                <span>MongoDB Admin User Store: <strong>Synchronized</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Tools Launch Card */}
          <div className="dash-card quick-tools-card">
            <div className="dash-card-header">
              <div className="card-header-title">
                <Crosshair size={18} color="#00ff88" />
                <h3>Coordinate Calibration Tool</h3>
              </div>
            </div>
            <p className="card-description">
              Click anywhere on the hospital 2D blueprint to inspect, pick, and copy exact SVG coordinates for room doors, beacons, and navigation waypoints.
            </p>
            <button
              className="action-btn-primary full-width"
              onClick={onOpenInspector}
            >
              <Crosshair size={18} />
              <span>Launch 2D Point & Click Inspector</span>
            </button>
          </div>
        </div>

        {/* Right Column: Admin Quick List */}
        <div className="dash-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="card-header-title">
                <Users size={18} color="#00ff88" />
                <h3>Administrator Accounts</h3>
              </div>
              <button
                className="text-btn"
                onClick={onNavigateToAdmins}
              >
                Manage All ({adminsList.length}) →
              </button>
            </div>

            <div className="mini-admin-list">
              {adminsList.slice(0, 4).map((admin) => (
                <div key={admin._id} className="mini-admin-row">
                  <div
                    className="mini-avatar"
                    style={{
                      background: `${admin.avatarColor || '#00ff88'}22`,
                      borderColor: admin.avatarColor || '#00ff88',
                      color: admin.avatarColor || '#00ff88',
                    }}
                  >
                    {admin.username?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="mini-admin-info">
                    <div className="mini-name">@{admin.username}</div>
                    <div className="mini-role">{admin.role} • {admin.email}</div>
                  </div>
                  <span
                    className={`mini-status-pill ${
                      admin.status === 'Active' ? 'status-active' : 'status-inactive'
                    }`}
                  >
                    {admin.status}
                  </span>
                </div>
              ))}
            </div>

            {isSuperAdmin && (
              <div style={{ marginTop: '16px' }}>
                <button
                  className="action-btn-secondary full-width"
                  onClick={onOpenAddAdminModal}
                >
                  <UserPlus size={16} />
                  <span>Add New Administrator</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
