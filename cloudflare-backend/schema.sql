-- Cloudflare D1 Migration for Aveniq

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

-- Initial seed data
INSERT OR IGNORE INTO showcases (id, name, url, description, tag, createdAt) VALUES 
('sc_1', 'Stripe Docs & Developer Portal', 'https://docs.stripe.com', 'Next-gen payment infrastructure documentation and dashboard experience.', 'FinTech', '2026-10-17T00:00:00.000Z'),
('sc_2', 'Vite Next Generation Frontend', 'https://vite.dev', 'Modern blazing fast frontend tooling and dev environment.', 'Developer Tools', '2026-10-17T00:00:00.000Z'),
('sc_3', 'Tailwind CSS Modern Engine', 'https://tailwindcss.com', 'Modern utility-first CSS framework and UI design system showcase.', 'Web Platform', '2026-10-17T00:00:00.000Z');

INSERT OR IGNORE INTO clients (id, username, password, fullName, email, phone, company, createdAt) VALUES
('client_demo_01', 'sunil', 'pass123', 'Sunil Perera', 'sunil@pereratraders.lk', '+94 77 987 6543', 'Perera Wholesale Traders (Pvt) Ltd', '2026-10-10T12:00:00.000Z');

INSERT OR IGNORE INTO projects (id, clientId, title, category, progress, status, startDate, targetEndDate, notes, lastUpdate) VALUES
('PRJ-101', 'client_demo_01', 'Inventory & POS Billing System', 'Custom Business Software', 65, 'In Development', '2026-10-01', '2026-10-28', 'Database structure completed. Currently integrating thermal receipt printing and barcode scanner module.', 'Thermal printing API hooked and testing inventory deduction.'),
('PRJ-102', 'client_demo_01', 'Corporate E-Commerce Web Store', 'Web & Online Store', 30, 'Design Phase', '2026-10-10', '2026-11-15', 'Figma mockups approved. Frontend React layout being coded with PayHere gateway integration.', 'Mobile responsive navigation and product catalog cards configured.');
