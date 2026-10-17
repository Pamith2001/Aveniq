import { Hono } from 'hono';
import { cors } from 'hono/cors';

export class ChatRoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // webSocket -> { role: 'admin'|'client'|'unknown', sessionId: string }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      try {
        const payload = await request.json();
        if (payload?.sessionId) {
          this.sendToSession(payload.sessionId, payload);
        } else {
          this.broadcastToRole('admin', payload);
        }
      } catch (e) {
        console.error('Broadcast error:', e);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    await this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(ws) {
    ws.accept();
    this.sessions.set(ws, { role: 'unknown', sessionId: null });

    ws.addEventListener('message', async (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, payload } = parsed;

        if (type === 'auth_admin') {
          if (payload?.token === 'aveniq-admin-secret-2026') {
            this.sessions.set(ws, { role: 'admin', sessionId: null });
            
            // Fetch all chat sessions and messages from D1
            const { results: chatSessions } = await this.env.DB.prepare(
              'SELECT * FROM chat_sessions ORDER BY updatedAt DESC'
            ).all();

            const fullChats = [];
            for (const s of chatSessions || []) {
              const { results: msgs } = await this.env.DB.prepare(
                'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC'
              ).bind(s.sessionId).all();
              fullChats.push({ ...s, messages: msgs || [] });
            }

            ws.send(JSON.stringify({ type: 'auth_admin_success', chats: fullChats }));
          } else {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid admin credentials' }));
          }
        } else if (type === 'init_client') {
          const sessionId = payload?.sessionId || ('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
          this.sessions.set(ws, { role: 'client', sessionId });

          let session = await this.env.DB.prepare(
            'SELECT * FROM chat_sessions WHERE sessionId = ?'
          ).bind(sessionId).first();

          if (!session) {
            const now = new Date().toISOString();
            await this.env.DB.prepare(`
              INSERT INTO chat_sessions (sessionId, clientName, clientEmail, createdAt, updatedAt, unreadAdmin, unreadClient)
              VALUES (?, ?, ?, ?, ?, 0, 0)
            `).bind(sessionId, payload?.clientName || 'Visitor', payload?.clientEmail || '', now, now).run();

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
            this.broadcastToRole('admin', { type: 'new_chat_session', session });
          } else {
            const { results: messages } = await this.env.DB.prepare(
              'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC'
            ).bind(sessionId).all();
            session.messages = messages || [];
          }

          ws.send(JSON.stringify({ type: 'init_client_success', session }));
        } else if (type === 'chat_message' || type === 'send_message') {
          const { sessionId, text, sender, clientName, clientEmail } = payload || {};
          if (!sessionId || !text?.trim()) return;

          const now = new Date().toISOString();
          let session = await this.env.DB.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').bind(sessionId).first();

          if (!session) {
            await this.env.DB.prepare(`
              INSERT INTO chat_sessions (sessionId, clientName, clientEmail, createdAt, updatedAt, unreadAdmin, unreadClient)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              sessionId,
              clientName?.trim() || 'Visitor',
              clientEmail?.trim() || '',
              now,
              now,
              sender === 'client' ? 1 : 0,
              sender === 'admin' ? 1 : 0
            ).run();
          } else {
            const unreadAdminInc = sender === 'client' ? session.unreadAdmin + 1 : session.unreadAdmin;
            const unreadClientInc = sender === 'admin' ? session.unreadClient + 1 : session.unreadClient;
            const nameToUpdate = clientName && session.clientName === 'Visitor' ? clientName.trim() : session.clientName;
            const emailToUpdate = clientEmail && !session.clientEmail ? clientEmail.trim() : session.clientEmail;

            await this.env.DB.prepare(`
              UPDATE chat_sessions
              SET clientName = ?, clientEmail = ?, updatedAt = ?, unreadAdmin = ?, unreadClient = ?
              WHERE sessionId = ?
            `).bind(nameToUpdate, emailToUpdate, now, unreadAdminInc, unreadClientInc, sessionId).run();
          }

          const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await this.env.DB.prepare(`
            INSERT INTO chat_messages (id, sessionId, sender, text, timestamp)
            VALUES (?, ?, ?, ?, ?)
          `).bind(msgId, sessionId, sender || 'client', text.trim(), now).run();

          const updatedSession = await this.env.DB.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').bind(sessionId).first();

          const messageData = {
            type: 'new_message',
            sessionId,
            message: {
              id: msgId,
              sessionId,
              sender: sender || 'client',
              text: text.trim(),
              timestamp: now
            },
            sessionSummary: {
              sessionId: updatedSession.sessionId,
              clientName: updatedSession.clientName,
              clientEmail: updatedSession.clientEmail,
              updatedAt: updatedSession.updatedAt,
              unreadAdmin: updatedSession.unreadAdmin,
              unreadClient: updatedSession.unreadClient
            }
          };

          this.sendToSession(sessionId, messageData);
        } else if (type === 'mark_read') {
          const { sessionId, role } = payload || {};
          if (role === 'admin') {
            await this.env.DB.prepare('UPDATE chat_sessions SET unreadAdmin = 0 WHERE sessionId = ?').bind(sessionId).run();
          } else if (role === 'client') {
            await this.env.DB.prepare('UPDATE chat_sessions SET unreadClient = 0 WHERE sessionId = ?').bind(sessionId).run();
          }
          this.sendToSession(sessionId, { type: 'read_status_updated', sessionId, role });
        }
      } catch (err) {
        console.error('DO WebSocket message error:', err);
      }
    });

    const closeHandler = () => {
      this.sessions.delete(ws);
    };

    ws.addEventListener('close', closeHandler);
    ws.addEventListener('error', closeHandler);
  }

  broadcastToRole(role, payload) {
    const jsonStr = JSON.stringify(payload);
    for (const [ws, meta] of this.sessions.entries()) {
      try {
        if (meta && meta.role === role) {
          ws.send(jsonStr);
        }
      } catch (e) {
        this.sessions.delete(ws);
      }
    }
  }

  sendToSession(sessionId, payload) {
    const jsonStr = JSON.stringify(payload);
    for (const [ws, meta] of this.sessions.entries()) {
      try {
        if (meta && (meta.role === 'admin' || meta.sessionId === sessionId)) {
          ws.send(jsonStr);
        }
      } catch (e) {
        this.sessions.delete(ws);
      }
    }
  }
}

// ----------------------------------------------------
// HONO ROUTER FOR REST APIS
// ----------------------------------------------------
const app = new Hono();

app.use('*', cors());

// WebSocket Endpoint routed to Durable Object singleton
app.all('/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  const id = c.env.CHAT_ROOM.idFromName('GLOBAL_CHAT_ROOM');
  const chatRoom = c.env.CHAT_ROOM.get(id);
  return chatRoom.fetch(c.req.raw);
});

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Aveniq Cloudflare Worker Engine (Hono + D1 + Durable Objects)',
    environment: 'cloudflare-production'
  });
});

// Admin Auth check
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json();
  const expectedPassword = c.env.ADMIN_KEY || 'aveniq2026';
  if (password === expectedPassword) {
    return c.json({
      success: true,
      token: 'aveniq-admin-secret-2026',
      message: 'Admin authorization granted'
    });
  }
  return c.json({ success: false, error: 'Invalid admin credentials' }, 401);
});

const requireAdmin = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || c.req.query('token');
  if (token === 'aveniq-admin-secret-2026') {
    return await next();
  }
  return c.json({ success: false, error: 'Unauthorized. Admin authorization required.' }, 401);
};

// ==========================================
// CLIENT PORTAL
// ==========================================
app.post('/api/client/login', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ success: false, error: 'Please enter both username and password.' }, 400);
  }

  const client = await c.env.DB.prepare(
    'SELECT id, username, fullName, email, phone, company, createdAt FROM clients WHERE LOWER(username) = LOWER(?) AND password = ?'
  ).bind(username.trim(), password.trim()).first();

  if (!client) {
    return c.json({ success: false, error: 'Invalid client credentials. Please check with Aveniq admin.' }, 401);
  }

  const { results: projects } = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE clientId = ? ORDER BY lastUpdate DESC, startDate DESC'
  ).bind(client.id).all();

  return c.json({
    success: true,
    client,
    projects: projects || [],
    message: 'Login successful'
  });
});

app.get('/api/client/projects/:clientId', async (c) => {
  const clientId = c.req.param('clientId');
  const { results: projects } = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE clientId = ? ORDER BY lastUpdate DESC, startDate DESC'
  ).bind(clientId).all();

  return c.json({ success: true, count: (projects || []).length, projects: projects || [] });
});

// ==========================================
// ADMIN: CLIENT & PROJECT MANAGEMENT
// ==========================================
app.get('/api/admin/clients', requireAdmin, async (c) => {
  const { results: clientsList } = await c.env.DB.prepare(`
    SELECT c.*, COUNT(p.id) as projectCount, 
           COALESCE(AVG(p.progress), 0) as averageProgress
    FROM clients c
    LEFT JOIN projects p ON c.id = p.clientId
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `).all();

  return c.json({ success: true, count: (clientsList || []).length, clients: clientsList || [] });
});

app.post('/api/admin/clients', requireAdmin, async (c) => {
  const { username, password, fullName, email, phone, company } = await c.req.json();
  if (!username || !password || !fullName || !email) {
    return c.json({ success: false, error: 'Username, password, full name, and email are required.' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM clients WHERE LOWER(username) = LOWER(?)').bind(username.trim()).first();
  if (existing) {
    return c.json({ success: false, error: 'A client with this username already exists. Choose a different username.' }, 400);
  }

  const clientId = 'CLT-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO clients (id, username, password, fullName, email, phone, company, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    clientId,
    username.trim().toLowerCase(),
    password.trim(),
    fullName.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    company ? company.trim() : 'Independent Client',
    now
  ).run();

  const newClient = await c.env.DB.prepare('SELECT id, username, fullName, email, phone, company, createdAt FROM clients WHERE id = ?').bind(clientId).first();

  return c.json({
    success: true,
    message: 'Client account created successfully.',
    client: newClient
  }, 201);
});

app.delete('/api/admin/clients/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM projects WHERE clientId = ?').bind(id).run();
  const res = await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
  if (!res.meta.changes) {
    return c.json({ success: false, error: 'Client not found.' }, 404);
  }
  return c.json({ success: true, message: 'Client account removed.' });
});

app.get('/api/admin/projects', requireAdmin, async (c) => {
  const clientId = c.req.query('clientId');
  let projects;
  if (clientId) {
    const res = await c.env.DB.prepare(`
      SELECT p.*, c.fullName as clientName, c.company as clientCompany, c.username as clientUsername
      FROM projects p
      JOIN clients c ON p.clientId = c.id
      WHERE p.clientId = ?
      ORDER BY p.startDate DESC
    `).bind(clientId).all();
    projects = res.results;
  } else {
    const res = await c.env.DB.prepare(`
      SELECT p.*, c.fullName as clientName, c.company as clientCompany, c.username as clientUsername
      FROM projects p
      JOIN clients c ON p.clientId = c.id
      ORDER BY p.startDate DESC
    `).all();
    projects = res.results;
  }

  return c.json({ success: true, count: (projects || []).length, projects: projects || [] });
});

app.post('/api/admin/projects', requireAdmin, async (c) => {
  const { clientId, title, category, progress, status, startDate, targetEndDate, notes, lastUpdate } = await c.req.json();
  if (!clientId || !title) {
    return c.json({ success: false, error: 'Client selection and project title are required.' }, 400);
  }

  const client = await c.env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(clientId).first();
  if (!client) {
    return c.json({ success: false, error: 'Selected client does not exist.' }, 404);
  }

  const projectId = 'PRJ-' + Math.floor(100 + Math.random() * 900);
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO projects (id, clientId, title, category, progress, status, startDate, targetEndDate, notes, lastUpdate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
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
  ).run();

  const newProject = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first();
  return c.json({ success: true, message: 'Project created successfully.', project: newProject }, 201);
});

app.patch('/api/admin/projects/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const current = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!current) {
    return c.json({ success: false, error: 'Project not found.' }, 404);
  }

  const updatedProgress = body.progress !== undefined ? Math.min(100, Math.max(0, parseInt(body.progress, 10))) : current.progress;
  const updatedStatus = body.status || current.status;
  const updatedNotes = body.notes !== undefined ? body.notes : current.notes;
  const updatedLastUpdate = body.lastUpdate !== undefined ? body.lastUpdate : current.lastUpdate;
  const updatedEndDate = body.targetEndDate !== undefined ? body.targetEndDate : current.targetEndDate;
  const updatedTitle = body.title !== undefined ? body.title : current.title;
  const updatedCategory = body.category !== undefined ? body.category : current.category;
  const updatedStartDate = body.startDate !== undefined ? body.startDate : current.startDate;

  await c.env.DB.prepare(`
    UPDATE projects
    SET progress = ?, status = ?, notes = ?, lastUpdate = ?, targetEndDate = ?, title = ?, category = ?, startDate = ?
    WHERE id = ?
  `).bind(updatedProgress, updatedStatus, updatedNotes, updatedLastUpdate, updatedEndDate, updatedTitle, updatedCategory, updatedStartDate, id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return c.json({ success: true, message: 'Project progress updated.', project: updated });
});

app.delete('/api/admin/projects/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const res = await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  if (!res.meta.changes) {
    return c.json({ success: false, error: 'Project not found.' }, 404);
  }
  return c.json({ success: true, message: 'Project removed.' });
});

// ==========================================
// CHAT API (REST FALLBACKS)
// ==========================================
app.get('/api/chat/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = await c.env.DB.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').bind(sessionId).first();
  if (!session) {
    return c.json({
      success: true,
      session: {
        sessionId,
        clientName: 'Visitor',
        clientEmail: '',
        messages: []
      }
    });
  }

  const { results: messages } = await c.env.DB.prepare(
    'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC'
  ).bind(sessionId).all();

  return c.json({ success: true, session: { ...session, messages: messages || [] } });
});

app.post('/api/chat/message', async (c) => {
  const { sessionId, text, sender, clientName, clientEmail } = await c.req.json();
  if (!sessionId || !text?.trim()) {
    return c.json({ success: false, error: 'Session ID and message text are required.' }, 400);
  }

  const now = new Date().toISOString();
  let session = await c.env.DB.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').bind(sessionId).first();

  if (!session) {
    await c.env.DB.prepare(`
      INSERT INTO chat_sessions (sessionId, clientName, clientEmail, createdAt, updatedAt, unreadAdmin, unreadClient)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      clientName?.trim() || 'Visitor',
      clientEmail?.trim() || '',
      now,
      now,
      sender === 'client' ? 1 : 0,
      sender === 'admin' ? 1 : 0
    ).run();
  } else {
    const unreadAdminInc = sender === 'client' ? session.unreadAdmin + 1 : session.unreadAdmin;
    const unreadClientInc = sender === 'admin' ? session.unreadClient + 1 : session.unreadClient;
    const nameToUpdate = clientName && session.clientName === 'Visitor' ? clientName.trim() : session.clientName;
    const emailToUpdate = clientEmail && !session.clientEmail ? clientEmail.trim() : session.clientEmail;

    await c.env.DB.prepare(`
      UPDATE chat_sessions
      SET clientName = ?, clientEmail = ?, updatedAt = ?, unreadAdmin = ?, unreadClient = ?
      WHERE sessionId = ?
    `).bind(nameToUpdate, emailToUpdate, now, unreadAdminInc, unreadClientInc, sessionId).run();
  }

  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  await c.env.DB.prepare(`
    INSERT INTO chat_messages (id, sessionId, sender, text, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).bind(msgId, sessionId, sender || 'client', text.trim(), now).run();

  const updatedSession = await c.env.DB.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').bind(sessionId).first();
  const newMsg = {
    id: msgId,
    sessionId,
    sender: sender || 'client',
    text: text.trim(),
    timestamp: now
  };

  // Broadcast to live Durable Object WebSocket clients if available
  try {
    const id = c.env.CHAT_ROOM.idFromName('GLOBAL_CHAT_ROOM');
    const chatRoom = c.env.CHAT_ROOM.get(id);
    await chatRoom.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'new_message',
        sessionId,
        message: newMsg,
        sessionSummary: updatedSession
      })
    }));
  } catch (err) {
    // DO broadcast optional
  }

  return c.json({ success: true, message: newMsg, session: updatedSession }, 201);
});

app.post('/api/admin/reply', requireAdmin, async (c) => {
  const { sessionId, text } = await c.req.json();
  if (!sessionId || !text?.trim()) {
    return c.json({ success: false, error: 'Session ID and message text are required.' }, 400);
  }

  const now = new Date().toISOString();
  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  await c.env.DB.prepare(`
    INSERT INTO chat_messages (id, sessionId, sender, text, timestamp)
    VALUES (?, ?, 'admin', ?, ?)
  `).bind(msgId, sessionId, text.trim(), now).run();

  await c.env.DB.prepare('UPDATE chat_sessions SET unreadAdmin = 0, updatedAt = ? WHERE sessionId = ?').bind(now, sessionId).run();
  const session = await c.env.DB.prepare('SELECT * FROM chat_sessions WHERE sessionId = ?').bind(sessionId).first();

  const newMsg = {
    id: msgId,
    sessionId,
    sender: 'admin',
    text: text.trim(),
    timestamp: now
  };

  try {
    const id = c.env.CHAT_ROOM.idFromName('GLOBAL_CHAT_ROOM');
    const chatRoom = c.env.CHAT_ROOM.get(id);
    await chatRoom.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'new_message',
        sessionId,
        message: newMsg,
        sessionSummary: session
      })
    }));
  } catch (err) {
    // Optional
  }

  return c.json({ success: true, message: newMsg, session });
});

app.get('/api/admin/chats', requireAdmin, async (c) => {
  const { results: chatSessions } = await c.env.DB.prepare(
    'SELECT * FROM chat_sessions ORDER BY updatedAt DESC'
  ).all();

  const fullChats = [];
  for (const s of chatSessions || []) {
    const { results: msgs } = await c.env.DB.prepare(
      'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC'
    ).bind(s.sessionId).all();
    fullChats.push({ ...s, messages: msgs || [] });
  }

  return c.json({ success: true, count: fullChats.length, chats: fullChats });
});

app.delete('/api/admin/chats/:sessionId', requireAdmin, async (c) => {
  const sessionId = c.req.param('sessionId');
  await c.env.DB.prepare('DELETE FROM chat_messages WHERE sessionId = ?').bind(sessionId).run();
  await c.env.DB.prepare('DELETE FROM chat_sessions WHERE sessionId = ?').bind(sessionId).run();
  return c.json({ success: true, message: 'Chat removed successfully' });
});

// ==========================================
// INQUIRIES & ORDERS
// ==========================================
app.get('/api/contact', async (c) => {
  const { results: msgs } = await c.env.DB.prepare('SELECT * FROM inquiries ORDER BY timestamp DESC').all();
  return c.json({
    success: true,
    count: (msgs || []).length,
    messages: msgs || []
  });
});

app.post('/api/contact', async (c) => {
  const { name, email, phone, company, service, message } = await c.req.json();
  if (!name || !email || !message) {
    return c.json({
      success: false,
      error: 'Please provide name, email, and project message.'
    }, 400);
  }

  const newId = 'AVQ-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO inquiries (id, name, email, phone, company, service, message, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newId,
    name.trim(),
    email.trim(),
    phone ? phone.trim() : 'Not provided',
    company ? company.trim() : 'Independent / Business',
    service || 'Web & Mobile App Development',
    message.trim(),
    now
  ).run();

  const newEntry = await c.env.DB.prepare('SELECT * FROM inquiries WHERE id = ?').bind(newId).first();
  return c.json({
    success: true,
    id: newId,
    message: 'Thank you! Your message has been sent to Aveniq team.',
    inquiry: newEntry
  }, 201);
});

app.delete('/api/contact/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: `Inquiry ${id} removed.` });
});

// Orders
app.post('/api/orders', async (c) => {
  const { customerName, customerEmail, customerPhone, company, serviceId, serviceName, tier, timeline, requirements } = await c.req.json();
  if (!customerName || !customerEmail || !serviceName) {
    return c.json({
      success: false,
      error: 'Please provide full name, email, and selected service.'
    }, 400);
  }

  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO orders (id, customerName, customerEmail, customerPhone, company, serviceId, serviceName, tier, timeline, requirements, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review', ?)
  `).bind(
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
  ).run();

  const newOrder = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  return c.json({
    success: true,
    orderId,
    message: 'Your service order has been placed successfully!',
    order: newOrder
  }, 201);
});

app.get('/api/admin/orders', requireAdmin, async (c) => {
  const { results: orders } = await c.env.DB.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
  return c.json({ success: true, count: (orders || []).length, orders: orders || [] });
});

app.patch('/api/admin/orders/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  await c.env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, id).run();
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return c.json({ success: true, message: `Order ${id} updated`, order });
});

app.delete('/api/admin/orders/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: `Order ${id} removed.` });
});

// ==========================================
// SHOWCASES
// ==========================================
app.get('/api/showcases', async (c) => {
  const { results: showcases } = await c.env.DB.prepare('SELECT * FROM showcases ORDER BY createdAt DESC').all();
  return c.json({ success: true, count: (showcases || []).length, showcases: showcases || [] });
});

app.post('/api/admin/showcases', requireAdmin, async (c) => {
  let { name, url, description, tag } = await c.req.json();
  if (!name || !url) {
    return c.json({ success: false, error: 'Website name and hosted link are required.' }, 400);
  }

  let formattedUrl = url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const id = 'sc_' + Date.now();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO showcases (id, name, url, description, tag, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, name.trim(), formattedUrl, (description || '').trim(), (tag || 'Web Project').trim(), now).run();

  const newShowcase = await c.env.DB.prepare('SELECT * FROM showcases WHERE id = ?').bind(id).first();
  return c.json({
    success: true,
    message: 'Showcase project added successfully!',
    showcase: newShowcase
  }, 201);
});

app.delete('/api/admin/showcases/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM showcases WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: `Showcase project ${id} removed.` });
});

// Admin stats summary
app.get('/api/stats', async (c) => {
  const inquiriesCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM inquiries').first())?.count || 0;
  const chatsCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM chat_sessions').first())?.count || 0;
  const unreadChats = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM chat_sessions WHERE unreadAdmin > 0').first())?.count || 0;
  const ordersCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM orders').first())?.count || 0;
  const pendingOrders = (await c.env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending Review'").first())?.count || 0;
  const clientsCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM clients').first())?.count || 0;
  const activeProjects = (await c.env.DB.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'Completed'").first())?.count || 0;

  return c.json({
    totalInquiries: inquiriesCount,
    activeChats: chatsCount,
    unreadChats,
    totalOrders: ordersCount,
    pendingOrders,
    totalClients: clientsCount,
    activeProjects,
    serverStatus: 'Optimal (100% Operational on Cloudflare Edge)',
    timestamp: new Date().toISOString()
  });
});

export default app;
