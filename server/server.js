import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import db from './db.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// WebSocket setup
const wss = new WebSocketServer({ server });
// Map socket -> metadata { role: 'admin'|'client', sessionId: string }
const clients = new Map();

function broadcastToRole(role, payload) {
  const jsonStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const meta = clients.get(client);
      if (meta && meta.role === role) {
        client.send(jsonStr);
      }
    }
  });
}

function sendToSession(sessionId, payload) {
  const jsonStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const meta = clients.get(client);
      if (meta && (meta.role === 'admin' || meta.sessionId === sessionId)) {
        client.send(jsonStr);
      }
    }
  });
}

// Database helper functions for chat
function getAllChatSessions() {
  const sessions = db.prepare('SELECT * FROM chat_sessions ORDER BY updatedAt DESC').all();
  const getMessages = db.prepare('SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC');
  return sessions.map(s => ({
    ...s,
    messages: getMessages.all(s.sessionId)
  }));
}

function getChatSession(sessionId) {
  const session = db.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').get(sessionId);
  if (!session) return null;
  const messages = db.prepare('SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC').all(sessionId);
  return { ...session, messages };
}

function saveChatMessage(sessionId, text, sender, clientName, clientEmail) {
  const now = new Date().toISOString();
  let session = db.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').get(sessionId);

  if (!session) {
    db.prepare(`
      INSERT INTO chat_sessions (sessionId, clientName, clientEmail, createdAt, updatedAt, unreadAdmin, unreadClient)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      clientName?.trim() || 'Visitor',
      clientEmail?.trim() || '',
      now,
      now,
      sender === 'client' ? 1 : 0,
      sender === 'admin' ? 1 : 0
    );
  } else {
    const unreadAdminInc = sender === 'client' ? session.unreadAdmin + 1 : session.unreadAdmin;
    const unreadClientInc = sender === 'admin' ? session.unreadClient + 1 : session.unreadClient;
    const nameToUpdate = clientName && session.clientName === 'Visitor' ? clientName.trim() : session.clientName;
    const emailToUpdate = clientEmail && !session.clientEmail ? clientEmail.trim() : session.clientEmail;

    db.prepare(`
      UPDATE chat_sessions
      SET clientName = ?, clientEmail = ?, updatedAt = ?, unreadAdmin = ?, unreadClient = ?
      WHERE sessionId = ?
    `).run(nameToUpdate, emailToUpdate, now, unreadAdminInc, unreadClientInc, sessionId);
  }

  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  db.prepare(`
    INSERT INTO chat_messages (id, sessionId, sender, text, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(msgId, sessionId, sender, text.trim(), now);

  return {
    id: msgId,
    sessionId,
    sender,
    text: text.trim(),
    timestamp: now
  };
}

wss.on('connection', (ws) => {
  clients.set(ws, { role: 'unknown', sessionId: null });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const { type, payload } = parsed;

      if (type === 'auth_admin') {
        if (payload?.token === 'aveniq-admin-secret-2026') {
          clients.set(ws, { role: 'admin', sessionId: null });
          ws.send(JSON.stringify({ type: 'auth_admin_success', chats: getAllChatSessions() }));
        } else {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid admin credentials' }));
        }
      } else if (type === 'init_client') {
        const sessionId = payload?.sessionId || ('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
        clients.set(ws, { role: 'client', sessionId });

        let session = getChatSession(sessionId);
        if (!session) {
          const now = new Date().toISOString();
          db.prepare(`
            INSERT INTO chat_sessions (sessionId, clientName, clientEmail, createdAt, updatedAt, unreadAdmin, unreadClient)
            VALUES (?, ?, ?, ?, ?, 0, 0)
          `).run(sessionId, payload?.clientName || 'Visitor', payload?.clientEmail || '', now, now);
          session = {
            sessionId,
            clientName: payload?.clientName || 'Visitor',
            clientEmail: payload?.clientEmail || '',
            createdAt: now,
            updatedAt: now,
            unreadAdmin: 0,
            unreadClient: 0,
            messages: []
          };
          broadcastToRole('admin', { type: 'new_chat_session', session });
        }
        ws.send(JSON.stringify({ type: 'init_client_success', session }));
      } else if (type === 'chat_message' || type === 'send_message') {
        const { sessionId, text, sender, clientName, clientEmail } = payload;
        if (!sessionId || !text?.trim()) return;

        const newMsg = saveChatMessage(sessionId, text, sender || 'client', clientName, clientEmail);
        const session = getChatSession(sessionId);

        sendToSession(sessionId, {
          type: 'new_message',
          sessionId,
          message: newMsg,
          sessionSummary: {
            sessionId: session.sessionId,
            clientName: session.clientName,
            clientEmail: session.clientEmail,
            updatedAt: session.updatedAt,
            unreadAdmin: session.unreadAdmin,
            unreadClient: session.unreadClient
          }
        });
      } else if (type === 'mark_read') {
        const { sessionId, role } = payload;
        if (role === 'admin') {
          db.prepare('UPDATE chat_sessions SET unreadAdmin = 0 WHERE sessionId = ?').run(sessionId);
        } else if (role === 'client') {
          db.prepare('UPDATE chat_sessions SET unreadClient = 0 WHERE sessionId = ?').run(sessionId);
        }
        sendToSession(sessionId, { type: 'read_status_updated', sessionId, role });
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// REST Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Aveniq Core API Engine v2.5 (SQLite Persistent Engine)',
    environment: 'production-ready'
  });
});

// Admin Auth check
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aveniq2026';

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: 'aveniq-admin-secret-2026',
      message: 'Admin authorization granted'
    });
  }
  return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
});

