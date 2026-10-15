import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const messagesFile = path.join(dataDir, 'messages.json');
const chatsFile = path.join(dataDir, 'chats.json');
const ordersFile = path.join(dataDir, 'orders.json');

// Ensure data folder and files exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(ordersFile)) {
  const initialOrders = [
    {
      id: 'ORD-1094',
      customerName: 'Marcus Sterling',
      customerEmail: 'm.sterling@sterlingfintech.com',
      customerPhone: '+1 (555) 839-2041',
      company: 'Sterling Capital Financial',
      serviceId: 'ai-agents',
      serviceName: 'Autonomous AI & LLM Systems',
      tier: 'Production System ($18,500 - $35,000)',
      timeline: '6-8 Weeks',
      requirements: 'Autonomous fraud detection and transaction reasoning agent with real-time vector search integration.',
      status: 'In Review',
      priority: 'High',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 'ORD-1092',
      customerName: 'Sophia Chen',
      customerEmail: 'sophia@novabiome.io',
      customerPhone: '+1 (415) 782-9904',
      company: 'NovaBiome Biotech',
      serviceId: 'cloud-saas',
      serviceName: 'Cloud-Native SaaS Platforms',
      tier: 'Enterprise Custom ($45,000+)',
      timeline: '8-12 Weeks',
      requirements: 'Multi-tenant genomic data computation pipeline on AWS EKS with zero-downtime microservices.',
      status: 'Confirmed',
      priority: 'Urgent',
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString()
    }
  ];
  fs.writeFileSync(ordersFile, JSON.stringify(initialOrders, null, 2), 'utf-8');
}

