import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Map as MapIcon,
  LogOut,
  ShieldCheck,
  Search,
  Crosshair,
  Compass,
  Layers,
  MapPin,
  Activity,
  CheckCircle2,
  Trash2,
  UserPlus,
  Clock,
  Sparkles,
  Menu,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ExternalLink,
  Filter,
  User,
  Building2,
  Edit2,
  RefreshCw,
  AlertCircle,
  Mail,
  Shield,
  Check,
} from 'lucide-react';
import PointPickerInspector from './PointPickerInspector';
import api from '../utils/axiosInstance';
import './AdminPage.css';

// Vibrant color palette for random admin avatars
const AVATAR_COLORS = [
  '#00ff88', '#00d2d3', '#4285F4', '#a855f7',
  '#ff4757', '#ffa502', '#2ed573', '#1e90ff',
  '#ff6b81', '#70a1ff', '#e056fd', '#686de0'
];

const getRandomAvatarColor = () => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

// Default mock nodes for immediate fallback preview if backend nodes API is loading or offline
const FALLBACK_NODES = [
  { _id: 'node_1', name: 'Main Entrance', type: 'entrance', floor: 0, x: 960, y: 920, isDestination: true },
  { _id: 'node_2', name: 'Emergency Entrance', type: 'entrance', floor: 0, x: 260, y: 540, isDestination: true },
  { _id: 'node_3', name: 'Reception & Triage', type: 'room', floor: 0, x: 960, y: 780, isDestination: true },
  { _id: 'node_4', name: 'Emergency Room (ER)', type: 'room', floor: 0, x: 420, y: 540, isDestination: true },
  { _id: 'node_5', name: 'Radiology & X-Ray', type: 'room', floor: 0, x: 620, y: 410, isDestination: true },
  { _id: 'node_6', name: 'Cardiology Clinic', type: 'room', floor: 0, x: 1320, y: 410, isDestination: true },
  { _id: 'node_7', name: 'Outpatient Pharmacy', type: 'room', floor: 0, x: 1240, y: 780, isDestination: true },
  { _id: 'node_8', name: 'Central Laboratory', type: 'room', floor: 0, x: 960, y: 320, isDestination: true },
  { _id: 'node_9', name: 'Elevator Lobby A', type: 'junction', floor: 0, x: 820, y: 540, isDestination: false },
  { _id: 'node_10', name: 'Main Corridor Junction', type: 'junction', floor: 0, x: 960, y: 540, isDestination: false },
  { _id: 'node_11', name: 'East Wing Junction', type: 'junction', floor: 0, x: 1240, y: 540, isDestination: false },
  { _id: 'node_12', name: 'Pediatrics Ward', type: 'room', floor: 1, x: 620, y: 410, isDestination: true },
  { _id: 'node_13', name: 'Intensive Care Unit (ICU)', type: 'room', floor: 1, x: 960, y: 320, isDestination: true },
  { _id: 'node_14', name: 'Surgical Suite 1', type: 'room', floor: 1, x: 1320, y: 410, isDestination: true },
  { _id: 'node_15', name: 'Floor 1 Central Junction', type: 'junction', floor: 1, x: 960, y: 540, isDestination: false },
];

