import React, { useState, useEffect, useRef } from 'react';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('aveniq_admin_token') === 'aveniq-admin-secret-2026';
  });

  const [chats, setChats] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [showcasesList, setShowcasesList] = useState([]);
  const [activeTab, setActiveTab] = useState('projects'); // Default directly to Project Progress & Management

  // Add Showcase Form Modal
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);
  const [showcaseForm, setShowcaseForm] = useState({
    name: '',
    url: '',
    description: '',
    tag: 'Web Platform'
  });
  const [showcaseFormError, setShowcaseFormError] = useState('');
  const [showcaseFormSuccess, setShowcaseFormSuccess] = useState('');
  const [isSubmittingShowcase, setIsSubmittingShowcase] = useState(false);

  // Live Chat state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [incomingNotification, setIncomingNotification] = useState(null);

  // Play audio chime when message arrives
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      // Audio autoplay may be constrained
    }
  };

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

  // Create Project Form Modal
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    clientId: '',
    title: '',
    category: 'Custom Business Software',
    progress: 0,
    status: 'In Development',
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: '',
    notes: '',
    lastUpdate: ''
  });
  const [projectFormError, setProjectFormError] = useState('');

  // EDIT PROJECT MODAL STATE
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectError, setEditProjectError] = useState('');
  const [editSuccessMessage, setEditSuccessMessage] = useState('');

  // FULL PROJECT VIEW-ONLY MODAL STATE (Triggered by ⚙️ Full Project Settings & Milestones →)
  const [fullProjectViewModalOpen, setFullProjectViewModalOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState(null);

  // Project search & filter
  const [projectFilterClient, setProjectFilterClient] = useState('ALL');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

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

  const handleLogout = () => {
    sessionStorage.removeItem('aveniq_admin_token');
    setIsAuthenticated(false);
    if (wsRef.current) wsRef.current.close();
    window.location.href = '/admin';
  };

  // Fetch Clients from SQLite
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

  // Fetch Projects from SQLite
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

  // Fetch Orders from SQLite
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

  // Fetch Inquiries from SQLite
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

  // Fetch Chats from SQLite
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

  // Fetch Showcases (Our Newest Live Hosted Projects)
  const fetchShowcases = async () => {
    try {
      const res = await fetch('/api/showcases');
      if (res.ok) {
        const data = await res.json();
        setShowcasesList(data.showcases || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateShowcase = async (e) => {
    e.preventDefault();
    setShowcaseFormError('');
    setShowcaseFormSuccess('');

    if (!showcaseForm.name.trim() || !showcaseForm.url.trim()) {
      setShowcaseFormError('Please enter both Website Name and Hosted Link.');
      return;
    }

    setIsSubmittingShowcase(true);
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch('/api/admin/showcases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(showcaseForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowcaseFormSuccess('🎉 Project added to live website showcases!');
        setShowcaseForm({ name: '', url: '', description: '', tag: 'Web Platform' });
        fetchShowcases();
        setTimeout(() => {
          setShowcaseModalOpen(false);
          setShowcaseFormSuccess('');
        }, 1200);
      } else {
        setShowcaseFormError(data.error || 'Failed to add showcase project.');
      }
    } catch (err) {
      console.error(err);
      setShowcaseFormError('Network error adding showcase project.');
    } finally {
      setIsSubmittingShowcase(false);
    }
  };

  const handleDeleteShowcase = async (id) => {
    if (!window.confirm('Are you sure you want to remove this project from website showcases?')) return;
    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/showcases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setShowcasesList(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Global Stats
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

  // Auto-scroll chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, selectedSessionId]);

  // Initial load & WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchClients();
    fetchProjects();
    fetchOrders();
    fetchChats();
    fetchInquiries();
    fetchStats();
    fetchShowcases();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws;
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
          } else if (data.type === 'showcase_created' || data.type === 'showcase_deleted') {
            fetchShowcases();
          } else if (data.type === 'new_message') {
            if (data.message?.sender === 'client') {
              playNotificationSound();
              setIncomingNotification({
                id: data.message.id || Date.now(),
                sessionId: data.sessionId,
                sender: data.sessionSummary?.clientName || 'Website Visitor',
                email: data.sessionSummary?.clientEmail || '',
                text: data.message.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
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
            playNotificationSound();
            setIncomingNotification({
              id: Date.now(),
              sessionId: data.session?.sessionId,
              sender: data.session?.clientName || 'New Visitor',
              email: data.session?.clientEmail || '',
              text: 'Started a new live conversation on your website.',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setChats((prev) => [data.session, ...prev]);
            fetchStats();
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isAuthenticated]);

  // Handle Client Account Creation
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
        fetchClients();
        setClientModalOpen(false);
        setClientForm({
          username: '',
          password: '',
          fullName: '',
          email: '',
          phone: '',
          company: ''
        });
        fetchStats();
      } else {
        setClientFormError(data.error || 'Failed to create client account.');
      }
    } catch {
      setClientFormError('Error connecting to server.');
    }
  };

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete client account "${name}"? All associated projects will also be deleted permanently.`)) return;
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

  // Handle Project Creation
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
          status: 'In Development',
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

  // Quick Progress Percentage Update (Slider / Presets)
  const handleUpdateProjectProgress = async (projectId, progressVal) => {
    const token = sessionStorage.getItem('aveniq_admin_token');
    const safePercent = Math.min(100, Math.max(0, parseInt(progressVal || 0, 10)));
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ progress: safePercent })
      });
      if (res.ok) {
        setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, progress: safePercent } : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Individual Project Field Inline
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

  // OPEN FULL PROJECT VIEW-ONLY MODAL
  const handleOpenFullProjectView = (proj) => {
    setViewingProject(proj);
    setFullProjectViewModalOpen(true);
  };

  // OPEN EDIT PROJECT MODAL
  const handleOpenEditProject = (proj) => {
    setEditingProject({
      ...proj,
      progress: proj.progress || 0,
      title: proj.title || '',
      category: proj.category || 'Custom Business Software',
      status: proj.status || 'In Development',
      startDate: proj.startDate || '',
      targetEndDate: proj.targetEndDate || '',
      notes: proj.notes || '',
      lastUpdate: proj.lastUpdate || ''
    });
    setEditProjectError('');
    setEditSuccessMessage('');
    setEditProjectModalOpen(true);
  };

  // SAVE EDITED PROJECT
  const handleSaveEditProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    setEditProjectError('');
    setEditSuccessMessage('');

    const token = sessionStorage.getItem('aveniq_admin_token');
    try {
      const res = await fetch(`/api/admin/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editingProject.title,
          category: editingProject.category,
          progress: editingProject.progress,
          status: editingProject.status,
          startDate: editingProject.startDate,
          targetEndDate: editingProject.targetEndDate,
          notes: editingProject.notes,
          lastUpdate: editingProject.lastUpdate
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProjectsList(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...editingProject } : p));
        setEditSuccessMessage('Project details & progress saved successfully!');
        setTimeout(() => {
          setEditProjectModalOpen(false);
          setEditingProject(null);
          setEditSuccessMessage('');
        }, 800);
      } else {
        setEditProjectError(data.error || 'Failed to update project.');
      }
    } catch {
      setEditProjectError('Connection error to server. Make sure backend is running.');
    }
  };

  // Delete Project
  const handleDeleteProject = async (id, title) => {
    if (!window.confirm(`Delete project "${title}"? This cannot be undone.`)) return;
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

  // Send admin chat reply via WebSocket or REST fallback
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSessionId || isSending) return;

    setIsSending(true);
    const textToSend = replyText.trim();
    const currentSessionId = selectedSessionId;
    const msgPayload = {
      sessionId: currentSessionId,
      sender: 'admin',
      text: textToSend
    };

    setReplyText('');

    // Send via WebSocket if available
    let wsSent = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'chat_message',
          payload: msgPayload
        }));
        wsSent = true;
      } catch (err) {
        console.error('WS send error:', err);
      }
    }

    // Always guarantee database persistence via API endpoint if WS not open
    if (!wsSent) {
      try {
        const token = sessionStorage.getItem('aveniq_admin_token');
        const res = await fetch('/api/admin/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId: currentSessionId, text: textToSend })
        });
        if (res.ok) {
          const data = await res.json();
          setChats(prev => {
            return prev.map(c => {
              if (c.sessionId === currentSessionId) {
                const msgs = c.messages || [];
                if (!msgs.some(m => m.id === data.message.id)) {
                  return { ...c, messages: [...msgs, data.message], updatedAt: data.message.timestamp };
                }
              }
              return c;
            });
          });
        }
      } catch (err) {
        console.error('HTTP admin reply error:', err);
      }
    }

    setIsSending(false);
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

  // Redirect to /admin if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-portal-login-screen">
        <div className="admin-login-card">
          <div className="admin-brand-logo">
            <span className="admin-shield-icon">🔒</span>
            <h2>SESSION EXPIRED OR LOCKED</h2>
            <p className="admin-portal-sub">Please authenticate via Admin Gate to access Dashboard</p>
          </div>
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <a href="/admin" className="admin-auth-submit-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Go to Admin Login Gate →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Filter projects by search term or client
  const filteredProjects = projectsList.filter(proj => {
    const matchClient = projectFilterClient === 'ALL' || proj.clientId === projectFilterClient;
    const matchSearch = !projectSearchTerm ||
      (proj.title && proj.title.toLowerCase().includes(projectSearchTerm.toLowerCase())) ||
      (proj.clientName && proj.clientName.toLowerCase().includes(projectSearchTerm.toLowerCase())) ||
      (proj.clientUsername && proj.clientUsername.toLowerCase().includes(projectSearchTerm.toLowerCase())) ||
      (proj.status && proj.status.toLowerCase().includes(projectSearchTerm.toLowerCase()));
    return matchClient && matchSearch;
  });

  const activeChat = chats.find(c => c.sessionId === selectedSessionId);

  return (
    <div className="admin-portal-wrapper">
      {/* Top Header Bar */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-brand">
            <span className="admin-status-pulse"></span>
            <strong>AVENIQ DASHBOARD</strong>
            <span className="admin-badge">Live System</span>
          </div>
          <div className="admin-stat-chips">
            <span className="admin-stat-chip highlight">
              👥 Clients: <strong>{clientsList.length}</strong>
            </span>
            <span className="admin-stat-chip highlight">
              📊 Projects: <strong>{projectsList.length}</strong>
            </span>
            <span className="admin-stat-chip highlight" style={{ borderColor: 'rgba(0, 229, 255, 0.4)', background: 'rgba(0, 229, 255, 0.08)' }}>
              🌐 Showcases: <strong>{showcasesList.length}</strong>
            </span>
            <span className="admin-stat-chip">
              💬 Chats: <strong>{chats.length}</strong>
            </span>
            <span className="admin-stat-chip online">
              ⚡ SQLite DB: <strong>Connected</strong>
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
          className={`admin-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('projects');
            setClientModalOpen(false);
            setProjectModalOpen(false);
            setEditProjectModalOpen(false);
            setFullProjectViewModalOpen(false);
          }}
        >
          📊 Project Progress & Edit ({projectsList.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'showcases' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('showcases');
            setClientModalOpen(false);
            setProjectModalOpen(false);
            setEditProjectModalOpen(false);
            setFullProjectViewModalOpen(false);
          }}
        >
          🌐 Website Showcases ({showcasesList.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('clients');
            setClientModalOpen(false);
            setProjectModalOpen(false);
            setEditProjectModalOpen(false);
            setFullProjectViewModalOpen(false);
          }}
        >
          👥 Client Accounts ({clientsList.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            setClientModalOpen(false);
            setProjectModalOpen(false);
            setEditProjectModalOpen(false);
            setFullProjectViewModalOpen(false);
          }}
        >
          🛒 Service Orders ({orders.length})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('chats');
            setClientModalOpen(false);
            setProjectModalOpen(false);
            setEditProjectModalOpen(false);
            setFullProjectViewModalOpen(false);
          }}
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
          onClick={() => {
            setActiveTab('inquiries');
            setClientModalOpen(false);
            setProjectModalOpen(false);
            setEditProjectModalOpen(false);
            setFullProjectViewModalOpen(false);
          }}
        >
          📩 Contact Inquiries ({inquiries.length})
        </button>
      </div>

      {/* ========================================================
          TAB 1: PROJECT PROGRESS TRACKER & FULL EDIT SECTION
          ======================================================== */}
      {activeTab === 'projects' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>User Projects & Progress Management</h3>
              <p>Directly edit project progress percentage (0% - 100%), milestones, phase status, and developer notes. Changes reflect in real-time in the client's portal.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={fetchProjects}
                className="admin-header-btn outline"
                title="Refresh projects list from database"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => setProjectModalOpen(true)}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.88rem' }}
              >
                + Create New Project
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="admin-filter-tray" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', background: '#0e172a', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)' }}>
            <div style={{ flex: '1 1 240px' }}>
              <input
                type="text"
                placeholder="Search projects by title, client, or status..."
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                className="admin-input-field"
                style={{ padding: '10px 14px', fontSize: '0.88rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>Filter by Client:</label>
              <select
                value={projectFilterClient}
                onChange={(e) => setProjectFilterClient(e.target.value)}
                className="admin-edit-field"
                style={{ padding: '8px 12px', minWidth: '170px' }}
              >
                <option value="ALL">All Clients ({clientsList.length})</option>
                {clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} ({c.username})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Projects Cards Grid */}
          <div className="admin-projects-grid">
            {filteredProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📂</div>
                <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '4px' }}>No matching projects found</div>
                <p style={{ fontSize: '0.85rem' }}>Create a new project or select another client filter.</p>
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const percent = Math.min(100, Math.max(0, proj.progress || 0));

                return (
                  <div key={proj.id} className="admin-project-manage-card">
                    <div className="admin-proj-card-top">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="order-id-badge">{proj.id}</span>
                          <span className="order-status-pill" style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            background: percent === 100 ? 'rgba(0, 230, 118, 0.2)' : 'rgba(0, 229, 255, 0.15)',
                            borderColor: percent === 100 ? '#00e676' : '#00e5ff',
                            color: percent === 100 ? '#00e676' : '#00e5ff'
                          }}>
                            {proj.status}
                          </span>
                        </div>
                        <h4 style={{ margin: '8px 0 3px 0', color: '#fff', fontSize: '1.1rem' }}>{proj.title}</h4>
                        <div style={{ fontSize: '0.8rem', color: '#00e5ff' }}>
                          Client: <strong>{proj.clientName}</strong> ({proj.clientUsername})
                        </div>
                        {proj.category && (
                          <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            Type: {proj.category}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditProject(proj)}
                          className="admin-inquiry-btn accent"
                          title="Open Full Edit Modal for this project"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.id, proj.title)}
                          className="admin-inquiry-btn danger"
                          title="Delete project"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Completion Percentage Slider & Quick Buttons */}
                    <div className="admin-percent-slider-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' }}>
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
                              width: '58px',
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

                      {/* Progress Bar Visual */}
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: percent === 100 ? '#00e676' : 'linear-gradient(90deg, #00e5ff, #2979ff)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={percent}
                        onChange={(e) => handleUpdateProjectProgress(proj.id, e.target.value)}
                        style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }}
                      />

                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        {[0, 25, 50, 75, 100].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => handleUpdateProjectProgress(proj.id, step)}
                            style={{
                              flex: 1,
                              background: percent === step ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              border: percent === step ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.12)',
                              color: percent === step ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              padding: '3px 0',
                              cursor: 'pointer',
                              fontWeight: percent === step ? 'bold' : 'normal'
                            }}
                          >
                            {step}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status & Target Delivery Inline Controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Development Phase</label>
                        <select
                          value={proj.status}
                          onChange={(e) => handleUpdateProjectField(proj.id, 'status', e.target.value)}
                          className="admin-edit-field"
                        >
                          <option value="Requirements Phase">Requirements Phase</option>
                          <option value="UI/UX Design Phase">UI/UX Design Phase</option>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>
                          Latest Note (Visible on Client Dashboard)
                        </label>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Auto-saves</span>
                      </div>
                      <input
                        type="text"
                        value={proj.lastUpdate || ''}
                        placeholder="e.g. Backend API configured, currently working on mobile screens."
                        onChange={(e) => handleUpdateProjectField(proj.id, 'lastUpdate', e.target.value)}
                        className="admin-edit-field"
                      />
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
                        Client: {proj.clientName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenFullProjectView(proj)}
                        className="admin-milestone-popup-btn"
                        title="View Full Project Card & Milestones Popup"
                      >
                        ⚙️ Full Project Settings & Milestones →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: CLIENT ACCOUNTS MANAGEMENT (BEAUTIFUL HIGH-TECH UI)
          ======================================================== */}
      {activeTab === 'clients' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>Client Accounts Command Hub</h3>
              <p>Manage verified customer credentials. Clients use these credentials to authenticate at <code>/client-portal</code> and monitor live development progress.</p>
            </div>
            <button
              onClick={() => setClientModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '9px 22px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>+</span> Create Client Account
            </button>
          </div>

          {/* Quick Metrics Banner */}
          <div className="admin-client-metrics-row">
            <div className="admin-client-metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-info">
                <span className="metric-label">Total Registered Clients</span>
                <span className="metric-number">{clientsList.length}</span>
              </div>
            </div>
            <div className="admin-client-metric-card">
              <div className="metric-icon">🚀</div>
              <div className="metric-info">
                <span className="metric-label">Active Linked Projects</span>
                <span className="metric-number">{projectsList.length}</span>
              </div>
            </div>
            <div className="admin-client-metric-card">
              <div className="metric-icon">🛡️</div>
              <div className="metric-info">
                <span className="metric-label">Authentication Engine</span>
                <span className="metric-number" style={{ fontSize: '1.05rem', color: '#10b981' }}>Secure SQLite</span>
              </div>
            </div>
          </div>

          {/* Client Cards Grid */}
          <div className="admin-client-cards-grid">
            {clientsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>👤</div>
                <div style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>No Client Accounts Created Yet</div>
                <p style={{ fontSize: '0.88rem' }}>Click "+ Create Client Account" to set up credentials for paying customers.</p>
              </div>
            ) : (
              clientsList.map((client) => {
                const clientProjects = projectsList.filter(p => p.clientId === client.id);
                const avgProgress = clientProjects.length > 0
                  ? Math.round(clientProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / clientProjects.length)
                  : 0;

                return (
                  <div key={client.id} className="admin-client-glass-card">
                    {/* Header */}
                    <div className="client-card-top">
                      <div className="client-avatar-badge">
                        {client.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="client-identity">
                        <h4>{client.fullName}</h4>
                        {client.company ? (
                          <div className="client-company-tag">🏢 {client.company}</div>
                        ) : (
                          <div className="client-individual-tag">👤 Individual Account</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteClient(client.id, client.fullName)}
                        className="admin-client-delete-btn"
                        title="Delete client account"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Credentials & Details Box */}
                    <div className="client-credentials-box">
                      <div className="cred-row">
                        <span className="cred-label">Login Username:</span>
                        <code className="cred-value">@{client.username}</code>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Client ID:</span>
                        <span className="cred-id">{client.id}</span>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Email:</span>
                        <span className="cred-val">{client.email || 'None Provided'}</span>
                      </div>
                      <div className="cred-row">
                        <span className="cred-label">Phone / WhatsApp:</span>
                        <span className="cred-val">{client.phone || 'None Provided'}</span>
                      </div>
                    </div>

                    {/* Projects Mini-Status */}
                    <div className="client-projects-progress-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Projects Assigned: <strong>{clientProjects.length}</strong>
                        </span>
                        <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>
                          Avg: {avgProgress}%
                        </span>
                      </div>
                      <div className="client-prog-track">
                        <div
                          className="client-prog-fill"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="client-card-actions">
                      <button
                        onClick={() => {
                          setProjectForm({
                            ...projectForm,
                            clientId: client.id,
                            title: `${client.company ? client.company : client.fullName} Software`
                          });
                          setProjectModalOpen(true);
                        }}
                        className="admin-client-action-btn primary"
                      >
                        + Assign New Project
                      </button>

                      {client.phone && (
                        <a
                          href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${client.fullName}, this is Aveniq. Your client portal credentials are: Username: ${client.username}. Portal: http://localhost:5173/client-portal`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-client-action-btn whatsapp"
                          title="Send login credentials via WhatsApp"
                        >
                          💬 WhatsApp
                        </a>
                      )}
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
                    <tr key={ord.id}>
                      <td style={{ fontFamily: 'monospace', color: '#00e5ff' }}>
                        <span className="order-id-badge">{ord.id}</span>
                      </td>
                      <td>
                        <strong>{ord.customerName}</strong>
                        {ord.company && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>🏢 {ord.company}</div>}
                        <div style={{ fontSize: '0.8rem', color: '#00e5ff', marginTop: '2px' }}>📞 {ord.phone}</div>
                        {ord.email && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>✉️ {ord.email}</div>}
                      </td>
                      <td>
                        <span className="order-service-name">{ord.serviceName}</span>
                        {ord.requirements && (
                          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px', maxWidth: '300px' }}>
                            {ord.requirements}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{ord.timeline || 'Flexible'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                        {new Date(ord.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className={`order-status-select ${ord.status.toLowerCase()}`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Quoted">Quoted</option>
                          <option value="Paid / In Progress">Paid / In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {ord.phone && (
                            <a
                              href={`https://wa.me/${ord.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${ord.customerName}, this is Aveniq regarding your service order for ${ord.serviceName}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-inquiry-btn whatsapp"
                              title="Message Customer on WhatsApp"
                            >
                              💬 WhatsApp
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setClientForm({
                                username: ord.customerName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client',
                                password: 'pass' + Math.floor(100 + Math.random() * 900),
                                fullName: ord.customerName,
                                email: ord.email || '',
                                phone: ord.phone || '',
                                company: ord.company || ''
                              });
                              setClientModalOpen(true);
                            }}
                            className="admin-inquiry-btn accent"
                            title="Convert to Client Account"
                          >
                            + Account
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
          TAB 4: LIVE CUSTOMER CHATS
          ======================================================== */}
      {activeTab === 'chats' && (
        <div className="admin-chat-management-layout">
          {/* Chat Sessions Sidebar */}
          <div className="admin-chat-sessions-list">
            <div className="admin-chat-list-header">
              <h4>Active Chat Sessions ({chats.length})</h4>
              <button onClick={fetchChats} className="admin-chat-refresh-btn" title="Refresh chats">
                ↻
              </button>
            </div>

            {chats.length === 0 ? (
              <div className="admin-chat-empty-list">
                No chat conversations yet. When visitors message from the floating chat widget, conversations appear here.
              </div>
            ) : (
              chats.map((c) => (
                <div
                  key={c.sessionId}
                  onClick={() => setSelectedSessionId(c.sessionId)}
                  className={`admin-chat-session-item ${selectedSessionId === c.sessionId ? 'active' : ''}`}
                >
                  <div className="session-item-top">
                    <span className="session-user-name">
                      👤 {c.userName || 'Website Visitor'}
                    </span>
                    <span className="session-time">
                      {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="session-preview">
                    {c.messages && c.messages.length > 0
                      ? c.messages[c.messages.length - 1].text
                      : 'No messages yet'}
                  </div>

                  <div className="session-item-bottom">
                    <span className="session-id-pill">ID: {c.sessionId.slice(-6)}</span>
                    {(c.unreadAdmin || 0) > 0 && (
                      <span className="session-unread-badge">{c.unreadAdmin} new</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Conversation View */}
          <div className="admin-chat-thread-view">
            {activeChat ? (
              <>
                <div className="admin-chat-thread-header">
                  <div>
                    <h4>{activeChat.userName || 'Website Visitor'}</h4>
                    <span className="chat-thread-meta">
                      Session: <code>{activeChat.sessionId}</code> • Started {new Date(activeChat.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDeleteChat(activeChat.sessionId)}
                      className="admin-inquiry-btn danger"
                      title="Delete chat conversation"
                    >
                      Delete Chat
                    </button>
                  </div>
                </div>

                <div className="admin-chat-messages-scroll">
                  {activeChat.messages && activeChat.messages.length > 0 ? (
                    activeChat.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`admin-bubble-row ${msg.sender === 'admin' ? 'admin' : 'client'}`}
                      >
                        <div className={`admin-msg-bubble ${msg.sender === 'admin' ? 'admin' : 'client'}`}>
                          <div className="msg-sender-label">
                            {msg.sender === 'admin' ? '🛡️ You (Admin)' : `👤 ${activeChat.userName || 'Visitor'}`}
                          </div>
                          <div className="msg-text-content">{msg.text}</div>
                          <div className="msg-time-stamp">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px' }}>
                      No messages in this chat session.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendReply} className="admin-chat-reply-bar">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${activeChat.userName || 'visitor'} in real-time...`}
                    className="admin-chat-reply-input"
                  />
                  <button type="submit" disabled={isSending || !replyText.trim()} className="admin-chat-reply-btn">
                    {isSending ? 'Sending...' : 'Send Reply →'}
                  </button>
                </form>
              </>
            ) : (
              <div className="admin-chat-no-selection">
                <span style={{ fontSize: '2.5rem' }}>💬</span>
                <h3>Select a chat conversation</h3>
                <p>Choose any session from the left sidebar to read history and reply.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: CONTACT INQUIRIES (BEAUTIFUL HIGH-TECH UI)
          ======================================================== */}
      {activeTab === 'inquiries' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>Public Contact Inquiries Hub</h3>
              <p>Real-time form submissions from visitors on the public website. Connect with leads directly via WhatsApp or email.</p>
            </div>
            <button onClick={fetchInquiries} className="admin-header-btn outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>↻</span> Refresh Inquiries
            </button>
          </div>

          {/* Inquiries Grid */}
          <div className="admin-inquiries-modern-grid">
            {inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>📩</div>
                <div style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>No Inquiries Received Yet</div>
                <p style={{ fontSize: '0.88rem' }}>When customers fill the contact form on the public website, messages appear here instantly.</p>
              </div>
            ) : (
              inquiries.map((inq) => (
                <div key={inq.id} className="admin-inquiry-modern-card">
                  {/* Card Header */}
                  <div className="inquiry-modern-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="inquiry-avatar-circle">
                        {inq.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="inquiry-sender-name">{inq.name}</h4>
                        <div className="inquiry-company-subtitle">
                          {inq.company ? `🏢 ${inq.company}` : '👤 Independent Inquiry'}
                        </div>
                      </div>
                    </div>
                    <span className="inquiry-ref-tag">
                      {inq.id || 'REF'}
                    </span>
                  </div>

                  {/* Service Badge & Date */}
                  <div className="inquiry-service-banner">
                    <span className="inquiry-service-pill">
                      🎯 {inq.service}
                    </span>
                    <span className="inquiry-timestamp">
                      {new Date(inq.createdAt || inq.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Quote Box */}
                  <div className="inquiry-quote-box">
                    <span className="inquiry-quote-mark">“</span>
                    <p className="inquiry-quote-text">{inq.message}</p>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="inquiry-contact-chips">
                    {inq.phone && inq.phone !== 'Not provided' && (
                      <span className="inquiry-contact-chip">
                        📞 {inq.phone}
                      </span>
                    )}
                    {inq.email && (
                      <span className="inquiry-contact-chip">
                        ✉️ {inq.email}
                      </span>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="inquiry-footer-actions">
                    {inq.phone && inq.phone !== 'Not provided' ? (
                      <a
                        href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${inq.name}, thank you for contacting Aveniq regarding ${inq.service}. How can we assist you?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inquiry-action-btn whatsapp"
                      >
                        💬 Reply on WhatsApp
                      </a>
                    ) : inq.email ? (
                      <a
                        href={`mailto:${inq.email}?subject=${encodeURIComponent(`Aveniq Software - Regarding ${inq.service}`)}`}
                        className="inquiry-action-btn email"
                      >
                        ✉️ Send Email
                      </a>
                    ) : null}

                    <button
                      onClick={() => {
                        setClientForm({
                          username: inq.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client',
                          password: 'pass' + Math.floor(100 + Math.random() * 900),
                          fullName: inq.name,
                          email: inq.email || '',
                          phone: inq.phone !== 'Not provided' ? inq.phone : '',
                          company: inq.company || ''
                        });
                        setClientModalOpen(true);
                      }}
                      className="inquiry-action-btn convert"
                      title="Convert lead to registered client account"
                    >
                      + Make Client
                    </button>

                    <button
                      onClick={() => handleDeleteInquiry(inq.id)}
                      className="inquiry-action-btn delete"
                      title="Delete inquiry"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB: WEBSITE SHOWCASES (OUR NEWEST HOSTED PROJECTS)
          ======================================================== */}
      {activeTab === 'showcases' && (
        <div className="admin-tab-content-container">
          <div className="admin-section-header-bar">
            <div>
              <h3>Live Website Showcases (Aveniq Public Showcase)</h3>
              <p>Add new websites or projects with their hosted link. Added websites will immediately appear on the Aveniq public website in the interactive showcase grid with preview cards, hover modal popups, and scrollable windows.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={fetchShowcases}
                className="admin-header-btn outline"
                title="Refresh showcases from database"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => {
                  setShowcaseFormError('');
                  setShowcaseFormSuccess('');
                  setShowcaseModalOpen(true);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.88rem' }}
              >
                + Add New Project Website
              </button>
            </div>
          </div>

          {/* Inline Quick-Add Card */}
          <div className="admin-quick-add-tray" style={{ padding: '22px 24px', marginBottom: '24px', border: '1px solid rgba(0, 229, 255, 0.3)', background: '#0e172a', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>
            <h4 style={{ margin: '0 0 14px 0', color: '#00e5ff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Quick Add New Project Website</span>
            </h4>
            <form onSubmit={handleCreateShowcase} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
                  Website Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Logistics Portal"
                  value={showcaseForm.name}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(6,11,22,0.85)', border: '1px solid rgba(0,229,255,0.22)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
                  Hosted Link (URL) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://example.com or domain.lk"
                  value={showcaseForm.url}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, url: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(6,11,22,0.85)', border: '1px solid rgba(0,229,255,0.22)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
                  Category Tag
                </label>
                <select
                  value={showcaseForm.tag}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, tag: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#090f1d', border: '1px solid rgba(0,229,255,0.22)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="Web Platform">Web Platform</option>
                  <option value="E-Commerce Store">E-Commerce Store</option>
                  <option value="Business Management">Business Management</option>
                  <option value="POS & Inventory">POS & Inventory</option>
                  <option value="Mobile / Web App">Mobile / Web App</option>
                  <option value="FinTech & Banking">FinTech & Banking</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
                  Short Summary / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-throughput delivery management system"
                  value={showcaseForm.description}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(6,11,22,0.85)', border: '1px solid rgba(0,229,255,0.22)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={isSubmittingShowcase}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem', height: '42px', whiteSpace: 'nowrap' }}
                >
                  {isSubmittingShowcase ? 'Publishing...' : 'Publish to Website ↗'}
                </button>
              </div>
            </form>

            {showcaseFormError && (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', fontSize: '0.85rem' }}>
                {showcaseFormError}
              </div>
            )}
            {showcaseFormSuccess && (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#10b981', fontSize: '0.85rem' }}>
                {showcaseFormSuccess}
              </div>
            )}
          </div>

          {/* Showcases Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {showcasesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.5)', gridColumn: '1 / -1', background: 'rgba(14, 23, 42, 0.85)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>No Showcase Projects Added Yet</div>
                <p style={{ fontSize: '0.88rem' }}>Add your newest projects above. They will be displayed in interactive scrollable cards on the public Aveniq page.</p>
              </div>
            ) : (
              showcasesList.map((item) => (
                <div key={item.id} className="admin-showcase-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(14, 23, 42, 0.88)', border: '1px solid rgba(0, 229, 255, 0.22)', borderRadius: '16px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(0, 229, 255, 0.12)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.25)', fontWeight: '600' }}>
                        {item.tag || 'Project'}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#fff' }}>
                      {item.name}
                    </h4>

                    {item.description && (
                      <p style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    )}

                    <div style={{ marginBottom: '14px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', wordBreak: 'break-all' }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        Hosted Link
                      </span>
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#00e5ff', fontSize: '0.85rem', textDecoration: 'none' }}>
                        🔗 {item.url}
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', textAlign: 'center', textDecoration: 'none' }}
                    >
                      ↗ Visit Site
                    </a>
                    <button
                      onClick={() => handleDeleteShowcase(item.id)}
                      className="inquiry-action-btn delete"
                      title="Delete showcase project"
                      style={{ padding: '7px 12px' }}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD NEW PROJECT WEBSITE SHOWCASE
          ======================================================== */}
      {showcaseModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '540px' }}>
            <div className="admin-modal-header">
              <div>
                <h3 style={{ margin: 0, color: '#fff' }}>Add New Project to Website</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                  This project will be immediately visible in the Aveniq public showcases grid.
                </p>
              </div>
              <button
                onClick={() => setShowcaseModalOpen(false)}
                className="admin-modal-close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShowcase} className="admin-modal-body">
              {showcaseFormError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.88rem', marginBottom: '14px' }}>
                  ⚠️ {showcaseFormError}
                </div>
              )}
              {showcaseFormSuccess && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', fontSize: '0.88rem', marginBottom: '14px' }}>
                  {showcaseFormSuccess}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Website / Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Health Management Platform"
                  value={showcaseForm.name}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.92rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Hosted Link (Live Website URL) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://client-domain.com or https://project.vercel.app"
                  value={showcaseForm.url}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, url: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.92rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '4px' }}>
                  If http/https is omitted, https:// will be automatically added.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Category Tag
                </label>
                <select
                  value={showcaseForm.tag}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, tag: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.92rem' }}
                >
                  <option value="Web Platform">Web Platform</option>
                  <option value="E-Commerce Store">E-Commerce Store</option>
                  <option value="Business Management">Business Management</option>
                  <option value="POS & Inventory">POS & Inventory</option>
                  <option value="Mobile / Web App">Mobile / Web App</option>
                  <option value="FinTech & Banking">FinTech & Banking</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Short Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Brief summary of what this website provides..."
                  value={showcaseForm.description}
                  onChange={(e) => setShowcaseForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.92rem', resize: 'vertical' }}
                />
              </div>

              <div className="admin-modal-footer" style={{ padding: '0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowcaseModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShowcase}
                  className="btn btn-primary"
                  style={{ padding: '9px 22px' }}
                >
                  {isSubmittingShowcase ? 'Saving...' : 'Add to Showcase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT PROJECT PROGRESS & DETAILS (SECTIONS)
          ======================================================== */}
      {editProjectModalOpen && editingProject && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '620px' }}>
            <div className="admin-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>✏️ Edit Project Details & Progress</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  Client: <strong>{editingProject.clientName}</strong> ({editingProject.clientUsername})
                </p>
              </div>
              <button onClick={() => setEditProjectModalOpen(false)} className="admin-modal-close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="admin-modal-form">
              {/* Section 1: Project Identity */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Section 1: General Info
                </h4>
                <div className="admin-form-group">
                  <label>Project Title *</label>
                  <input
                    type="text"
                    required
                    value={editingProject.title}
                    onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                    className="admin-input-field"
                  />
                </div>

                <div className="admin-form-row-2">
                  <div className="admin-form-group">
                    <label>Category / Solution</label>
                    <input
                      type="text"
                      value={editingProject.category || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                      className="admin-input-field"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Current Phase / Status</label>
                    <select
                      value={editingProject.status}
                      onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                      className="admin-input-field"
                    >
                      <option value="Requirements Phase">Requirements Phase</option>
                      <option value="UI/UX Design Phase">UI/UX Design Phase</option>
                      <option value="In Development">In Development</option>
                      <option value="Testing & QA">Testing & QA</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Progress Percentage */}
              <div style={{ marginBottom: '16px', background: 'rgba(0, 229, 255, 0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Section 2: Progress Percentage
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingProject.progress}
                      onChange={(e) => setEditingProject({ ...editingProject, progress: Math.min(100, Math.max(0, parseInt(e.target.value || 0, 10))) })}
                      style={{
                        width: '65px',
                        background: '#090f1d',
                        border: '1px solid #00e5ff',
                        borderRadius: '6px',
                        color: '#00e5ff',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        fontSize: '1rem',
                        padding: '4px 0'
                      }}
                    />
                    <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingProject.progress}
                  onChange={(e) => setEditingProject({ ...editingProject, progress: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {[0, 25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditingProject({ ...editingProject, progress: val })}
                      style={{
                        flex: 1,
                        background: editingProject.progress === val ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        border: editingProject.progress === val ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: editingProject.progress === val ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '4px',
                        padding: '4px 0',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Timeline & Dates */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Section 3: Project Timeline
                </h4>
                <div className="admin-form-row-2">
                  <div className="admin-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editingProject.startDate || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                      className="admin-input-field"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Target Delivery Date</label>
                    <input
                      type="date"
                      value={editingProject.targetEndDate || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, targetEndDate: e.target.value })}
                      className="admin-input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Client Updates & Notes */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Section 4: Notes & Live Updates
                </h4>
                <div className="admin-form-group">
                  <label>Live Update Note (Displayed on Client Dashboard)</label>
                  <input
                    type="text"
                    placeholder="e.g. Completed inventory deduction module, starting billing test."
                    value={editingProject.lastUpdate || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, lastUpdate: e.target.value })}
                    className="admin-input-field"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Internal Engineering Notes (Admin Only)</label>
                  <textarea
                    rows="3"
                    placeholder="Private notes about database schema, GitHub branches, server credentials, etc."
                    value={editingProject.notes || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, notes: e.target.value })}
                    className="admin-input-field"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              {editProjectError && <div className="admin-error-box">{editProjectError}</div>}
              {editSuccessMessage && (
                <div style={{ background: 'rgba(0, 230, 118, 0.15)', border: '1px solid #00e676', color: '#00e676', padding: '10px', borderRadius: '6px', fontSize: '0.88rem', marginBottom: '14px', textAlign: 'center' }}>
                  ✓ {editSuccessMessage}
                </div>
              )}

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setEditProjectModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes to Database →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE NEW CLIENT ACCOUNT
          ======================================================== */}
      {clientModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Create Client Account</h3>
              <button onClick={() => setClientModalOpen(false)} className="admin-modal-close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="admin-modal-form">
              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Client Full Name *</label>
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

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Login Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sunil2026"
                    value={clientForm.username}
                    onChange={(e) => setClientForm({ ...clientForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Login Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pass@123"
                    value={clientForm.password}
                    onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="admin-input-field"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
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
                  Save Client to SQLite →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE NEW PROJECT
          ======================================================== */}
      {projectModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Create Project for Client</h3>
              <button onClick={() => setProjectModalOpen(false)} className="admin-modal-close-btn">
                ✕
              </button>
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
                  <option value="">-- Choose Client --</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} {c.company ? `(${c.company})` : ''} — @{c.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pos Billing System & Inventory Web App"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="admin-input-field"
                />
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label>Initial Progress (0 - 100%)</label>
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
                    <option value="UI/UX Design Phase">UI/UX Design Phase</option>
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

      {/* ========================================================
          POPUP: FULL PROJECT VIEW-ONLY CARD & MILESTONES INTERFACE
          (Triggered by: ⚙️ Full Project Settings & Milestones →)
          ======================================================== */}
      {fullProjectViewModalOpen && viewingProject && (
        <div className="admin-modal-overlay" onClick={() => setFullProjectViewModalOpen(false)}>
          <div
            className="admin-modal-card admin-project-fullview-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px' }}
          >
            {/* Modal Header */}
            <div className="admin-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="order-id-badge" style={{ fontSize: '0.85rem' }}>{viewingProject.id}</span>
                  <span
                    className="order-status-pill"
                    style={{
                      background: viewingProject.progress === 100 ? 'rgba(0, 230, 118, 0.2)' : 'rgba(0, 229, 255, 0.15)',
                      borderColor: viewingProject.progress === 100 ? '#00e676' : '#00e5ff',
                      color: viewingProject.progress === 100 ? '#00e676' : '#00e5ff',
                      fontSize: '0.8rem',
                      padding: '3px 10px'
                    }}
                  >
                    {viewingProject.status || 'In Progress'}
                  </span>
                </div>
                <h2 style={{ margin: '8px 0 2px 0', color: '#fff', fontSize: '1.45rem', letterSpacing: '-0.02em' }}>
                  {viewingProject.title}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#00e5ff' }}>
                  Client: <strong>{viewingProject.clientName}</strong> (@{viewingProject.clientUsername})
                </div>
              </div>
              <button
                onClick={() => setFullProjectViewModalOpen(false)}
                className="admin-modal-close-btn"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Full Card View Interface */}
            <div className="admin-project-fullview-body">
              {/* Progress Banner Hero */}
              <div className="project-view-progress-hero">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>
                      Overall Project Completion
                    </span>
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#00e5ff', lineHeight: 1.1 }}>
                      {viewingProject.progress || 0}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Category</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff' }}>
                      {viewingProject.category || 'Custom Software'}
                    </div>
                  </div>
                </div>

                <div className="project-view-progress-track">
                  <div
                    className="project-view-progress-bar"
                    style={{
                      width: `${viewingProject.progress || 0}%`,
                      background: viewingProject.progress === 100
                        ? '#00e676'
                        : 'linear-gradient(90deg, #00e5ff 0%, #2979ff 50%, #8a2be2 100%)'
                    }}
                  />
                </div>
              </div>

              {/* Milestones Tracker Interface */}
              <div className="project-view-section">
                <h4 className="project-view-section-title">
                  🚩 Engineering Milestones & Phases
                </h4>

                <div className="milestones-timeline-grid">
                  {[
                    { label: 'Phase 1: Requirements & Scope', minVal: 15, desc: 'Client requirements gathered, workflow mapped.' },
                    { label: 'Phase 2: UI/UX & System Architecture', minVal: 40, desc: 'Responsive interface created & database designed.' },
                    { label: 'Phase 3: Core Module Implementation', minVal: 75, desc: 'Backend APIs, database integration & logic finished.' },
                    { label: 'Phase 4: QA Testing & Client Handover', minVal: 100, desc: 'Quality assurance, cloud deployment, final handover.' }
                  ].map((m, idx) => {
                    const isDone = (viewingProject.progress || 0) >= m.minVal;
                    const isCurrent = !isDone && ((idx === 0) || (viewingProject.progress || 0) >= [0, 15, 40, 75][idx]);

                    return (
                      <div key={m.label} className={`milestone-step-card ${isDone ? 'completed' : isCurrent ? 'current' : 'upcoming'}`}>
                        <div className="milestone-step-header">
                          <span className="milestone-badge">
                            {isDone ? '✓ COMPLETED' : isCurrent ? '⏳ IN PROGRESS' : 'UPCOMING'}
                          </span>
                          <span className="milestone-target">{m.minVal}%</span>
                        </div>
                        <h5 className="milestone-name">{m.label}</h5>
                        <p className="milestone-desc">{m.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Details Grid */}
              <div className="project-view-details-grid">
                <div className="project-view-detail-box">
                  <span className="detail-box-label">📅 Start Date</span>
                  <div className="detail-box-val">{viewingProject.startDate || 'Not set'}</div>
                </div>

                <div className="project-view-detail-box">
                  <span className="detail-box-label">🎯 Target Delivery</span>
                  <div className="detail-box-val" style={{ color: '#00e5ff', fontWeight: 'bold' }}>
                    {viewingProject.targetEndDate || 'TBD (Flexible)'}
                  </div>
                </div>

                <div className="project-view-detail-box">
                  <span className="detail-box-label">👤 Assigned Client</span>
                  <div className="detail-box-val">{viewingProject.clientName}</div>
                </div>

                <div className="project-view-detail-box">
                  <span className="detail-box-label">⚡ Database Record</span>
                  <div className="detail-box-val" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#10b981' }}>
                    Active (SQLite)
                  </div>
                </div>
              </div>

              {/* Live Developer Update Note */}
              <div className="project-view-section">
                <h4 className="project-view-section-title">
                  💬 Latest Note Shown to Client
                </h4>
                <div className="project-view-note-callout">
                  <div style={{ fontSize: '0.78rem', color: '#00e5ff', fontWeight: 'bold', marginBottom: '4px' }}>
                    📢 Public Development Update
                  </div>
                  <p style={{ margin: 0, fontSize: '0.92rem', color: '#f1f5f9', lineHeight: 1.5 }}>
                    {viewingProject.lastUpdate || 'No status note has been published for this project yet.'}
                  </p>
                </div>
              </div>

              {/* Private Engineering Notes (If available) */}
              {viewingProject.notes && (
                <div className="project-view-section">
                  <h4 className="project-view-section-title">
                    🔒 Internal Engineering Notes (Admin Only)
                  </h4>
                  <div className="project-view-private-note">
                    {viewingProject.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="admin-modal-footer" style={{ padding: '16px 24px', background: '#0b1222', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                View-Only Inspector Mode
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFullProjectViewModalOpen(false);
                    handleOpenEditProject(viewingProject);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.86rem' }}
                >
                  ✏️ Switch to Edit Mode
                </button>
                <button
                  type="button"
                  onClick={() => setFullProjectViewModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.86rem' }}
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Visitor Message Notification Banner */}
      {incomingNotification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid #6366f1',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(99, 102, 241, 0.35)',
            padding: '16px 18px',
            animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            color: '#fff',
            fontFamily: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', animation: 'bounce 1s infinite' }}>💬</span>
              <strong style={{ fontSize: '0.92rem', color: '#38bdf8', letterSpacing: '0.5px' }}>
                NEW VISITOR MESSAGE
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {incomingNotification.time}
              </span>
              <button
                type="button"
                onClick={() => setIncomingNotification(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '2px 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
            {incomingNotification.sender}
            {incomingNotification.email && (
              <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px', fontSize: '0.78rem' }}>
                ({incomingNotification.email})
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: '0.84rem',
              color: '#cbd5e1',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '8px 12px',
              borderRadius: '8px',
              borderLeft: '3px solid #38bdf8',
              marginBottom: '12px',
              lineHeight: 1.4,
              maxHeight: '75px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            "{incomingNotification.text}"
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('chat');
                setSelectedSessionId(incomingNotification.sessionId);
                setIncomingNotification(null);
              }}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                border: 'none',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)'
              }}
            >
              Open Live Chat ⚡
            </button>
            <button
              type="button"
              onClick={() => setIncomingNotification(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#94a3b8',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
