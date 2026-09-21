import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Map as MapIcon,
  Building2,
  Compass,
  ExternalLink,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  adminsCount,
  nodesCount,
  currentAdminUser,
  onLogout,
}) {
  return (
    <>
      {/* Mobile Topbar */}
      <div className="admin-mobile-topbar">
        <div className="admin-brand">
          <div className="brand-logo-badge">
            <ShieldCheck size={20} color="#00ff88" />
          </div>
          <span className="brand-title">MediNav Admin</span>
        </div>
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`admin-left-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebar-brand-section">
          <div className="brand-logo-badge">
            <ShieldCheck size={24} color="#00ff88" />
          </div>
          <div className="brand-details">
            <h2 className="brand-title">MediNav</h2>
            <span className="brand-tag">Hospital Control</span>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="sidebar-nav-menu">
          <button
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admins');
              setMobileMenuOpen(false);
            }}
          >
            <Users size={20} />
            <span>Admins</span>
            <span className="nav-badge">{adminsCount}</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'maps' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('maps');
              setMobileMenuOpen(false);
            }}
          >
            <MapIcon size={20} />
            <span>Maps</span>
            <span className="nav-badge">{nodesCount}</span>
          </button>
        </nav>

        {/* Quick Links Section */}
        <div className="sidebar-quick-section">
          <div className="sidebar-section-title">Hospital Navigation</div>
          <Link to="/" className="sidebar-link-btn" title="Go to Patient Home">
            <Building2 size={16} />
            <span>Patient Home</span>
          </Link>
          <Link to="/map" className="sidebar-link-btn" title="Open 3D Live Map">
            <Compass size={16} />
            <span>3D Live Map</span>
            <ExternalLink size={13} className="external-icon" />
          </Link>
        </div>

        {/* Sidebar Footer with Active Admin & Logout */}
        <div className="sidebar-footer">
          <div className="admin-user-profile">
            <div
              className="admin-avatar"
              style={{
                background: `${currentAdminUser?.avatarColor || '#00ff88'}22`,
                borderColor: currentAdminUser?.avatarColor || '#00ff88',
                color: currentAdminUser?.avatarColor || '#00ff88',
              }}
            >
              <User size={18} />
            </div>
            <div className="admin-profile-info">
              <div className="admin-profile-name">
                @{currentAdminUser?.username || 'admin'}
              </div>
              <div className="admin-profile-role">
                {currentAdminUser?.role || 'Super Admin'}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="sidebar-logout-btn"
            title="Logout from Admin Portal"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
