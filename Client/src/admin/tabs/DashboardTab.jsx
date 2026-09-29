import React from 'react';
import {
  Layers,
  MapPin,
  Compass,
  Users,
  Activity,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

export default function DashboardTab({
  nodes = [],
  adminsList = [],
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
          <h1 className="pane-title">Admin Dashboard</h1>
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
