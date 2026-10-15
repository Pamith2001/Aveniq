import React, { useState, useEffect } from 'react';

export default function ClientPortal({ onBackToWebsite }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('aveniq_client_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [projects, setProjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // If already logged in, fetch fresh projects
  useEffect(() => {
    if (clientData?.id) {
      fetchProjects(clientData.id);
    }
  }, [clientData?.id]);

  const fetchProjects = async (clientId) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/client/projects/${clientId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClientData(data.client);
        setProjects(data.projects || []);
        sessionStorage.setItem('aveniq_client_auth', JSON.stringify(data.client));
      } else {
        setErrorMsg(data.error || 'Invalid username or password.');
      }
    } catch {
      setErrorMsg('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('aveniq_client_auth');
    setClientData(null);
    setProjects([]);
  };

  // Helper for progress bar color
  const getProgressColor = (percent) => {
    if (percent >= 100) return '#10b981'; // Green
    if (percent >= 70) return '#00e5ff'; // Cyan
    if (percent >= 35) return '#3b82f6'; // Blue
    return '#f59e0b'; // Amber
  };

  // Login view
  if (!clientData) {
    return (
      <div className="client-login-screen">
        <div className="client-login-card">
          <div className="client-login-header">
            <div className="client-portal-shield">📂</div>
            <h2>AVENIQ CLIENT PORTAL</h2>
            <p>Access your project status, live progress & development milestones.</p>
          </div>

          <form onSubmit={handleLogin} className="client-login-form">
            <div className="client-form-group">
              <label>Client Username</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter provided username (e.g. sunil)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="client-login-input"
              />
            </div>

            <div className="client-form-group">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="Enter your client password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="client-login-input"
              />
            </div>

            {errorMsg && <div className="client-error-box">{errorMsg}</div>}

            <button type="submit" disabled={loading} className="client-login-btn">
              {loading ? 'Authenticating...' : 'Sign In to Client Dashboard →'}
            </button>
          </form>

          <div className="client-login-footer">
            <button
              type="button"
              onClick={onBackToWebsite || (() => { window.location.href = '/'; })}
              className="client-back-website-btn"
            >
              ← Back to Main Website
            </button>
            <span className="client-demo-hint">
              Demo Access: <code>sunil</code> / <code>pass123</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Client Dashboard
  return (
    <div className="client-portal-container">
      {/* Top Navbar */}
      <header className="client-portal-header">
        <div className="client-header-brand">
          <span className="client-pulse-dot"></span>
          <span className="client-brand-title">AVENIQ</span>
          <span className="client-badge">Client Portal</span>
        </div>

        <div className="client-header-user">
          <div className="client-user-meta">
            <strong className="client-user-name">{clientData.fullName}</strong>
            <span className="client-user-company">{clientData.company || clientData.email}</span>
          </div>

          <div className="client-actions-group">
            <button
              onClick={() => fetchProjects(clientData.id)}
              className="client-refresh-btn"
              title="Refresh project progress"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Status'}
            </button>
            <button
              onClick={handleLogout}
              className="client-logout-btn"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="client-portal-main">
        <div className="client-welcome-banner">
          <div>
            <h2>Welcome back, {clientData.fullName.split(' ')[0]}!</h2>
            <p>
              Here is the live real-time development progress for your contracted projects with Aveniq.
            </p>
          </div>
          <div className="client-stats-summary-box">
            <div className="client-stat-item">
              <span className="stat-num">{projects.length}</span>
              <span className="stat-lbl">Active Projects</span>
            </div>
            <div className="client-stat-item">
              <span className="stat-num">
                {projects.length > 0
                  ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
                  : 0}%
              </span>
              <span className="stat-lbl">Avg Completion</span>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="client-projects-section">
          <h3 className="client-section-heading">Your Project Tracker</h3>

          {projects.length === 0 ? (
            <div className="client-empty-projects">
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📁</div>
              <h4>No active projects assigned yet.</h4>
              <p>Our engineering leads are configuring your project setup. Check back shortly!</p>
            </div>
          ) : (
            <div className="client-projects-grid">
              {projects.map((proj) => {
                const percent = Math.min(100, Math.max(0, proj.progress || 0));
                const progressColor = getProgressColor(percent);

                return (
                  <div key={proj.id} className="client-project-card">
                    {/* Card Header */}
                    <div className="client-proj-header">
                      <div>
                        <div className="client-proj-tag-row">
                          <span className="client-proj-id">{proj.id}</span>
                          <span className="client-proj-category">{proj.category || 'Software'}</span>
                        </div>
                        <h4 className="client-proj-title">{proj.title}</h4>
                      </div>
                      <span className={`client-status-pill status-${proj.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {proj.status || 'In Progress'}
                      </span>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="client-progress-box">
                      <div className="client-progress-header">
                        <span className="client-progress-lbl">Current Development Progress</span>
                        <span className="client-progress-val" style={{ color: progressColor }}>
                          {percent}%
                        </span>
                      </div>
                      <div className="client-progress-bar-bg">
                        <div
                          className="client-progress-bar-fill"
                          style={{
                            width: `${percent}%`,
                            background: `linear-gradient(90deg, #2979ff, ${progressColor})`,
                            boxShadow: `0 0 12px ${progressColor}80`
                          }}
                        />
                      </div>
                    </div>

                    {/* Dates & Timeline */}
                    <div className="client-timeline-row">
                      {proj.startDate && (
                        <div>
                          <span className="timeline-lbl">Started:</span>
                          <span className="timeline-val">{proj.startDate}</span>
                        </div>
                      )}
                      {proj.targetEndDate && (
                        <div>
                          <span className="timeline-lbl">Target Delivery:</span>
                          <span className="timeline-val highlight">{proj.targetEndDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Latest Engineering Update */}
                    {proj.lastUpdate && (
                      <div className="client-update-box">
                        <div className="update-lbl">⚡ Latest Developer Update</div>
                        <p className="update-text">{proj.lastUpdate}</p>
                      </div>
                    )}

                    {/* Project Scope / Technical Notes */}
                    {proj.notes && (
                      <div className="client-notes-box">
                        <div className="notes-lbl">📋 Technical Scope & Details</div>
                        <p className="notes-text">{proj.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
