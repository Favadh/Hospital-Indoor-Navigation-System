import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';
import AdminSidebar from './components/AdminSidebar';
import DashboardTab from './tabs/DashboardTab';
import AdminsTab from './tabs/AdminsTab';
import MapsTab from './tabs/MapsTab';
import PointPickerInspector from './PointPickerInspector';
import api from '../utils/axios';
import './AdminPage.css';

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
  const navigate = useNavigate();

  const [currentAdminUser, setCurrentAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('medinav_admin_user');
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

  // Admins CRUD Data State
  const [adminsList, setAdminsList] = useState(INITIAL_FALLBACK_ADMINS);
  const [isAdminsLoading, setIsAdminsLoading] = useState(false);

  // Add Admin Modal trigger (can be invoked from Dashboard or Admins tab)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);

  // Spatial Nodes Data
  const [nodes, setNodes] = useState(FALLBACK_NODES);
  const [showInspector, setShowInspector] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // On mount: Guard route & verify JWT token against /api/admins/profile
  useEffect(() => {
    const fetchAdminProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin', { replace: true });
        return;
      }

      try {
        const res = await api.get('/api/admins/profile');
        if (res.data?.success && res.data?.data) {
          const profile = res.data.data;
          setCurrentAdminUser(profile);
          localStorage.setItem('medinav_admin_user', JSON.stringify(profile));
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('medinav_admin_user');
        navigate('/admin', { replace: true });
      }
    };

    fetchAdminProfile();
  }, [navigate]);

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
    fetchAdmins();
    fetchNodes();
  }, [fetchAdmins, fetchNodes]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (currentAdminUser?._id || currentAdminUser?.username) {
        await api.post('/api/admins/logout', {
          id: currentAdminUser._id,
          username: currentAdminUser.username,
        });
      }
    } catch {
      // Continue client logout
    }

    localStorage.removeItem('token');
    localStorage.removeItem('medinav_admin_user');
    navigate('/admin');
  };

  return (
    <div className="admin-page-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`admin-toast-banner toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* MODULAR ADMIN LAYOUT WITH SIDEBAR & TAB VIEWS */}
      <div className="admin-app-layout">
        {/* Left Sidebar Navigation */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          adminsCount={adminsList.length}
          nodesCount={nodes.length}
          currentAdminUser={currentAdminUser}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="admin-main-viewport">
          {activeTab === 'dashboard' && (
            <DashboardTab
              nodes={nodes}
              adminsList={adminsList}
              onOpenInspector={() => setShowInspector(true)}
              onNavigateToAdmins={() => setActiveTab('admins')}
              onNavigateToMaps={() => setActiveTab('maps')}
              onOpenAddAdminModal={() => {
                setActiveTab('admins');
                setShowAddAdminModal(true);
              }}
              isSuperAdmin={isSuperAdmin}
            />
          )}

          {activeTab === 'admins' && (
            <AdminsTab
              adminsList={adminsList}
              setAdminsList={setAdminsList}
              isAdminsLoading={isAdminsLoading}
              onRefresh={fetchAdmins}
              currentAdminUser={currentAdminUser}
              isSuperAdmin={isSuperAdmin}
              showToast={showToast}
              showAddAdminModal={showAddAdminModal}
              setShowAddAdminModal={setShowAddAdminModal}
            />
          )}

          {activeTab === 'maps' && (
            <MapsTab
              nodes={nodes}
              onOpenInspector={() => setShowInspector(true)}
            />
          )}
        </main>

        {/* 2D Point Picker Inspector Modal */}
        {showInspector && (
          <PointPickerInspector
            onClose={() => setShowInspector(false)}
            nodes={nodes}
            edges={[]}
          />
        )}
      </div>
    </div>
  );
}