function requireAdmin(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (token === 'aveniq-admin-secret-2026') {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized. Admin authorization required.' });
}

// ==========================================
// CLIENT PORTAL (Customer Login & Projects)
// ==========================================

// Customer Login
app.post('/api/client/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Please enter both username and password.' });
  }

  const client = db.prepare('SELECT id, username, fullName, email, phone, company, createdAt FROM clients WHERE LOWER(username) = LOWER(?) AND password = ?').get(username.trim(), password.trim());

  if (!client) {
    return res.status(401).json({ success: false, error: 'Invalid client credentials. Please check with Aveniq admin.' });
  }

  // Fetch client projects
  const projects = db.prepare('SELECT * FROM projects WHERE clientId = ? ORDER BY lastUpdate DESC, startDate DESC').all(client.id);

  res.json({
    success: true,
    client,
    projects,
    message: 'Login successful'
  });
});

// Client Get Projects
app.get('/api/client/projects/:clientId', (req, res) => {
  const { clientId } = req.params;
  const projects = db.prepare('SELECT * FROM projects WHERE clientId = ? ORDER BY lastUpdate DESC, startDate DESC').all(clientId);
  res.json({ success: true, count: projects.length, projects });
});

// ==========================================
// ADMIN: CLIENT & PROJECT MANAGEMENT
// ==========================================

// Admin: Get all clients with their project counts
app.get('/api/admin/clients', requireAdmin, (req, res) => {
  const clientsList = db.prepare(`
    SELECT c.*, COUNT(p.id) as projectCount, 
           COALESCE(AVG(p.progress), 0) as averageProgress
    FROM clients c
    LEFT JOIN projects p ON c.id = p.clientId
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `).all();
  res.json({ success: true, count: clientsList.length, clients: clientsList });
});

// Admin: Create new client account (Username & Password generated/assigned by Admin)
app.post('/api/admin/clients', requireAdmin, (req, res) => {
  const { username, password, fullName, email, phone, company } = req.body;

  if (!username || !password || !fullName || !email) {
    return res.status(400).json({ success: false, error: 'Username, password, full name, and email are required.' });
  }

  const existing = db.prepare('SELECT id FROM clients WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (existing) {
    return res.status(400).json({ success: false, error: 'A client with this username already exists. Choose a different username.' });
  }

  const clientId = 'CLT-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO clients (id, username, password, fullName, email, phone, company, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clientId,
    username.trim().toLowerCase(),
    password.trim(),
    fullName.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    company ? company.trim() : 'Independent Client',
    now
  );

  const newClient = db.prepare('SELECT id, username, fullName, email, phone, company, createdAt FROM clients WHERE id = ?').get(clientId);

  res.status(201).json({
    success: true,
    message: 'Client account created successfully.',
    client: newClient
  });
});

// Admin: Delete Client (also cascades to projects)
app.delete('/api/admin/clients/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM projects WHERE clientId = ?').run(id);
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Client not found.' });
  }
  res.json({ success: true, message: 'Client account removed.' });
});

