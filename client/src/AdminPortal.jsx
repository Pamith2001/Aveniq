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
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'chats' | 'inquiries'
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState({ totalInquiries: 0, pendingInquiries: 0, activeChats: 0, unreadChats: 0, totalOrders: 0, pendingOrders: 0 });

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
    } catch (err) {
      setAuthError('Unable to connect to backend server. Make sure backend is running.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('aveniq_admin_token');
    setIsAuthenticated(false);
    if (wsRef.current) wsRef.current.close();
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
      console.error('Failed to fetch orders:', e);
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

  // Update order status
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
      console.error('Failed to update order status:', e);
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
      console.error('Failed to delete order:', e);
    }
  };

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

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
            } else if (data.type === 'order_status_updated') {
              setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
              fetchStats();
            } else if (data.type === 'order_deleted') {
              setOrders(prev => prev.filter(o => o.id !== data.id));
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
      } catch (err) {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [isAuthenticated]);

  // Auto scroll chat preview
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSessionId, chats]);

  // Selected session object
  const currentChat = chats.find(c => c.sessionId === selectedSessionId) || (chats.length > 0 ? chats[0] : null);

  // Send admin reply
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
        console.error('Failed to send admin reply:', err);
      } finally {
        setIsSending(false);
      }
    }
  };

  // Delete chat conversation
  const handleDeleteChat = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;
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

  // Delete Inquiry
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
            <h2>AVENIQ ADMIN PORTAL</h2>
            <p className="admin-portal-sub">Restricted Operational Management System</p>
          </div>

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="admin-form-group">
              <label>Master Security Key / Password</label>
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
              Authenticate & Unlock Portal →
            </button>
          </form>

          <div className="admin-login-footer">
            <a href="/" className="admin-back-link">← Return to Public Website</a>
            <span className="admin-default-hint">Default Dev Key: <code>aveniq2026</code></span>
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
              🛒 Total Orders: <strong>{orders.length}</strong>
            </span>
            <span className="admin-stat-chip">
              💬 Active Chats: <strong>{chats.length}</strong>
            </span>
            <span className="admin-stat-chip">
              📩 Leads: <strong>{inquiries.length}</strong>
            </span>
            <span className="admin-stat-chip online">
              ⚡ WebSocket: <strong>Connected</strong>
            </span>
          </div>
        </div>

        <div className="admin-header-actions">
          <a href="/" className="admin-header-btn outline">
            🌐 View Public Site
          </a>
          <button onClick={handleLogout} className="admin-header-btn danger">
            Lock & Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          🛒 Service Orders ({orders.length})
          {orders.some(o => o.status === 'Pending Review') && (
            <span className="admin-unread-pill">
              {orders.filter(o => o.status === 'Pending Review').length} New
            </span>
          )}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          💬 Live Customer Chats
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
          📋 General Inquiries & RFPs ({inquiries.length})
        </button>
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' && (
        <div className="admin-orders-container">
          <div className="admin-inquiries-header">
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', color: '#fff' }}>
                Incoming Software & Engineering Orders
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)' }}>
                Real-time orders received from client website provisioner.
              </p>
            </div>
            <button onClick={fetchOrders} className="admin-header-btn outline">
              ↻ Refresh Orders
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="admin-empty-inquiries">
              No orders logged yet. Place a test order using the "Order Architecture" buttons on the public website!
            </div>
          ) : (
            <div className="admin-orders-table-wrapper">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Customer & Company</th>
                    <th>Ordered Service</th>
                    <th>Tier & Timeline</th>
                    <th>Date Placed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id} className="admin-order-row">
                      <td>
                        <span className="order-id-badge">{ord.id}</span>
                      </td>
                      <td>
                        <div className="admin-order-client-name">{ord.customerName}</div>
                        <div className="admin-order-client-meta">
                          <a href={`mailto:${ord.customerEmail}`} style={{ color: '#00e5ff' }}>
                            {ord.customerEmail}
                          </a>
                        </div>
                        <div className="admin-order-client-meta">
                          {ord.company} • {ord.customerPhone}
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
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.86rem' }}>{ord.tier}</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>{ord.timeline}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                        {new Date(ord.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className={`order-status-dropdown status-${ord.status.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <option value="Pending Review">Pending Review</option>
                          <option value="In Review">In Review</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="In Development">In Development</option>
                          <option value="Completed">Completed</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a
                            href={`mailto:${ord.customerEmail}?subject=Aveniq%20Order%20Confirmation%20${ord.id}&body=Hello%20${encodeURIComponent(ord.customerName)},%0D%0A%0D%0AThank%20you%20for%20ordering%20${encodeURIComponent(ord.serviceName)}%20from%20Aveniq.%0D%0AWe%20are%20ready%20to%20schedule%20your%20technical%20discovery%20kickoff.`}
                            className="admin-inquiry-btn"
                            title="Send Email Confirmation"
                          >
                            ✉️ Email
                          </a>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Live Chats */}
      {activeTab === 'chats' && (
        <div className="admin-chat-layout">
          {/* Chat List Sidebar */}
          <div className="admin-chat-sidebar">
            <div className="admin-sidebar-header">
              <span>Customer Conversations</span>
              <button onClick={fetchChats} className="admin-refresh-icon" title="Refresh">↻</button>
            </div>
            <div className="admin-chat-list">
              {chats.length === 0 ? (
                <div className="admin-empty-list">No chat messages yet</div>
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
                      {currentChat.clientEmail ? `📧 ${currentChat.clientEmail}` : '📧 No email provided'} • Session: <code>{currentChat.sessionId}</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleDeleteChat(currentChat.sessionId)}
                      className="admin-danger-text-btn"
                    >
                      🗑️ Delete Chat
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
                    placeholder={`Reply directly to ${currentChat.clientName || 'Visitor'} in real-time...`}
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
                <p>Select a chat on the left to start replying in real-time.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Inquiries Tab */}
      {activeTab === 'inquiries' && (
        <div className="admin-inquiries-container">
          <div className="admin-inquiries-header">
            <h3>Project Proposals & Contact Inquiries</h3>
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
                    <div><strong>Budget:</strong> {inq.budget}</div>
                  </div>

                  <div className="admin-inquiry-text">
                    "{inq.message}"
                  </div>

                  <div className="admin-inquiry-actions">
                    <a
                      href={`mailto:${inq.email}?subject=Aveniq%20Consultation%20${inq.id}`}
                      className="admin-inquiry-btn"
                    >
                      ✉️ Reply Email
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi ${inq.name}, following up regarding your Aveniq project inquiry ${inq.id}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-inquiry-btn accent"
                    >
                      💬 WhatsApp
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
    </div>
  );
}
