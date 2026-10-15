import React, { useState, useEffect, useRef } from 'react';

export default function AdminPortal() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('aveniq_admin_token') === 'aveniq-admin-secret-2026';
  });
  const [authError, setAuthError] = useState('');
  const [chats, setChats] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'projects' | 'orders' | 'chats' | 'inquiries'
  
  // Chat state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New Client Form Modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    company: ''
  });
  const [clientFormError, setClientFormError] = useState('');

  // New Project Form Modal
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    clientId: '',
    title: '',
    category: 'Custom Business Software',
    progress: 0,
    status: 'In Progress',
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: '',
    notes: '',
    lastUpdate: ''
  });
  const [projectFormError, setProjectFormError] = useState('');

  const [stats, setStats] = useState({
    totalInquiries: 0,
    activeChats: 0,
    unreadChats: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalClients: 0,
    activeProjects: 0
  });

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Authenticate Admin
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('aveniq_admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Invalid credentials. Access denied.');
      }
    } catch {
      setAuthError('Unable to connect to backend server. Make sure backend is running.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('aveniq_admin_token');
    setIsAuthenticated(false);
    if (wsRef.current) wsRef.current.close();
  };

  // Fetch Clients
  const fetchClients = async () => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientsList(data.clients || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Projects
  const fetchProjects = async () => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Inquiries
  const fetchInquiries = async () => {
    try {
      const res = await fetch('/api/contact');
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Chats
  const fetchChats = async () => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
        if (data.chats?.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.chats[0].sessionId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Initial load when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchClients();
    fetchProjects();
    fetchOrders();
    fetchChats();
    fetchInquiries();
    fetchStats();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws;
    let reconnectTimer;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'auth_admin',
            payload: { token: 'aveniq-admin-secret-2026' }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'auth_admin_success') {
              if (data.chats) {
                setChats(data.chats);
                if (data.chats.length > 0 && !selectedSessionId) {
                  setSelectedSessionId(data.chats[0].sessionId);
                }
              }
            } else if (data.type === 'new_order_placed') {
              setOrders(prev => [data.order, ...prev]);
              fetchStats();
            } else if (data.type === 'new_message') {
              setChats((prev) => {
                const existingIndex = prev.findIndex(c => c.sessionId === data.sessionId);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  const target = { ...updated[existingIndex] };
                  if (!target.messages.some(m => m.id === data.message.id)) {
                    target.messages = [...target.messages, data.message];
                  }
                  target.updatedAt = data.message.timestamp;
                  if (data.message.sender === 'client') {
                    target.unreadAdmin = (target.unreadAdmin || 0) + 1;
                  }
                  updated[existingIndex] = target;
                  return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                } else {
                  fetchChats();
                  return prev;
                }
              });
              fetchStats();
            } else if (data.type === 'new_chat_session') {
              setChats((prev) => [data.session, ...prev]);
              fetchStats();
            } else if (data.type === 'chat_deleted') {
              setChats((prev) => prev.filter(c => c.sessionId !== data.sessionId));
            }
          } catch (e) {
            console.error('Admin WS parse error', e);
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 4000);
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSessionId, chats]);

  // Client Account Creation
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setClientFormError('');
    const token = sessionStorage.getItem('aveniq_admin_token');

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClientsList(prev => [data.client, ...prev]);
        setClientModalOpen(false);
        setClientForm({ username: '', password: '', fullName: '', email: '', phone: '', company: '' });
        fetchStats();
      } else {
        setClientFormError(data.error || 'Failed to create client account.');
      }
    } catch {
      setClientFormError('Error connecting to server.');
    }
  };

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete client account "${name}"? All associated projects will also be deleted.`)) return;
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClientsList(prev => prev.filter(c => c.id !== id));
        setProjectsList(prev => prev.filter(p => p.clientId !== id));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Project Creation
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjectFormError('');
    const token = sessionStorage.getItem('aveniq_admin_token');

    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(projectForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchProjects();
        setProjectModalOpen(false);
        setProjectForm({
          clientId: '',
          title: '',
          category: 'Custom Business Software',
          progress: 0,
          status: 'In Progress',
          startDate: new Date().toISOString().slice(0, 10),
          targetEndDate: '',
          notes: '',
          lastUpdate: ''
        });
        fetchStats();
      } else {
        setProjectFormError(data.error || 'Failed to create project.');
      }
    } catch {
      setProjectFormError('Error connecting to server.');
    }
  };

  // Update Project Progress Percentage / Status
  const handleUpdateProjectProgress = async (projectId, progressVal) => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ progress: progressVal })
      });
      if (res.ok) {
        setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, progress: parseInt(progressVal, 10) } : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProjectField = async (projectId, field, value) => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, [field]: value } : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (id, title) => {
    if (!window.confirm(`Delete project "${title}"?`)) return;
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjectsList(prev => prev.filter(p => p.id !== id));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Order status update
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Delete order ${orderId}?`)) return;
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Selected Chat Session
  const currentChat = chats.find(c => c.sessionId === selectedSessionId) || (chats.length > 0 ? chats[0] : null);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentChat || isSending) return;

    const token = sessionStorage.getItem('aveniq_admin_token');
    const text = replyText.trim();
    setReplyText('');
    setIsSending(true);

    const payload = {
      sessionId: currentChat.sessionId,
      sender: 'admin',
      text
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        payload
      }));
      setIsSending(false);
    } else {
      try {
        await fetch('/api/admin/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        fetchChats();
      } catch (err) {
        console.error(err);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleDeleteChat = async (sessionId) => {
    if (!window.confirm('Delete this chat history permanently?')) return;
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/chats/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setChats(prev => prev.filter(c => c.sessionId !== sessionId));
        if (selectedSessionId === sessionId) {
          const remaining = chats.filter(c => c.sessionId !== sessionId);
          setSelectedSessionId(remaining[0]?.sessionId || null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInquiry = async (id) => {
    try {
      const res = await fetch(`/api/contact/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInquiries(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-portal-login-screen">
        <div className="admin-login-card">
          <div className="admin-brand-logo">
            <span className="admin-shield-icon">🛡️</span>
            <h2>AVENIQ ADMIN COMMAND</h2>
            <p className="admin-portal-sub">Restricted Operational Management System</p>
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

            <button type="submit" className="admin-auth-submit-btn">
              Authenticate & Unlock Admin →
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

  return (
    <div className="admin-portal-wrapper">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-brand">
            <span className="admin-status-pulse"></span>
            <strong>AVENIQ COMMAND</strong>
            <span className="admin-badge">Admin Access</span>
          </div>
          <div className="admin-stat-chips">
            <span className="admin-stat-chip highlight">
              👥 Clients: <strong>{clientsList.length}</strong>
            </span>
            <span className="admin-stat-chip highlight">
              📊 Projects: <strong>{projectsList.length}</strong>
            </span>
            <span className="admin-stat-chip">
              💬 Chats: <strong>{chats.length}</strong>
            </span>
            <span className="admin-stat-chip online">
              ⚡ SQLite DB: <strong>Online</strong>
            </span>
          </div>
        </div>

        <div className="admin-header-actions">
          <a href="/client-portal" target="_blank" rel="noreferrer" className="admin-header-btn outline">
            📂 Open Client Portal
          </a>
          <a href="/" className="admin-header-btn outline">
            🌐 Public Site
          </a>
          <button onClick={handleLogout} className="admin-header-btn danger">
            Lock & Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          👥 Client Accounts ({clientsList.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          📊 Project Progress Tracker ({projectsList.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          🛒 Service Orders ({orders.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          💬 Live Customer Chats ({chats.length})
          {chats.some(c => (c.unreadAdmin || 0) > 0) && (
            <span className="admin-unread-pill">
              {chats.reduce((acc, c) => acc + (c.unreadAdmin || 0), 0)}
            </span>
          )}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'inquiries' ? 'active' : ''}`}
          onClick={() => setActiveTab('inquiries')}
        >
          📋 Contact Inquiries ({inquiries.length})
        </button>
      </div>

      {/* ========================================================
          TAB 1: CLIENT ACCOUNTS
          ======================================================== */}
      {activeTab === 'clients' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>Client Accounts & Portal Logins</h3>
              <p>Create username and passwords for paid clients so they can track their project progress.</p>
            </div>
            <button
              onClick={() => setClientModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              + Create New Client Account
            </button>
          </div>

          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Client Name & Company</th>
                  <th>Portal Username</th>
                  <th>Assigned Password</th>
                  <th>Projects Count</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.5)' }}>
                      No client accounts created yet. Click "+ Create New Client Account" above.
                    </td>
                  </tr>
                ) : (
                  clientsList.map((client) => (
                    <tr key={client.id} className="admin-order-row">
                      <td><span className="order-id-badge">{client.id}</span></td>
                      <td>
                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{client.fullName}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                          {client.company} • 📧 {client.email} {client.phone && `• 📞 ${client.phone}`}
                        </div>
                      </td>
                      <td>
                        <code style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          {client.username}
                        </code>
                      </td>
                      <td>
                        <code style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff', padding: '3px 8px', borderRadius: '6px' }}>
                          {client.password}
                        </code>
                      </td>
                      <td>
                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{client.projectCount || 0} Projects</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setProjectForm({
                                ...projectForm,
                                clientId: client.id,
                                title: `${client.company ? client.company : client.fullName} Software`
                              });
                              setProjectModalOpen(true);
                            }}
                            className="admin-inquiry-btn accent"
                            title="Add project for this client"
                          >
                            + Add Project
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id, client.fullName)}
                            className="admin-inquiry-btn danger"
                            title="Delete Client"
                          >
                            🗑️
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
      )}

      {/* ========================================================
          TAB 2: PROJECT PROGRESS TRACKER
          ======================================================== */}
      {activeTab === 'projects' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>Client Projects & Progress Manager</h3>
              <p>Update development percentages (0% - 100%), milestones, and engineering notes. Clients see updates live in their portal.</p>
            </div>
            <button
              onClick={() => setProjectModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              + Create New Project
            </button>
          </div>

          <div className="admin-projects-grid">
            {projectsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1' }}>
                No projects added yet. Click "+ Create New Project" to assign a project to a client!
              </div>
            ) : (
              projectsList.map((proj) => {
                const percent = Math.min(100, Math.max(0, proj.progress || 0));

                return (
                  <div key={proj.id} className="admin-project-manage-card">
                    <div className="admin-proj-card-top">
                      <div>
                        <span className="order-id-badge">{proj.id}</span>
                        <h4 style={{ margin: '8px 0 3px 0', color: '#fff', fontSize: '1.1rem' }}>{proj.title}</h4>
                        <div style={{ fontSize: '0.8rem', color: '#00e5ff' }}>
                          Client: <strong>{proj.clientName}</strong> ({proj.clientUsername})
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteProject(proj.id, proj.title)}
                        className="admin-inquiry-btn danger"
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Percentage Slider & Input */}
                    <div className="admin-percent-slider-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
                          Completion Progress:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={percent}
                            onChange={(e) => handleUpdateProjectProgress(proj.id, e.target.value)}
                            style={{
                              width: '55px',
                              background: '#090f1d',
                              border: '1px solid #00e5ff',
                              borderRadius: '6px',
                              color: '#00e5ff',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              padding: '3px 0'
                            }}
                          />
                          <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>%</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={percent}
                        onChange={(e) => handleUpdateProjectProgress(proj.id, e.target.value)}
                        style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }}
                      />

                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        {[25, 50, 75, 100].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => handleUpdateProjectProgress(proj.id, step)}
                            style={{
                              background: percent === step ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: percent === step ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              cursor: 'pointer'
                            }}
                          >
                            {step}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status & Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Status</label>
                        <select
                          value={proj.status}
                          onChange={(e) => handleUpdateProjectField(proj.id, 'status', e.target.value)}
                          className="admin-edit-field"
                        >
                          <option value="Requirements Phase">Requirements Phase</option>
                          <option value="Design Phase">Design Phase</option>
                          <option value="In Development">In Development</option>
                          <option value="Testing & QA">Testing & QA</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Target Delivery</label>
                        <input
                          type="text"
                          value={proj.targetEndDate || ''}
                          placeholder="e.g. 2026-11-15"
                          onChange={(e) => handleUpdateProjectField(proj.id, 'targetEndDate', e.target.value)}
                          className="admin-edit-field"
                        />
                      </div>
                    </div>

                    {/* Latest Developer Update for client */}
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>
                        Latest Update Note (Shown on Client Dashboard)
                      </label>
                      <input
                        type="text"
                        value={proj.lastUpdate || ''}
                        placeholder="e.g. Completed inventory deduction module, starting billing test."
                        onChange={(e) => handleUpdateProjectField(proj.id, 'lastUpdate', e.target.value)}
                        className="admin-edit-field"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: SERVICE ORDERS
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>Service Orders (From Public Website)</h3>
              <p>Orders submitted by customers. You can contact them and create client accounts after payment.</p>
            </div>
            <button onClick={fetchOrders} className="admin-header-btn outline">
              ↻ Refresh Orders
            </button>
          </div>

          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Customer & Contact</th>
                  <th>Ordered Service</th>
                  <th>Timeline</th>
                  <th>Date Placed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.5)' }}>
                      No service orders received yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="admin-order-row">
                      <td><span className="order-id-badge">{ord.id}</span></td>
                      <td>
                        <div className="admin-order-client-name">{ord.customerName}</div>
                        <div className="admin-order-client-meta">
                          <a href={`mailto:${ord.customerEmail}`} style={{ color: '#00e5ff' }}>
                            {ord.customerEmail}
                          </a>
                        </div>
                        <div className="admin-order-client-meta">
                          {ord.company} • 📞 {ord.customerPhone}
                        </div>
                      </td>
                      <td>
                        <div className="admin-order-service-name">{ord.serviceName}</div>
                        {ord.requirements && (
                          <div className="admin-order-reqs-preview" title={ord.requirements}>
                            "{ord.requirements}"
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{ord.timeline}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                        {new Date(ord.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className={`order-status-dropdown status-${ord.status?.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <option value="Pending Review">Pending Review</option>
                          <option value="Payment Received">Payment Received</option>
                          <option value="Account Created">Account Created</option>
                          <option value="In Development">In Development</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              // Pre-fill client creation modal with order details
                              setClientForm({
                                username: ord.customerName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8),
                                password: 'user' + Math.floor(100 + Math.random() * 900),
                                fullName: ord.customerName,
                                email: ord.customerEmail,
                                phone: ord.customerPhone,
                                company: ord.company
                              });
                              setClientModalOpen(true);
                            }}
                            className="admin-inquiry-btn accent"
                            title="Create Client Account from this Order"
                          >
                            + Create Account
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="admin-inquiry-btn danger"
                            title="Delete Order"
                          >
                            🗑️
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
      )}

      {/* ========================================================
          TAB 4: LIVE CHATS (Stored in SQLite Database)
          ======================================================== */}
      {activeTab === 'chats' && (
        <div className="admin-chat-layout">
          {/* Chat List Sidebar */}
          <div className="admin-chat-sidebar">
            <div className="admin-sidebar-header">
              <span>Customer Conversations (Database)</span>
              <button onClick={fetchChats} className="admin-refresh-icon" title="Refresh">↻</button>
            </div>
            <div className="admin-chat-list">
              {chats.length === 0 ? (
                <div className="admin-empty-list">No chat messages in database yet</div>
              ) : (
                chats.map((c) => {
                  const isSelected = (currentChat?.sessionId === c.sessionId);
                  const lastMsg = c.messages?.[c.messages.length - 1];
                  return (
                    <div
                      key={c.sessionId}
                      className={`admin-chat-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSessionId(c.sessionId);
                        if (c.unreadAdmin > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({
                            type: 'mark_read',
                            payload: { sessionId: c.sessionId, role: 'admin' }
                          }));
                          c.unreadAdmin = 0;
                        }
                      }}
                    >
                      <div className="admin-chat-card-top">
                        <strong className="admin-client-name">{c.clientName || 'Visitor'}</strong>
                        <span className="admin-chat-time">
                          {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="admin-chat-email">{c.clientEmail || 'No email provided'}</div>
                      <div className="admin-chat-preview-snippet">
                        {lastMsg ? `${lastMsg.sender === 'admin' ? 'You: ' : ''}${lastMsg.text}` : 'No messages'}
                      </div>
                      <div className="admin-chat-card-footer">
                        <span className="admin-session-tag">{c.sessionId.slice(-7)}</span>
                        {c.unreadAdmin > 0 && (
                          <span className="admin-card-unread">{c.unreadAdmin} new</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Conversation View & Reply */}
          <div className="admin-chat-main">
            {currentChat ? (
              <>
                <div className="admin-main-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                      {currentChat.clientName || 'Visitor'}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                      {currentChat.clientEmail ? `📧 ${currentChat.clientEmail}` : '📧 No email'} • Session: <code>{currentChat.sessionId}</code>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteChat(currentChat.sessionId)}
                      className="admin-danger-text-btn"
                    >
                      🗑️ Delete Chat History
                    </button>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="admin-main-messages">
                  {currentChat.messages?.map((m) => {
                    const isAdmin = m.sender === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`admin-bubble-wrapper ${isAdmin ? 'admin' : 'client'}`}
                      >
                        <div className={`admin-chat-bubble ${isAdmin ? 'admin' : 'client'}`}>
                          <div className="admin-bubble-header">
                            <span>{isAdmin ? 'Aveniq Admin (You)' : (currentChat.clientName || 'Customer')}</span>
                            <span className="admin-bubble-time">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="admin-bubble-body">{m.text}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply bar */}
                <form onSubmit={handleSendReply} className="admin-main-reply-bar">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${currentChat.clientName || 'Customer'} (automatically saved to database)...`}
                    className="admin-reply-input"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="admin-reply-send-btn"
                  >
                    Send Reply ⚡
                  </button>
                </form>
              </>
            ) : (
              <div className="admin-no-chat-selected">
                <p>Select a chat on the left to view database history and reply.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: CONTACT INQUIRIES
          ======================================================== */}
      {activeTab === 'inquiries' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>General Inquiries & Contact Forms</h3>
              <p>Stored permanently in SQLite database.</p>
            </div>
            <button onClick={fetchInquiries} className="admin-header-btn outline">
              ↻ Refresh Leads
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div className="admin-empty-inquiries">No project inquiries received yet.</div>
          ) : (
            <div className="admin-inquiries-grid">
              {inquiries.map((inq) => (
                <div key={inq.id} className="admin-inquiry-box">
                  <div className="admin-inquiry-box-header">
                    <div>
                      <span className="admin-inquiry-badge">{inq.id}</span>
                      <strong style={{ fontSize: '1.1rem', color: '#fff', marginLeft: '10px' }}>
                        {inq.name}
                      </strong>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginLeft: '6px' }}>
                        ({inq.company})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                      {new Date(inq.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="admin-inquiry-meta-grid">
                    <div><strong>Email:</strong> <a href={`mailto:${inq.email}`} style={{ color: '#00e5ff' }}>{inq.email}</a></div>
                    <div><strong>Phone:</strong> {inq.phone}</div>
                    <div><strong>Service:</strong> {inq.service}</div>
                  </div>

                  <div className="admin-inquiry-text">
                    "{inq.message}"
                  </div>

                  <div className="admin-inquiry-actions">
                    <button
                      onClick={() => {
                        setClientForm({
                          username: inq.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8),
                          password: 'user' + Math.floor(100 + Math.random() * 900),
                          fullName: inq.name,
                          email: inq.email,
                          phone: inq.phone,
                          company: inq.company
                        });
                        setClientModalOpen(true);
                      }}
                      className="admin-inquiry-btn accent"
                    >
                      + Create Account
                    </button>
                    <a
                      href={`mailto:${inq.email}?subject=Aveniq%20Inquiry%20${inq.id}`}
                      className="admin-inquiry-btn"
                    >
                      ✉️ Reply Email
                    </a>
                    <button
                      onClick={() => handleDeleteInquiry(inq.id)}
                      className="admin-inquiry-btn danger"
                    >
                      Archive / Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE CLIENT ACCOUNT
          ======================================================== */}
      {clientModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setClientModalOpen(false)}>
          <div className="admin-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-top">
              <h3>Create Client Account</h3>
              <button onClick={() => setClientModalOpen(false)} className="admin-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleCreateClient} className="admin-modal-form">
              <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0' }}>
                Set a login username and password for your client. Give these login details to your client so they can log in at <code>/client-portal</code> and view their projects.
              </p>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Client Login Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sunil"
                    value={clientForm.username}
                    onChange={(e) => setClientForm({ ...clientForm, username: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Assign Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pass123"
                    value={clientForm.password}
                    onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Perera"
                    value={clientForm.fullName}
                    onChange={(e) => setClientForm({ ...clientForm, fullName: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sunil@company.lk"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="e.g. +94 77 123 4567"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Company / Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Perera Traders (Pvt) Ltd"
                    value={clientForm.company}
                    onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
              </div>

              {clientFormError && <div className="admin-error-box">{clientFormError}</div>}

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setClientModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Client Account →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE PROJECT FOR CLIENT
          ======================================================== */}
      {projectModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setProjectModalOpen(false)}>
          <div className="admin-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-top">
              <h3>Assign Project to Client</h3>
              <button onClick={() => setProjectModalOpen(false)} className="admin-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleCreateProject} className="admin-modal-form">
              <div className="admin-form-group">
                <label>Select Client *</label>
                <select
                  required
                  value={projectForm.clientId}
                  onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}
                  className="admin-input-field"
                >
                  <option value="">-- Choose Client Account --</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.username}) - {c.company || c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inventory & POS Billing System"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="admin-input-field"
                />
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Initial Progress (0% - 100%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={projectForm.progress}
                    onChange={(e) => setProjectForm({ ...projectForm, progress: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="admin-input-field"
                  >
                    <option value="Requirements Phase">Requirements Phase</option>
                    <option value="Design Phase">Design Phase</option>
                    <option value="In Development">In Development</option>
                    <option value="Testing & QA">Testing & QA</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Target Delivery Date</label>
                  <input
                    type="date"
                    value={projectForm.targetEndDate}
                    onChange={(e) => setProjectForm({ ...projectForm, targetEndDate: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Latest Developer Note (Seen by Client)</label>
                <input
                  type="text"
                  placeholder="e.g. Backend API configured, currently working on mobile screens."
                  value={projectForm.lastUpdate}
                  onChange={(e) => setProjectForm({ ...projectForm, lastUpdate: e.target.value })}
                  className="admin-input-field"
                />
              </div>

              {projectFormError && <div className="admin-error-box">{projectFormError}</div>}

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setProjectModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