// Admin: Get all projects (or filtered by client)
app.get('/api/admin/projects', requireAdmin, (req, res) => {
  const { clientId } = req.query;
  let projects;
  if (clientId) {
    projects = db.prepare(`
      SELECT p.*, c.fullName as clientName, c.company as clientCompany, c.username as clientUsername
      FROM projects p
      JOIN clients c ON p.clientId = c.id
      WHERE p.clientId = ?
      ORDER BY p.startDate DESC
    `).all(clientId);
  } else {
    projects = db.prepare(`
      SELECT p.*, c.fullName as clientName, c.company as clientCompany, c.username as clientUsername
      FROM projects p
      JOIN clients c ON p.clientId = c.id
      ORDER BY p.startDate DESC
    `).all();
  }
  res.json({ success: true, count: projects.length, projects });
});

// Admin: Create new project for a client
app.post('/api/admin/projects', requireAdmin, (req, res) => {
  const { clientId, title, category, progress, status, startDate, targetEndDate, notes, lastUpdate } = req.body;

  if (!clientId || !title) {
    return res.status(400).json({ success: false, error: 'Client selection and project title are required.' });
  }

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId);
  if (!client) {
    return res.status(404).json({ success: false, error: 'Selected client does not exist.' });
  }

  const projectId = 'PRJ-' + Math.floor(100 + Math.random() * 900);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (id, clientId, title, category, progress, status, startDate, targetEndDate, notes, lastUpdate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    clientId,
    title.trim(),
    category || 'General Software',
    Math.min(100, Math.max(0, parseInt(progress, 10) || 0)),
    status || 'In Progress',
    startDate || now.slice(0, 10),
    targetEndDate || '',
    notes || '',
    lastUpdate || 'Project initialized by Aveniq team.'
  );

  const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.status(201).json({ success: true, message: 'Project created successfully.', project: newProject });
});

// Admin: Update project (percentage, status, notes, lastUpdate)
app.patch('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { progress, status, notes, lastUpdate, targetEndDate, title, category, startDate } = req.body;

  const current = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }

  const updatedProgress = progress !== undefined ? Math.min(100, Math.max(0, parseInt(progress, 10))) : current.progress;
  const updatedStatus = status || current.status;
  const updatedNotes = notes !== undefined ? notes : current.notes;
  const updatedLastUpdate = lastUpdate !== undefined ? lastUpdate : current.lastUpdate;
  const updatedEndDate = targetEndDate !== undefined ? targetEndDate : current.targetEndDate;
  const updatedTitle = title !== undefined ? title : current.title;
  const updatedCategory = category !== undefined ? category : current.category;
  const updatedStartDate = startDate !== undefined ? startDate : current.startDate;

  db.prepare(`
    UPDATE projects
    SET progress = ?, status = ?, notes = ?, lastUpdate = ?, targetEndDate = ?, title = ?, category = ?, startDate = ?
    WHERE id = ?
  `).run(updatedProgress, updatedStatus, updatedNotes, updatedLastUpdate, updatedEndDate, updatedTitle, updatedCategory, updatedStartDate, id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json({ success: true, message: 'Project progress updated.', project: updated });
});

// Admin: Delete Project
app.delete('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }
  res.json({ success: true, message: 'Project removed.' });
});

// ==========================================
// CHAT API (Stored in SQLite Database)
// ==========================================

app.get('/api/chat/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = getChatSession(sessionId);
  if (!session) {
    return res.json({
      success: true,
      session: {
        sessionId,
        clientName: 'Visitor',
        clientEmail: '',
        messages: []
      }
    });
  }
  res.json({ success: true, session });
});

app.post('/api/chat/message', (req, res) => {
  const { sessionId, text, sender, clientName, clientEmail } = req.body;
  if (!sessionId || !text?.trim()) {
    return res.status(400).json({ success: false, error: 'Session ID and message text are required.' });
  }

  const newMsg = saveChatMessage(sessionId, text, sender || 'client', clientName, clientEmail);
  const session = getChatSession(sessionId);

  sendToSession(sessionId, {
    type: 'new_message',
    sessionId,
    message: newMsg,
    sessionSummary: {
      sessionId: session.sessionId,
      clientName: session.clientName,
      clientEmail: session.clientEmail,
      updatedAt: session.updatedAt,
      unreadAdmin: session.unreadAdmin
    }
  });

  res.status(201).json({ success: true, message: newMsg, session });
});

app.get('/api/admin/chats', requireAdmin, (req, res) => {
  const chats = getAllChatSessions();
  res.json({ success: true, count: chats.length, chats });
});

