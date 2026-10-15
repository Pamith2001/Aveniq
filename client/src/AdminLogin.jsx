import React, { useState } from 'react';

export default function AdminLogin({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('aveniq_admin_token', data.token);
        if (onAuthenticated) {
          onAuthenticated();
        } else {
          window.location.href = '/admin-dashboard';
        }
      } else {
        setAuthError(data.error || 'Invalid credentials. Access denied.');
      }
    } catch {
      setAuthError('Unable to connect to backend server. Make sure the server is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-portal-login-screen">
      <div className="admin-login-card">
        <div className="admin-brand-logo">
          <span className="admin-shield-icon">🛡️</span>
          <h2>AVENIQ ADMIN COMMAND</h2>
          <p className="admin-portal-sub">Restricted Operational Gateway</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-form-group">
            <label>Master Passcode</label>
            <input
              type="password"
              required
              autoFocus
              placeholder="Enter admin passcode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input-field"
            />
          </div>

          {authError && <div className="admin-error-box">{authError}</div>}

          <button type="submit" className="admin-auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Verifying Credentials...' : 'Authenticate & Open Dashboard →'}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/" className="admin-back-link">← Return to Public Website</a>
          <span className="admin-default-hint">Default Key: <code>aveniq2026</code></span>
        </div>
      </div>
    </div>
  );
}