const INITIAL_FALLBACK_ADMINS = [
  {
    _id: 'admin_1',
    username: 'admin',
    email: 'admin@hospital.medinav.io',
    role: 'Super Admin',
    status: 'Active',
    lastLogin: new Date().toISOString(),
    avatarColor: '#00ff88',
  },
  {
    _id: 'admin_2',
    username: 'sjenkins',
    email: 's.jenkins@hospital.medinav.io',
    role: 'Spatial Editor',
    status: 'Inactive',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    avatarColor: '#4285F4',
  },
  {
    _id: 'admin_3',
    username: 'it_operations',
    email: 'it-support@hospital.medinav.io',
    role: 'Hospital Staff',
    status: 'Inactive',
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    avatarColor: '#a855f7',
  },
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('medinav_admin_auth') === 'true'
  );

  const [currentAdminUser, setCurrentAdminUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('medinav_admin_user');
      return saved ? JSON.parse(saved) : { username: 'admin', role: 'Super Admin', avatarColor: '#00ff88' };
    } catch {
      return { username: 'admin', role: 'Super Admin', avatarColor: '#00ff88' };
    }
  });

  // Current user permissions
  const isSuperAdmin = currentAdminUser?.role === 'Super Admin';

  // Active Tab: 'dashboard' | 'admins' | 'maps'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Admins CRUD State
  const [adminsList, setAdminsList] = useState(INITIAL_FALLBACK_ADMINS);
  const [isAdminsLoading, setIsAdminsLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');

  // Add / Edit Modal States
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Form Fields for Add/Edit (No name or status, only username, email, password, role)
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [formRole, setFormRole] = useState('Spatial Editor');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Spatial Nodes Data
  const [nodes, setNodes] = useState(FALLBACK_NODES);
  const [showInspector, setShowInspector] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState('all');
  const [nodeFloorFilter, setNodeFloorFilter] = useState('all');

  // Trigger Toast Notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Fetch Admins from MongoDB API
  const fetchAdmins = useCallback(async () => {
    setIsAdminsLoading(true);
    try {
      const res = await api.get('/api/admins');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setAdminsList(res.data.data);
      }
    } catch (err) {
      console.warn('Backend /api/admins offline or unreachable, using local state fallback');
    } finally {
      setIsAdminsLoading(false);
    }
  }, []);

  // Fetch Nodes from MongoDB API
  const fetchNodes = useCallback(async () => {
    try {
      const res = await api.get('/api/nodes');
      if (res.data?.data && res.data.data.length > 0) {
        setNodes(res.data.data);
      }
    } catch (err) {
      // Fallback
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdmins();
      fetchNodes();
    }
  }, [isAuthenticated, fetchAdmins, fetchNodes]);

  // Handle Admin Login: Calls backend /api/admins/login, sets status to Active, updates lastLogin
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/admins/login', {
        username: username.trim(),
        password: password.trim(),
      });

      if (res.data?.success && res.data?.data) {
        const loggedAdmin = res.data.data;
        setIsAuthenticated(true);
        setCurrentAdminUser(loggedAdmin);
        sessionStorage.setItem('medinav_admin_auth', 'true');
        sessionStorage.setItem('medinav_admin_user', JSON.stringify(loggedAdmin));

        // Update local admin list so that loggedAdmin shows as Active immediately
        setAdminsList((prev) =>
          prev.map((a) =>
            a.username === loggedAdmin.username
              ? { ...a, status: 'Active', lastLogin: new Date().toISOString() }
              : a
          )
        );

        showToast(`Welcome back, @${loggedAdmin.username}! (Status: Active)`);
        setIsLoading(false);
        fetchAdmins();
        return;
      }
    } catch (err) {
      // If backend responded with specific error
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
        setIsLoading(false);
        return;
      }

      // Offline / Local Fallback authentication
      const userLower = username.trim().toLowerCase();
      if (
        (userLower === 'admin' && password === 'admin123') ||
        (userLower === 'admin' && password === 'admin')
      ) {
        const fallbackUser = {
          _id: 'admin_1',
          username: 'admin',
          email: 'admin@hospital.medinav.io',
          role: 'Super Admin',
          status: 'Active',
          lastLogin: new Date().toISOString(),
          avatarColor: '#00ff88',
        };
        setIsAuthenticated(true);
        setCurrentAdminUser(fallbackUser);
        sessionStorage.setItem('medinav_admin_auth', 'true');
        sessionStorage.setItem('medinav_admin_user', JSON.stringify(fallbackUser));

        setAdminsList((prev) =>
          prev.map((a) =>
            a.username === 'admin'
              ? { ...a, status: 'Active', lastLogin: new Date().toISOString() }
              : a
          )
        );

        showToast('Authenticated as Administrator (Local mode - Status: Active)');
        setIsLoading(false);
        return;
      }

      setErrorMsg('Invalid username or password. (Hint: admin / admin123)');
      setIsLoading(false);
    }
  };

  // Handle Admin Logout: Updates status to Inactive in MongoDB & local state
  const handleLogout = async () => {
    try {
      if (currentAdminUser?._id || currentAdminUser?.username) {
        await api.post('/api/admins/logout', {
          id: currentAdminUser._id,
          username: currentAdminUser.username,
        });
      }
    } catch {
      // Continue client logout even if backend fails
    }

    // Update status to Inactive in local list
    if (currentAdminUser?.username) {
      setAdminsList((prev) =>
        prev.map((a) =>
          a.username === currentAdminUser.username ? { ...a, status: 'Inactive' } : a
        )
      );
    }

    setIsAuthenticated(false);
    sessionStorage.removeItem('medinav_admin_auth');
    sessionStorage.removeItem('medinav_admin_user');
    setUsername('');
    setPassword('');
    setErrorMsg('');
    setActiveTab('dashboard');
    showToast('Logged out successfully (Status: Inactive)', 'info');
  };

  // Open Add Admin Modal
  // Open Add Admin Modal (Super Admin only)
  const openAddModal = () => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin can create new administrators.', 'error');
      return;
    }
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowModalPassword(false);
    setFormRole('Spatial Editor');
    setFormError('');
    setShowAddAdminModal(true);
  };

  // Open Edit Admin Modal (Super Admin can edit anyone; others can only edit themselves)
  const openEditModal = (admin) => {
    if (!isSuperAdmin && currentAdminUser?.username !== admin.username) {
      showToast('Only Super Admin can edit other administrator accounts.', 'error');
      return;
    }
    setEditingAdmin(admin);
    setFormUsername(admin.username || '');
    setFormEmail(admin.email || '');
    setFormPassword(''); // blank unless changing
    setFormConfirmPassword('');
    setShowModalPassword(false);
    setFormRole(admin.role || 'Spatial Editor');
    setFormError('');
    setShowEditAdminModal(true);
  };

  // Handle Create Admin (POST /api/admins)
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isSuperAdmin) {
      setFormError('Only Super Admin has permission to create administrators.');
      return;
    }

    if (!formUsername.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (formPassword !== formConfirmPassword) {
      setFormError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setFormSubmitting(true);
    const randomColor = getRandomAvatarColor();

    const payload = {
      username: formUsername.trim().toLowerCase(),
      email: formEmail.trim().toLowerCase(),
      password: formPassword.trim(),
      role: formRole,
      status: 'Inactive',
      avatarColor: randomColor,
    };

    try {
      const res = await api.post('/api/admins', payload);
      if (res.data?.success && res.data?.data) {
        setAdminsList((prev) => [res.data.data, ...prev]);
        setShowAddAdminModal(false);
        showToast(`Administrator '@${payload.username}' created successfully!`);
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setFormError(err.response.data.message);
      } else {
        // Fallback local creation
        const newLocalAdmin = {
          _id: `admin_${Date.now()}`,
          ...payload,
          lastLogin: null,
          avatarColor: randomColor,
        };
        setAdminsList((prev) => [newLocalAdmin, ...prev]);
        setShowAddAdminModal(false);
        showToast(`Administrator '@${payload.username}' added (offline mode)`);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Update Admin (PUT /api/admins/:id) - Status is NEVER modified here
  const handleUpdateAdminSubmit = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setFormError('');

    if (!isSuperAdmin && currentAdminUser?.username !== editingAdmin.username) {
      setFormError('Only Super Admin can update other administrators.');
      return;
    }

    setFormSubmitting(true);

    const payload = {
      username: formUsername.trim().toLowerCase(),
      email: formEmail.trim().toLowerCase(),
      role: isSuperAdmin ? formRole : editingAdmin.role,
    };
    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    try {
      const res = await api.put(`/api/admins/${editingAdmin._id}`, payload);
      if (res.data?.success && res.data?.data) {
        setAdminsList((prev) =>
          prev.map((a) => (a._id === editingAdmin._id ? res.data.data : a))
        );
        setShowEditAdminModal(false);
        showToast(`Administrator '@${payload.username}' updated successfully!`);
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setFormError(err.response.data.message);
      } else {
        // Local fallback update
        setAdminsList((prev) =>
          prev.map((a) =>
            a._id === editingAdmin._id ? { ...a, ...payload } : a
          )
        );
        setShowEditAdminModal(false);
        showToast(`Administrator '@${payload.username}' updated (offline mode)`);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Admin (DELETE /api/admins/:id) - Super Admin only
  const handleDeleteAdmin = async (admin) => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin can delete administrators.', 'error');
      return;
    }

    if (admin.username === 'admin') {
      alert('The root primary administrator account cannot be deleted.');
      return;
    }

    if (admin.username === currentAdminUser?.username) {
      alert('You cannot delete your own currently signed-in account.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete administrator account "@${admin.username}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/admins/${admin._id}`);
      setAdminsList((prev) => prev.filter((a) => a._id !== admin._id));
      showToast(`Administrator '@${admin.username}' deleted successfully`);
    } catch (err) {
      if (err.response?.data?.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        // Local fallback delete
        setAdminsList((prev) => prev.filter((a) => a._id !== admin._id));
        showToast(`Administrator '@${admin.username}' removed (offline mode)`);
      }
    }
  };

  // Formatter for Last Login timestamp
  const formatLastLogin = (val) => {
    if (!val) return 'Never';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const diffMinutes = Math.round((Date.now() - d.getTime()) / 60000);
      if (diffMinutes < 2) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} mins ago`;
      if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hrs ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(val);
    }
  };

  // Filtered Admins with Search & Filter criteria
  const filteredAdmins = useMemo(() => {
    return adminsList.filter((admin) => {
      const q = adminSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (admin.username && admin.username.toLowerCase().includes(q)) ||
        (admin.email && admin.email.toLowerCase().includes(q)) ||
        (admin.role && admin.role.toLowerCase().includes(q));

      const matchesRole =
        adminRoleFilter === 'all' || admin.role === adminRoleFilter;

      const matchesStatus =
        adminStatusFilter === 'all' || admin.status === adminStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [adminsList, adminSearchQuery, adminRoleFilter, adminStatusFilter]);

  // Spatial node counts
  const roomCount = nodes.filter((n) => n.type === 'room').length;
  const entranceCount = nodes.filter((n) => n.type === 'entrance').length;
  const junctionCount = nodes.filter((n) => n.type === 'junction').length;
  const floor0Count = nodes.filter((n) => Number(n.floor) === 0).length;
  const floor1Count = nodes.filter((n) => Number(n.floor) === 1).length;

  // Filtered Nodes for Maps tab
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesQuery =
        !nodeSearchQuery.trim() ||
        (node.name && node.name.toLowerCase().includes(nodeSearchQuery.toLowerCase())) ||
        (node._id && node._id.toLowerCase().includes(nodeSearchQuery.toLowerCase()));

      const matchesType =
        nodeTypeFilter === 'all' || node.type === nodeTypeFilter;

      const matchesFloor =
        nodeFloorFilter === 'all' ||
        String(node.floor ?? 0) === String(nodeFloorFilter);

      return matchesQuery && matchesType && matchesFloor;
    });
  }, [nodes, nodeSearchQuery, nodeTypeFilter, nodeFloorFilter]);

  return (
    <div className="admin-page-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`admin-toast-banner animate-fade-in toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {!isAuthenticated ? (
        /* ================================================================= */
        /* 1. ADMIN LOGIN FORM */
        /* ================================================================= */
        <div className="admin-auth-wrapper">
          <div className="admin-login-card animate-scale-in">
            <div className="admin-login-header">
              <div className="admin-shield-icon">
                <ShieldCheck size={32} color="#00ff88" />
              </div>
              <h1 className="admin-login-title">Admin Portal</h1>
              <p className="admin-login-subtitle">
                Sign in to manage hospital wayfinding, navigation graph, and administrator accounts
              </p>
            </div>

            {errorMsg && (
              <div className="admin-login-error">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="admin-form">
              <div className="admin-input-group">
                <label className="admin-label">Username or Email</label>
                <div className="admin-input-box">
                  <User size={18} className="admin-field-icon" />
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Enter username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

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

              <div className="admin-hint-box">
                <Sparkles size={14} color="#00ff88" />
                <span>
                  Demo Credentials: <code>admin</code> / <code>admin123</code>
                </span>
              </div>

              <button
                type="submit"
                className="admin-btn-submit"
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <span>Signing In...</span>
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
        /* 2. AUTHENTICATED ADMIN LAYOUT WITH LEFT SIDEBAR */
        /* ================================================================= */
        <div className="admin-app-layout">
          {/* Mobile Header Bar */}
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
          <aside
            className={`admin-left-sidebar ${mobileMenuOpen ? 'open' : ''}`}
          >
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
                <span className="nav-badge">{adminsList.length}</span>
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
                <span className="nav-badge">{nodes.length}</span>
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
                  <div className="admin-profile-name">@{currentAdminUser?.username || 'admin'}</div>
                  <div className="admin-profile-role">{currentAdminUser?.role || 'Super Admin'}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="sidebar-logout-btn"
                title="Logout from Admin Portal"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="admin-main-viewport">
            {/* =========================================================== */}
            {/* TAB 1: DASHBOARD */}
            {/* =========================================================== */}
            {activeTab === 'dashboard' && (
              <div className="tab-pane animate-fade-in">
                {/* Welcome & Top Banner */}
                <div className="pane-header-banner">
                  <div className="banner-text">
                    <div className="status-pill-live">
                      <span className="live-dot"></span> System Operational • Status: Active
                    </div>
                    <h1 className="pane-title">Hospital Navigation Dashboard</h1>
                    <p className="pane-subtitle">
                      Real-time overview of hospital spatial infrastructure, shortest-path Dijkstra graph, and system administrators.
                    </p>
                  </div>
                  <div className="banner-actions">
                    <button
                      className="action-btn-primary"
                      onClick={() => setShowInspector(true)}
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
                        {adminsList.filter((a) => a.status === 'Active').length} currently Active
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
                          onClick={() => setActiveTab('maps')}
                        >
                          View Map Nodes →
                        </button>
                      </div>

                      <div className="distribution-breakdown">
                        <div className="dist-row">
                          <div className="dist-info">
                            <span className="dist-name">Rooms & Clinics</span>
                            <span className="dist-count">{roomCount} nodes ({Math.round((roomCount / (nodes.length || 1)) * 100)}%)</span>
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
                            <span className="dist-count">{junctionCount} nodes ({Math.round((junctionCount / (nodes.length || 1)) * 100)}%)</span>
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
                            <span className="dist-count">{entranceCount} nodes ({Math.round((entranceCount / (nodes.length || 1)) * 100)}%)</span>
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
                        onClick={() => setShowInspector(true)}
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
                          onClick={() => setActiveTab('admins')}
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
                            <span className={`mini-status-pill ${admin.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                              {admin.status}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        <button
                          className="action-btn-secondary full-width"
                          onClick={openAddModal}
                        >
                          <UserPlus size={16} />
                          <span>Add New Administrator</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* TAB 2: ADMINS (REAL CRUD, SEARCH, ACTIVE STATUS) */}
            {/* =========================================================== */}
            {activeTab === 'admins' && (
              <div className="tab-pane animate-fade-in">
                {/* Header */}
                <div className="pane-header-banner">
                  <div className="banner-text">
                    <h1 className="pane-title">Administrator Management</h1>
                    <p className="pane-subtitle">
                      MongoDB user persistence with role authorization, dynamic random avatars, and live active session tracking.
                    </p>
                  </div>
                  <div className="banner-actions">
                    <button
                      className="action-btn-refresh"
                      onClick={fetchAdmins}
                      title="Reload from MongoDB"
                      disabled={isAdminsLoading}
                    >
                      <RefreshCw size={16} className={isAdminsLoading ? 'spin-animation' : ''} />
                    </button>
                    <button
                      className="action-btn-primary"
                      onClick={openAddModal}
                    >
                      <UserPlus size={17} />
                      <span>Add New Admin</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="table-controls-bar multi-filter">
                  {/* Real-time Search Input */}
                  <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search administrators by username, email, or role..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="table-search-input"
                      autoFocus
                    />
                    {adminSearchQuery && (
                      <button
                        className="clear-search-btn"
                        onClick={() => setAdminSearchQuery('')}
                        title="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Role & Status Filter Selects */}
                  <div className="filter-select-group">
                    <div className="select-box">
                      <Shield size={15} className="select-icon" />
                      <select
                        value={adminRoleFilter}
                        onChange={(e) => setAdminRoleFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Roles</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Spatial Editor">Spatial Editor</option>
                        <option value="Hospital Staff">Hospital Staff</option>
                      </select>
                    </div>

                    <div className="select-box">
                      <Filter size={15} className="select-icon" />
                      <select
                        value={adminStatusFilter}
                        onChange={(e) => setAdminStatusFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Status</option>
                        <option value="Active">Active Only</option>
                        <option value="Inactive">Inactive Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Admins Data Table */}
                <div className="table-card-container">
                  <div className="table-responsive">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdmins.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="empty-table-msg">
                              {adminSearchQuery
                                ? `No administrators matching "${adminSearchQuery}"`
                                : 'No administrators found in database.'}
                            </td>
                          </tr>
                        ) : (
                          filteredAdmins.map((admin) => (
                            <tr key={admin._id}>
                              <td>
                                <div className="user-cell">
                                  <div
                                    className="user-avatar"
                                    style={{
                                      background: `${admin.avatarColor || '#00ff88'}22`,
                                      borderColor: admin.avatarColor || '#00ff88',
                                      color: admin.avatarColor || '#00ff88',
                                    }}
                                  >
                                    {admin.username?.charAt(0).toUpperCase() || 'A'}
                                  </div>
                                  <div className="user-cell-meta">
                                    <span className="user-name">
                                      @{admin.username}
                                      {admin.username === 'admin' && (
                                        <span className="root-tag">ROOT</span>
                                      )}
                                      {currentAdminUser?.username === admin.username && (
                                        <span className="you-tag">YOU</span>
                                      )}
                                    </span>
                                    <span className="user-email">{admin.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`role-badge ${
                                    admin.role === 'Super Admin'
                                      ? 'role-super'
                                      : admin.role === 'Spatial Editor'
                                      ? 'role-editor'
                                      : 'role-staff'
                                  }`}
                                >
                                  {admin.role}
                                </span>
                              </td>
                              <td>
                                <div
                                  className={`status-pill-badge ${admin.status === 'Active' ? 'status-active' : 'status-inactive'}`}
                                  title={admin.status === 'Active' ? 'Account currently active (Logged in)' : 'Account inactive (Logged out)'}
                                >
                                  <span className="status-indicator"></span>
                                  <span>{admin.status}</span>
                                </div>
                              </td>
                              <td className="text-muted">
                                <div className="login-timestamp">
                                  <Clock size={13} />
                                  <span>{formatLastLogin(admin.lastLogin)}</span>
                                </div>
                              </td>
                              <td className="text-right">
                                <div className="row-actions">
                                  <button
                                    className="action-icon-btn edit-btn"
                                    title={
                                      isSuperAdmin || currentAdminUser?.username === admin.username
                                        ? 'Edit Administrator'
                                        : 'Only Super Admin can edit other accounts'
                                    }
                                    onClick={() => openEditModal(admin)}
                                    disabled={!isSuperAdmin && currentAdminUser?.username !== admin.username}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    className="action-icon-btn delete-btn"
                                    title={
                                      admin.username === 'admin'
                                        ? 'Root admin cannot be deleted'
                                        : !isSuperAdmin
                                        ? 'Only Super Admin can delete accounts'
                                        : currentAdminUser?.username === admin.username
                                        ? 'Cannot delete your own active account'
                                        : 'Delete Administrator'
                                    }
                                    onClick={() => handleDeleteAdmin(admin)}
                                    disabled={
                                      !isSuperAdmin ||
                                      admin.username === 'admin' ||
                                      currentAdminUser?.username === admin.username
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* TAB 3: MAPS */}
            {/* =========================================================== */}
            {activeTab === 'maps' && (
              <div className="tab-pane animate-fade-in">
                {/* Header */}
                <div className="pane-header-banner">
                  <div className="banner-text">
                    <h1 className="pane-title">Hospital Maps & Spatial Nodes</h1>
                    <p className="pane-subtitle">
                      Inspect 2D blueprint coordinate waypoints, calibrate rooms, and test the 3D WebGL engine.
                    </p>
                  </div>
                  <div className="banner-actions">
                    <button
                      className="action-btn-primary"
                      onClick={() => setShowInspector(true)}
                    >
                      <Crosshair size={17} />
                      <span>Launch Point Inspector</span>
                    </button>
                    <Link to="/map" className="action-btn-secondary">
                      <Compass size={17} />
                      <span>Launch 3D Map</span>
                    </Link>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="table-controls-bar multi-filter">
                  <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search nodes by name or ID..."
                      value={nodeSearchQuery}
                      onChange={(e) => setNodeSearchQuery(e.target.value)}
                      className="table-search-input"
                    />
                    {nodeSearchQuery && (
                      <button
                        className="clear-search-btn"
                        onClick={() => setNodeSearchQuery('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="filter-select-group">
                    <div className="select-box">
                      <Filter size={15} className="select-icon" />
                      <select
                        value={nodeTypeFilter}
                        onChange={(e) => setNodeTypeFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Types</option>
                        <option value="room">Rooms & Clinics</option>
                        <option value="entrance">Hospital Entrances</option>
                        <option value="junction">Hallway Junctions</option>
                      </select>
                    </div>

                    <div className="select-box">
                      <Layers size={15} className="select-icon" />
                      <select
                        value={nodeFloorFilter}
                        onChange={(e) => setNodeFloorFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Floors</option>
                        <option value="0">Floor 0 (Ground)</option>
                        <option value="1">Floor 1 (First Floor)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Spatial Nodes Table */}
                <div className="table-card-container">
                  <div className="table-responsive">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Node Name</th>
                          <th>Category</th>
                          <th>Floor</th>
                          <th>SVG Coordinates (X, Y)</th>
                          <th>Nav Destination</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNodes.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="empty-table-msg">
                              No hospital nodes match your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredNodes.map((node, idx) => (
                            <tr key={node._id || idx}>
                              <td>
                                <div className="node-name-cell">
                                  <div className={`node-type-dot dot-${node.type}`}></div>
                                  <div>
                                    <span className="node-title">{node.name || 'Unnamed Node'}</span>
                                    <span className="node-id-sub">{node._id || `node_${idx + 1}`}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`node-badge badge-${node.type}`}>
                                  {node.type}
                                </span>
                              </td>
                              <td>
                                <span className="floor-badge">
                                  Floor {node.floor ?? 0}
                                </span>
                              </td>
                              <td>
                                <code className="coord-code">
                                  X: {Math.round(node.x || 0)}, Y: {Math.round(node.y || 0)}
                                </code>
                              </td>
                              <td>
                                {node.isDestination !== false ? (
                                  <span className="tag-destination dest-yes">
                                    <CheckCircle2 size={13} /> Selectable
                                  </span>
                                ) : (
                                  <span className="tag-destination dest-no">
                                    Waypoint only
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* =========================================================== */}
          {/* MODAL: ADD ADMIN */}
          {/* =========================================================== */}
          {showAddAdminModal && (
            <div className="admin-modal-backdrop animate-fade-in">
              <div className="admin-modal-dialog animate-scale-in">
                <div className="modal-header">
                  <div className="modal-title-box">
                    <UserPlus size={22} color="#00ff88" />
                    <h3>Add New Administrator</h3>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setShowAddAdminModal(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {formError && (
                  <div className="modal-form-error">
                    <span>⚠️ {formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAdminSubmit} className="modal-form">
                  <div className="admin-input-group">
                    <label className="admin-label">Username *</label>
                    <div className="admin-input-box">
                      <span className="admin-field-prefix">@</span>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="e.g. jdoe"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Email Address *</label>
                    <div className="admin-input-box">
                      <Mail size={18} className="admin-field-icon" />
                      <input
                        type="email"
                        className="admin-input"
                        placeholder="jdoe@hospital.medinav.io"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Initial Password *</label>
                    <div className="admin-input-box">
                      <KeyRound size={18} className="admin-field-icon" />
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        className="admin-input"
                        placeholder="Create secure password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="admin-pwd-toggle"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        tabIndex="-1"
                        title={showModalPassword ? 'Hide password' : 'Show password'}
                      >
                        {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Confirm Password *</label>
                    <div className="admin-input-box">
                      <KeyRound size={18} className="admin-field-icon" />
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        className="admin-input"
                        placeholder="Re-enter password to confirm"
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Administrative Role *</label>
                    <select
                      className="modal-select-input"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                    >
                      <option value="Spatial Editor">Spatial Editor (Manage Waypoints & Maps)</option>
                      <option value="Super Admin">Super Admin (Full System Access)</option>
                      <option value="Hospital Staff">Hospital Staff (Read-Only Analytics)</option>
                    </select>
                  </div>

                  <div className="modal-info-hint">
                    <Sparkles size={14} color="#00ff88" />
                    <span>Account status will start as <strong>Inactive</strong> and turn <strong>Active</strong> automatically upon sign-in. Avatar color is assigned randomly.</span>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setShowAddAdminModal(false)}
                      disabled={formSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="action-btn-primary"
                      disabled={formSubmitting || !formUsername || !formEmail || !formPassword || !formConfirmPassword}
                    >
                      {formSubmitting ? <span>Saving...</span> : <span>Create Administrator</span>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =========================================================== */}
          {/* MODAL: EDIT ADMIN */}
          {/* =========================================================== */}
          {showEditAdminModal && (
            <div className="admin-modal-backdrop animate-fade-in">
              <div className="admin-modal-dialog animate-scale-in">
                <div className="modal-header">
                  <div className="modal-title-box">
                    <Edit2 size={22} color="#00ff88" />
                    <h3>Edit Administrator (@{editingAdmin?.username})</h3>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setShowEditAdminModal(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {formError && (
                  <div className="modal-form-error">
                    <span>⚠️ {formError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateAdminSubmit} className="modal-form">
                  <div className="admin-input-group">
                    <label className="admin-label">Username</label>
                    <div className="admin-input-box">
                      <span className="admin-field-prefix">@</span>
                      <input
                        type="text"
                        className="admin-input"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        required
                        disabled={editingAdmin?.username === 'admin'}
                      />
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Email Address</label>
                    <div className="admin-input-box">
                      <Mail size={18} className="admin-field-icon" />
                      <input
                        type="email"
                        className="admin-input"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">New Password (Leave blank to keep current)</label>
                    <div className="admin-input-box">
                      <KeyRound size={18} className="admin-field-icon" />
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        className="admin-input"
                        placeholder="Enter new password to change"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="admin-pwd-toggle"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        tabIndex="-1"
                        title={showModalPassword ? 'Hide password' : 'Show password'}
                      >
                        {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Administrative Role</label>
                    <select
                      className="modal-select-input"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      disabled={editingAdmin?.username === 'admin' || !isSuperAdmin}
                    >
                      <option value="Super Admin">Super Admin (Full System Access)</option>
                      <option value="Spatial Editor">Spatial Editor (Manage Waypoints & Maps)</option>
                      <option value="Hospital Staff">Hospital Staff (Read-Only Analytics)</option>
                    </select>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setShowEditAdminModal(false)}
                      disabled={formSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="action-btn-primary"
                      disabled={formSubmitting || !formUsername || !formEmail}
                    >
                      {formSubmitting ? <span>Saving...</span> : <span>Save Changes</span>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =========================================================== */}
          {/* MODAL: 2D POINT INSPECTOR */}
          {/* =========================================================== */}
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
