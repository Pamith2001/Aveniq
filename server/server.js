import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const messagesFile = path.join(dataDir, 'messages.json');

// Ensure data folder and messages.json exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Aveniq Core API Engine v1.0.0',
    environment: 'production-ready'
  });
});

// Get all contact inquiries (for the owner dashboard)
app.get('/api/contact', (req, res) => {
  const msgs = getMessages();
  res.json({
    success: true,
    count: msgs.length,
    messages: msgs
  });
});

// Submit a new contact inquiry
app.post('/api/contact', (req, res) => {
  const { name, email, phone, company, service, budget, message, directMethod } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Please provide required fields: name, email, and project message.'
    });
  }

  // Basic email validation
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
    message: 'Thank you! Your inquiry has been transmitted directly to Aveniq leadership. We will get back to you shortly.',
    inquiry: newEntry
  });
});

// Delete or archive inquiry (Owner action)
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

// Owner stats summary
app.get('/api/stats', (req, res) => {
  const msgs = getMessages();
  const total = msgs.length;
  const newCount = msgs.filter(m => m.status === 'New Inquiry').length;
  
  res.json({
    totalInquiries: total,
    pendingInquiries: newCount,
    averageResponseTime: '< 2 Hours',
    serverStatus: 'Optimal (100% Operational)',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`⚡ Aveniq Backend Server running at http://localhost:${PORT}`);
});