if (!fs.existsSync(messagesFile)) {
  const initialData = [
    {
      id: 'AVQ-9012',
      name: 'Alexander Wright',
      email: 'a.wright@nexuscapital.io',
      phone: '+1 (555) 349-8201',
      company: 'Nexus Capital Partners',
      service: 'AI & Autonomous Agents',
      budget: '$25,000 - $50,000',
      message: 'Looking to build an autonomous risk-assessment engine with LLM agents and real-time streaming data.',
      status: 'In Review',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'AVQ-8941',
      name: 'Elena Rostova',
      email: 'elena@quantumscale.tech',
      phone: '+44 20 7946 0912',
      company: 'QuantumScale Tech',
      service: 'Cloud Native & Microservices',
      budget: '$50,000+',
      message: 'Need complete cloud infrastructure redesign with Kubernetes cluster orchestration and zero downtime failover.',
      status: 'Contacted',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];
  fs.writeFileSync(messagesFile, JSON.stringify(initialData, null, 2), 'utf-8');
}

if (!fs.existsSync(chatsFile)) {
  const initialChats = [
    {
      sessionId: 'demo-session-client-1',
      clientName: 'David Vance',
      clientEmail: 'dvance@apexcapital.org',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      unreadAdmin: 1,
      unreadClient: 0,
      messages: [
        {
          id: 'msg_1',
          sender: 'client',
          text: 'Hello, we are looking for dedicated AI development team for enterprise workflows.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: 'msg_2',
          sender: 'admin',
          text: 'Hi David! Thank you for reaching out. We specialize in custom multi-agent LLM systems and secure cloud infrastructure. What is your estimated timeline?',
          timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString()
        },
        {
          id: 'msg_3',
          sender: 'client',
          text: 'We are planning for a Q4 kickoff. Can we schedule a fast discovery call?',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        }
      ]
    }
  ];
  fs.writeFileSync(chatsFile, JSON.stringify(initialChats, null, 2), 'utf-8');
}

// Helpers
function getMessages() {
  try {
    const raw = fs.readFileSync(messagesFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading messages:', err);
    return [];
  }
}

function saveMessages(msgs) {
  try {
    fs.writeFileSync(messagesFile, JSON.stringify(msgs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving messages:', err);
    return false;
  }
}

function getChats() {
  try {
    const raw = fs.readFileSync(chatsFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading chats:', err);
    return [];
  }
}

function saveChats(chats) {
  try {
    fs.writeFileSync(chatsFile, JSON.stringify(chats, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving chats:', err);
    return false;
  }
}

function getOrders() {
  try {
    const raw = fs.readFileSync(ordersFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading orders:', err);
    return [];
  }
}

function saveOrders(orders) {
  try {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving orders:', err);
    return false;
  }
}

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

wss.on('connection', (ws) => {
  clients.set(ws, { role: 'unknown', sessionId: null });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const { type, payload } = parsed;

      if (type === 'auth_admin') {
        // payload: { token }
        if (payload?.token === 'aveniq-admin-secret-2026') {
          clients.set(ws, { role: 'admin', sessionId: null });
          ws.send(JSON.stringify({ type: 'auth_admin_success', chats: getChats() }));
        } else {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid admin credentials' }));
        }
      } else if (type === 'init_client') {
        // payload: { sessionId, clientName, clientEmail }
        const sessionId = payload?.sessionId || ('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
        clients.set(ws, { role: 'client', sessionId });

        const chats = getChats();
        let session = chats.find(c => c.sessionId === sessionId);
        if (!session) {
          session = {
            sessionId,
            clientName: payload?.clientName || 'Visitor',
            clientEmail: payload?.clientEmail || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unreadAdmin: 0,
            unreadClient: 0,
            messages: []
          };
          chats.unshift(session);
          saveChats(chats);
          broadcastToRole('admin', { type: 'new_chat_session', session });
        }
        ws.send(JSON.stringify({ type: 'init_client_success', session }));
      } else if (type === 'chat_message') {
        // payload: { sessionId, text, sender, clientName, clientEmail }
        const { sessionId, text, sender, clientName, clientEmail } = payload;
        if (!sessionId || !text?.trim()) return;

        const chats = getChats();
        let session = chats.find(c => c.sessionId === sessionId);
        const now = new Date().toISOString();

        if (!session) {
          session = {
            sessionId,
            clientName: clientName || 'Visitor',
            clientEmail: clientEmail || '',
            createdAt: now,
            updatedAt: now,
            unreadAdmin: sender === 'client' ? 1 : 0,
            unreadClient: sender === 'admin' ? 1 : 0,
            messages: []
          };
          chats.unshift(session);
        } else {
          if (clientName && session.clientName === 'Visitor') session.clientName = clientName;
          if (clientEmail && !session.clientEmail) session.clientEmail = clientEmail;
          session.updatedAt = now;
          if (sender === 'client') session.unreadAdmin = (session.unreadAdmin || 0) + 1;
          if (sender === 'admin') session.unreadClient = (session.unreadClient || 0) + 1;
        }

        const newMsg = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sender, // 'client' or 'admin'
          text: text.trim(),
          timestamp: now
        };

        session.messages.push(newMsg);
        saveChats(chats);

        // Notify both client session and admin listeners
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
      } else if (type === 'mark_read') {
        const { sessionId, role } = payload;
        const chats = getChats();
        const session = chats.find(c => c.sessionId === sessionId);
        if (session) {
          if (role === 'admin') session.unreadAdmin = 0;
          if (role === 'client') session.unreadClient = 0;
          saveChats(chats);
          sendToSession(sessionId, { type: 'read_status_updated', sessionId, role });
        }
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
    service: 'Aveniq Core API Engine v2.0 (with Live Chat)',
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

// Admin check middleware
function requireAdmin(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (token === 'aveniq-admin-secret-2026') {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized. Admin authorization required.' });
}

// Chat API endpoints
app.get('/api/chat/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const chats = getChats();
  const session = chats.find(c => c.sessionId === sessionId);
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

// Client sends message via HTTP fallback
app.post('/api/chat/message', (req, res) => {
  const { sessionId, text, sender, clientName, clientEmail } = req.body;
  if (!sessionId || !text?.trim()) {
    return res.status(400).json({ success: false, error: 'Session ID and message text are required.' });
  }

  const chats = getChats();
  let session = chats.find(c => c.sessionId === sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      sessionId,
      clientName: clientName?.trim() || 'Visitor',
      clientEmail: clientEmail?.trim() || '',
      createdAt: now,
      updatedAt: now,
      unreadAdmin: sender === 'client' ? 1 : 0,
      unreadClient: sender === 'admin' ? 1 : 0,
      messages: []
    };
    chats.unshift(session);
  } else {
    if (clientName && session.clientName === 'Visitor') session.clientName = clientName.trim();
    if (clientEmail && !session.clientEmail) session.clientEmail = clientEmail.trim();
    session.updatedAt = now;
    if (sender === 'client') session.unreadAdmin = (session.unreadAdmin || 0) + 1;
    if (sender === 'admin') session.unreadClient = (session.unreadClient || 0) + 1;
  }

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sender: sender || 'client',
    text: text.trim(),
    timestamp: now
  };

  session.messages.push(newMsg);
  saveChats(chats);

  // Notify WebSockets
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

// Admin endpoints for chats
app.get('/api/admin/chats', requireAdmin, (req, res) => {
  const chats = getChats();
  res.json({ success: true, count: chats.length, chats });
});

app.post('/api/admin/reply', requireAdmin, (req, res) => {
  const { sessionId, text } = req.body;
  if (!sessionId || !text?.trim()) {
    return res.status(400).json({ success: false, error: 'Session ID and message text are required.' });
  }

  const chats = getChats();
  const session = chats.find(c => c.sessionId === sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Chat conversation not found' });
  }

  const now = new Date().toISOString();
  session.updatedAt = now;
  session.unreadClient = (session.unreadClient || 0) + 1;
  session.unreadAdmin = 0; // admin has answered

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sender: 'admin',
    text: text.trim(),
    timestamp: now
  };

  session.messages.push(newMsg);
  saveChats(chats);

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
  const chats = getChats();
  const filtered = chats.filter(c => c.sessionId !== sessionId);
  if (filtered.length === chats.length) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  saveChats(filtered);
  broadcastToRole('admin', { type: 'chat_deleted', sessionId });
  res.json({ success: true, message: 'Chat removed successfully' });
});

// Contact inquiries endpoints
app.get('/api/contact', (req, res) => {
  const msgs = getMessages();
  res.json({
    success: true,
    count: msgs.length,
    messages: msgs
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, company, service, budget, message, directMethod } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Please provide required fields: name, email, and project message.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.'
    });
  }

  const newId = 'AVQ-' + Math.floor(1000 + Math.random() * 9000);
  const newEntry = {
    id: newId,
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : 'Not provided',
    company: company ? company.trim() : 'Independent / Founder',
    service: service || 'Custom Software Engineering',
    budget: budget || 'Flexible',
    message: message.trim(),
    directMethod: directMethod || 'Standard Contact Form',
    status: 'New Inquiry',
    timestamp: new Date().toISOString()
  };

  const msgs = getMessages();
  msgs.unshift(newEntry);
  saveMessages(msgs);

  console.log(`[AVENIQ API] New inquiry received: ${newId} from ${newEntry.name} (${newEntry.email})`);

  res.status(201).json({
    success: true,
    id: newId,
    message: 'Thank you! Your inquiry has been transmitted directly to Aveniq leadership.',
    inquiry: newEntry
  });
});

app.delete('/api/contact/:id', (req, res) => {
  const { id } = req.params;
  const msgs = getMessages();
  const filtered = msgs.filter(m => m.id !== id);

  if (filtered.length === msgs.length) {
    return res.status(404).json({ success: false, error: 'Inquiry not found' });
  }

  saveMessages(filtered);
  res.json({ success: true, message: `Inquiry ${id} removed successfully.` });
});

// Software / Services Orders API
// Public order placement
app.post('/api/orders', (req, res) => {
  const { customerName, customerEmail, customerPhone, company, serviceId, serviceName, tier, timeline, requirements } = req.body;

  if (!customerName || !customerEmail || !serviceName) {
    return res.status(400).json({
      success: false,
      error: 'Please provide full name, work email, and selected service/package.'
    });
  }

  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  const newOrder = {
    id: orderId,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim(),
    customerPhone: customerPhone ? customerPhone.trim() : 'Not provided',
    company: company ? company.trim() : 'Independent / Founder',
    serviceId: serviceId || 'custom-engineering',
    serviceName: serviceName.trim(),
    tier: tier || 'Standard MVP',
    timeline: timeline || '4-8 Weeks',
    requirements: requirements ? requirements.trim() : 'No additional custom specs provided.',
    status: 'Pending Review',
    priority: 'Normal',
    createdAt: now
  };

  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  console.log(`[AVENIQ ORDERS] New Service Order: ${orderId} - ${newOrder.serviceName} by ${newOrder.customerName}`);

  // Broadcast live order event to all connected admin sockets
  broadcastToRole('admin', {
    type: 'new_order_placed',
    order: newOrder
  });

  res.status(201).json({
    success: true,
    orderId,
    message: 'Your service order has been successfully logged! Our engineering leads will review your specs and initiate onboarding.',
    order: newOrder
  });
});

// Admin get all orders
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = getOrders();
  res.json({
    success: true,
    count: orders.length,
    orders
  });
});

// Admin update order status (e.g. In Review, Confirmed, In Development, Completed, Cancelled)
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, priority, adminNotes } = req.body;
  const orders = getOrders();
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  if (status) order.status = status;
  if (priority) order.priority = priority;
  if (adminNotes !== undefined) order.adminNotes = adminNotes;
  order.updatedAt = new Date().toISOString();

  saveOrders(orders);
  broadcastToRole('admin', { type: 'order_status_updated', order });

  res.json({ success: true, message: `Order ${id} updated`, order });
});

// Admin delete order
app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const orders = getOrders();
  const filtered = orders.filter(o => o.id !== id);

  if (filtered.length === orders.length) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  saveOrders(filtered);
  broadcastToRole('admin', { type: 'order_deleted', id });
  res.json({ success: true, message: `Order ${id} removed successfully.` });
});

app.get('/api/stats', (req, res) => {
  const msgs = getMessages();
  const chats = getChats();
  const orders = getOrders();
  const totalInquiries = msgs.length;
  const newCount = msgs.filter(m => m.status === 'New Inquiry').length;
  const activeChats = chats.length;
  const unreadChats = chats.filter(c => (c.unreadAdmin || 0) > 0).length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending Review' || o.status === 'In Review').length;
  
  res.json({
    totalInquiries,
    pendingInquiries: newCount,
    activeChats,
    unreadChats,
    totalOrders,
    pendingOrders,
    averageResponseTime: '< 2 Hours',
    serverStatus: 'Optimal (100% Operational)',
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`⚡ Aveniq Backend Server & WebSocket running at http://localhost:${PORT}`);
});
