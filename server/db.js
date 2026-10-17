import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'aveniq.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrent reliability
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'In Progress',
    startDate TEXT,
    targetEndDate TEXT,
    notes TEXT,
    lastUpdate TEXT,
    FOREIGN KEY(clientId) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    sessionId TEXT PRIMARY KEY,
    clientName TEXT,
    clientEmail TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    unreadAdmin INTEGER DEFAULT 0,
    unreadClient INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(sessionId) REFERENCES chat_sessions(sessionId) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    service TEXT,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerName TEXT NOT NULL,
    customerEmail TEXT NOT NULL,
    customerPhone TEXT,
    company TEXT,
    serviceId TEXT,
    serviceName TEXT NOT NULL,
    tier TEXT,
    timeline TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'Pending Review',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS showcases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    tag TEXT,
    createdAt TEXT NOT NULL
  );
`);

// Seed default showcases if none exist
const showcaseCount = db.prepare('SELECT COUNT(*) as count FROM showcases').get().count;
if (showcaseCount === 0) {
  const insertShowcase = db.prepare(`
    INSERT INTO showcases (id, name, url, description, tag, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  insertShowcase.run('sc_1', 'Stripe Docs & Developer Portal', 'https://docs.stripe.com', 'Next-gen payment infrastructure documentation and dashboard experience.', 'FinTech', now);
  insertShowcase.run('sc_2', 'Vite Next Generation Frontend', 'https://vite.dev', 'Modern blazing fast frontend tooling and dev environment.', 'Developer Tools', now);
  insertShowcase.run('sc_3', 'Tailwind CSS Modern Engine', 'https://tailwindcss.com', 'Modern utility-first CSS framework and UI design system showcase.', 'Web Platform', now);
}

// Seed default demo client & project if none exist
const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
if (clientCount === 0) {
  const insertClient = db.prepare(`
    INSERT INTO clients (id, username, password, fullName, email, phone, company, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProject = db.prepare(`
    INSERT INTO projects (id, clientId, title, category, progress, status, startDate, targetEndDate, notes, lastUpdate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoClientId = 'client_demo_01';
  insertClient.run(
    demoClientId,
    'sunil',
    'pass123',
    'Sunil Perera',
    'sunil@pereratraders.lk',
    '+94 77 987 6543',
    'Perera Wholesale Traders (Pvt) Ltd',
    new Date(Date.now() - 3600000 * 24 * 7).toISOString()
  );

  insertProject.run(
    'PRJ-101',
    demoClientId,
    'Inventory & POS Billing System',
    'Custom Business Software',
    65,
    'In Development',
    '2026-10-01',
    '2026-10-28',
    'Database structure completed. Currently integrating thermal receipt printing and barcode scanner module.',
    'Thermal printing API hooked and testing inventory deduction.'
  );

  insertProject.run(
    'PRJ-102',
    demoClientId,
    'Corporate E-Commerce Web Store',
    'Web & Online Store',
    30,
    'Design Phase',
    '2026-10-10',
    '2026-11-15',
    'Figma mockups approved. Frontend React layout being coded with PayHere gateway integration.',
    'Mobile responsive navigation and product catalog cards configured.'
  );
}

// Seed demo chats if empty
const chatCount = db.prepare('SELECT COUNT(*) as count FROM chat_sessions').get().count;
if (chatCount === 0) {
  const sessId = 'demo-session-client-1';
  db.prepare(`
    INSERT INTO chat_sessions (sessionId, clientName, clientEmail, createdAt, updatedAt, unreadAdmin, unreadClient)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessId,
    'David Vance',
    'dvance@apexcapital.org',
    new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    1,
    0
  );

  const insertMsg = db.prepare(`
    INSERT INTO chat_messages (id, sessionId, sender, text, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertMsg.run('msg_1', sessId, 'client', 'Hello, we are looking for a dedicated software development team in Sri Lanka.', new Date(Date.now() - 1000 * 60 * 30).toISOString());
  insertMsg.run('msg_2', sessId, 'admin', 'Hi David! Thank you for reaching out. We specialize in custom business web systems and POS solutions. What is your requirement?', new Date(Date.now() - 1000 * 60 * 20).toISOString());
  insertMsg.run('msg_3', sessId, 'client', 'We need an inventory management system with automated invoicing.', new Date(Date.now() - 1000 * 60 * 15).toISOString());
}

export default db;
