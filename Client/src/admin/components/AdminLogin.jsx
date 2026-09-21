import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import api from '../../utils/axios';
import '../AdminPage.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated with a valid token, redirect to dashboard
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await api.get('/api/admins/profile');
        if (res.data?.success && res.data?.data) {
          navigate('/admin/dashboard', { replace: true });
        }
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('medinav_admin_user');
      }
    };

    checkExistingSession();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/admins/login', {
        username: credentials.username.trim(),
        password: credentials.password.trim(),
      });

      if (res.data?.success && res.data?.token) {
        const { token, data: adminData } = res.data;
        localStorage.setItem('token', token);
        if (adminData) {
          localStorage.setItem('medinav_admin_user', JSON.stringify(adminData));
        }
        setIsLoading(false);
        navigate('/admin/dashboard');
      } else {
        setIsLoading(false);
        setError('Login failed: Invalid server response');
      }
    } catch (err) {
      setIsLoading(false);
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'ACCESS DENIED: Invalid username or password';
      setError(message);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-auth-wrapper">
        <div className="admin-login-card animate-scale-in">
          {/* Header Badge */}
          <div className="admin-login-header">
            <div className="admin-shield-icon">
              <ShieldCheck size={32} color="#00ff88" />
            </div>
            <h1 className="admin-login-title">Admin Portal</h1>
            <p className="admin-login-subtitle">
              Sign in to manage hospital wayfinding, navigation graph, and administrator accounts
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="admin-login-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="admin-form">
            <div className="admin-input-group">
              <label className="admin-label">Username or Email</label>
              <div className="admin-input-box">
                <User size={18} className="admin-field-icon" />
                <input
                  type="text"
                  name="username"
                  className="admin-input"
                  placeholder="Enter username or email"
                  value={credentials.username}
                  onChange={handleChange}
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
                  name="password"
                  className="admin-input"
                  placeholder="Enter admin password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="admin-pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
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
              disabled={isLoading || !credentials.username || !credentials.password}
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
    </div>
  );
}
