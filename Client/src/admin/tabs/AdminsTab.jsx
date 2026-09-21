import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  RefreshCw,
  Search,
  X,
  Shield,
  Filter,
  Clock,
  Edit2,
  Trash2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  User,
} from 'lucide-react';
import api from '../../utils/axios';

// Vibrant color palette for random admin avatars
const AVATAR_COLORS = [
  '#00ff88', '#00d2d3', '#4285F4', '#a855f7',
  '#ff4757', '#ffa502', '#2ed573', '#1e90ff',
  '#ff6b81', '#70a1ff', '#e056fd', '#686de0'
];

const getRandomAvatarColor = () => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
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
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(val);
  }
};

export default function AdminsTab({
  adminsList = [],
  setAdminsList,
  isAdminsLoading,
  onRefresh,
  currentAdminUser,
  isSuperAdmin,
  showToast,
  showAddAdminModal,
  setShowAddAdminModal,
}) {
  // Search & Filter state
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');

  // Edit Modal State
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [formRole, setFormRole] = useState('Spatial Editor');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Open Add Admin Modal
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

  // Open Edit Admin Modal
  const openEditModal = (admin) => {
    if (!isSuperAdmin && currentAdminUser?.username !== admin.username) {
      showToast('Only Super Admin can edit other administrator accounts.', 'error');
      return;
    }
    setEditingAdmin(admin);
    setFormUsername(admin.username || '');
    setFormEmail(admin.email || '');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowModalPassword(false);
    setFormRole(admin.role || 'Spatial Editor');
    setFormError('');
    setShowEditAdminModal(true);
  };

  // Handle Create Admin Submit
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

  // Handle Update Admin Submit (Status is strictly not changed here)
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

  // Handle Delete Admin Submit
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

  return (
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
            onClick={onRefresh}
            title="Reload from MongoDB"
            disabled={isAdminsLoading}
          >
            <RefreshCw size={16} className={isAdminsLoading ? 'spin-animation' : ''} />
          </button>
          <button
            className="action-btn-primary"
            onClick={openAddModal}
            title={isSuperAdmin ? 'Add New Administrator' : 'Only Super Admin can add administrators'}
            disabled={!isSuperAdmin}
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
                        className={`status-pill-badge ${
                          admin.status === 'Active' ? 'status-active' : 'status-inactive'
                        }`}
                        title={
                          admin.status === 'Active'
                            ? 'Account currently active (Logged in)'
                            : 'Account inactive (Logged out)'
                        }
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

      {/* ============================================================= */}
      {/* MODAL: ADD ADMIN */}
      {/* ============================================================= */}
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
                <span>
                  Account status will start as <strong>Inactive</strong> and turn <strong>Active</strong> automatically upon sign-in. Avatar color is assigned randomly.
                </span>
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
                  disabled={
                    formSubmitting ||
                    !formUsername ||
                    !formEmail ||
                    !formPassword ||
                    !formConfirmPassword
                  }
                >
                  {formSubmitting ? <span>Saving...</span> : <span>Create Administrator</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: EDIT ADMIN */}
      {/* ============================================================= */}
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
    </div>
  );
}