app.post('/api/admin/reply', requireAdmin, (req, res) => {
  const { sessionId, text } = req.body;
  if (!sessionId || !text?.trim()) {
    return res.status(400).json({ success: false, error: 'Session ID and message text are required.' });
  }

  const newMsg = saveChatMessage(sessionId, text, 'admin');
  db.prepare('UPDATE chat_sessions SET unreadAdmin = 0 WHERE sessionId = ?').run(sessionId);
  const session = getChatSession(sessionId);

  sendToSession(sessionId, {
    type: 'new_message',
    sessionId,
    message: newMsg,
    sessionSummary: {
      sessionId: session.sessionId,
      clientName: session.clientName,
      clientEmail: session.clientEmail,
      updatedAt: session.updatedAt,
      unreadAdmin: session.unreadAdmin
    }
  });

  res.json({ success: true, message: newMsg, session });
});

app.delete('/api/admin/chats/:sessionId', requireAdmin, (req, res) => {
  const { sessionId } = req.params;
  db.prepare('DELETE FROM chat_messages WHERE sessionId = ?').run(sessionId);
  db.prepare('DELETE FROM chat_sessions WHERE sessionId = ?').run(sessionId);
  broadcastToRole('admin', { type: 'chat_deleted', sessionId });
  res.json({ success: true, message: 'Chat removed successfully' });
});

// ==========================================
// INQUIRIES & ORDERS (Stored in SQLite)
// ==========================================

app.get('/api/contact', (req, res) => {
  const msgs = db.prepare('SELECT * FROM inquiries ORDER BY timestamp DESC').all();
  res.json({
    success: true,
    count: msgs.length,
    messages: msgs
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, company, service, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Please provide name, email, and project message.'
    });
  }

  const newId = 'AVQ-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO inquiries (id, name, email, phone, company, service, message, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    name.trim(),
    email.trim(),
    phone ? phone.trim() : 'Not provided',
    company ? company.trim() : 'Independent / Business',
    service || 'Web & Mobile App Development',
    message.trim(),
    now
  );

  const newEntry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(newId);

  res.status(201).json({
    success: true,
    id: newId,
    message: 'Thank you! Your message has been sent to Aveniq team.',
    inquiry: newEntry
  });
});

app.delete('/api/contact/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM inquiries WHERE id = ?').run(id);
  res.json({ success: true, message: `Inquiry ${id} removed.` });
});

// Service Orders
app.post('/api/orders', (req, res) => {
  const { customerName, customerEmail, customerPhone, company, serviceId, serviceName, tier, timeline, requirements } = req.body;

  if (!customerName || !customerEmail || !serviceName) {
    return res.status(400).json({
      success: false,
      error: 'Please provide full name, email, and selected service.'
    });
  }

  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO orders (id, customerName, customerEmail, customerPhone, company, serviceId, serviceName, tier, timeline, requirements, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review', ?)
  `).run(
    orderId,
    customerName.trim(),
    customerEmail.trim(),
    customerPhone ? customerPhone.trim() : 'Not provided',
    company ? company.trim() : 'Independent / Founder',
    serviceId || 'custom-software',
    serviceName.trim(),
    tier || 'Standard Project',
    timeline || '2-4 Weeks',
    requirements ? requirements.trim() : '',
    now
  );

  const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

  broadcastToRole('admin', {
    type: 'new_order_placed',
    order: newOrder
  });

  res.status(201).json({
    success: true,
    orderId,
    message: 'Your service order has been placed successfully!',
    order: newOrder
  });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
  res.json({ success: true, count: orders.length, orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  broadcastToRole('admin', { type: 'order_status_updated', order });
  res.json({ success: true, message: `Order ${id} updated`, order });
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  broadcastToRole('admin', { type: 'order_deleted', id });
  res.json({ success: true, message: `Order ${id} removed.` });
});

// Admin stats summary
app.get('/api/stats', (req, res) => {
  const inquiriesCount = db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;
  const chatsCount = db.prepare('SELECT COUNT(*) as count FROM chat_sessions').get().count;
  const unreadChats = db.prepare('SELECT COUNT(*) as count FROM chat_sessions WHERE unreadAdmin > 0').get().count;
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending Review'").get().count;
  const clientsCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'Completed'").get().count;

  res.json({
    totalInquiries: inquiriesCount,
    activeChats: chatsCount,
    unreadChats,
    totalOrders: ordersCount,
    pendingOrders,
    totalClients: clientsCount,
    activeProjects,
    serverStatus: 'Optimal (100% Operational)',
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`⚡ Aveniq Backend Server & WebSocket running at http://localhost:${PORT}`);
});
