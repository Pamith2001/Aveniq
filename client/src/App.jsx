import { useState, useEffect, useRef } from 'react';
import logoDark from './assets/logo-dark.jpg';
import logoLight from './assets/logo-light.jpg';
import './App.css';

// Direct Contact details for the Startup Owner
const OWNER_CONTACT = {
  phoneDisplay: '+1 (800) 849-AVENIQ',
  phoneCall: '+18008492836',
  whatsappNumber: '18008492836',
  email: 'founder@aveniq.io',
  office: 'Silicon Valley, CA • Global Engineering Hub'
};

const SERVICES_DATA = [
  {
    id: 'ai-agents',
    name: 'Autonomous AI & LLM Systems',
    icon: '⚡',
    summary: 'Custom intelligent agents, domain-tuned LLMs, neural search engines, and automated multi-agent workflow orchestration.',
    features: ['Custom RAG & Multi-Agent Pipelines', 'Fine-tuned LLM Deployment', 'Autonomous Data Extraction', 'Real-time Vector Search'],
    tech: ['PyTorch', 'LangChain', 'Llama 3', 'Pinecone']
  },
  {
    id: 'cloud-saas',
    name: 'Cloud-Native SaaS Platforms',
    icon: '☁️',
    summary: 'High-throughput, multi-tenant enterprise software architectures built for 99.999% uptime and hyper-scale resilience.',
    features: ['Kubernetes Microservices', 'Serverless Edge Functions', 'Zero-Downtime CI/CD', 'Automated Horizontal Scaling'],
    tech: ['Docker', 'AWS / GCP', 'Terraform', 'Go / Node']
  },
  {
    id: 'web-mobile',
    name: 'Next-Gen Web & Mobile Apps',
    icon: '🚀',
    summary: 'Ultra-fluid, high-performance cross-platform software with responsive design, instant reactivity, and biometric security.',
    features: ['React & Next.js Ecosystems', 'React Native / Flutter Apps', 'Offline-First Architectures', 'Sub-millisecond State Sync'],
    tech: ['React 19', 'TypeScript', 'Tailwind', 'GraphQL']
  },
  {
    id: 'data-pipelines',
    name: 'Real-Time Streaming & Big Data',
    icon: '📊',
    summary: 'Distributed event-driven data streaming pipelines that ingest millions of events per second with real-time analytics.',
    features: ['Apache Kafka Event Buses', 'Real-time WebSocket Feeds', 'Data Lakehouse Architecture', 'Automated ETL Pipelines'],
    tech: ['Kafka', 'ClickHouse', 'PostgreSQL', 'Redis']
  },
  {
    id: 'cybersecurity',
    name: 'Zero-Trust Cyber Architecture',
    icon: '🛡️',
    summary: 'Military-grade end-to-end encryption, automated vulnerability scanners, identity federation, and SOC2/HIPAA compliance.',
    features: ['Zero-Trust Network Access', 'OAuth 2.1 & Passkey Auth', 'Penetration Testing & Hardening', 'Audit Trail Automation'],
    tech: ['mTLS', 'Vault', 'OpenID Connect', 'OWASP']
  },
  {
    id: 'devops-infra',
    name: 'DevOps & Infrastructure Automation',
    icon: '⚙️',
    summary: 'Automate deployment pipelines, infrastructure as code, continuous observability, and self-healing cluster operations.',
    features: ['GitOps Deployment Pipelines', 'Prometheus & Grafana Telemetry', 'Cost Optimization Auditing', 'Disaster Recovery Protocols'],
    tech: ['ArgoCD', 'Prometheus', 'Helm', 'Datadog']
  }
];

const TECH_STACK = [
  { category: 'Frontend', items: ['React 19', 'Next.js 15', 'TypeScript', 'Vite', 'WebAssembly', 'Tailwind CSS'] },
  { category: 'Backend & APIs', items: ['Node.js', 'Go (Golang)', 'Python FastApi', 'Rust', 'GraphQL', 'gRPC'] },
  { category: 'AI & Data', items: ['PyTorch', 'OpenAI / Claude APIs', 'PostgreSQL', 'Redis', 'Milvus / Pinecone', 'Kafka'] },
  { category: 'Cloud & Infrastructure', items: ['Kubernetes', 'Docker', 'AWS / Google Cloud', 'Terraform', 'Cloudflare Workers', 'GitHub Actions'] }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);
  const phrases = [
    'Autonomous AI & Intelligent Agents',
    'Hyper-Scalable Cloud Microservices',
    'Mission-Critical Enterprise SaaS',
    'High-Velocity Software Engineering'
  ];

  // Estimator State
  const [estService, setEstService] = useState('Enterprise SaaS Platform');
  const [estScale, setEstScale] = useState('Growth Enterprise');
  const [estTimeline, setEstTimeline] = useState('8-12 Weeks');

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: 'Autonomous AI & LLM Systems',
    budget: '$15,000 - $35,000',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null, refId: null });

  // Backend Health & Status
  const [serverHealth, setServerHealth] = useState({ online: true, latency: '12ms', uptime: '99.99%' });
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Canvas Ref for futuristic neural background
  const canvasRef = useRef(null);

  // Theme synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Dynamic headline rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Ping backend server for health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const start = performance.now();
        const res = await fetch('/api/health');
        const end = performance.now();
        if (res.ok) {
          const data = await res.json();
          setServerHealth({
            online: true,
            latency: `${Math.round(end - start)}ms`,
            uptime: `${(data.uptime / 60).toFixed(1)} mins active`
          });
        }
      } catch (err) {
        setServerHealth({ online: false, latency: 'Offline', uptime: 'N/A' });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Interactive Neural Particle Grid in Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const count = Math.min(width > 768 ? 65 : 30, 80);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.2
      });
    }

    let mouse = { x: null, y: null };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';
      const nodeColor = isDark ? 'rgba(0, 229, 255, 0.7)' : 'rgba(0, 163, 196, 0.8)';
      const lineColor = isDark ? 'rgba(0, 229, 255, 0.08)' : 'rgba(0, 163, 196, 0.08)';
      const mouseLineColor = isDark ? 'rgba(41, 121, 255, 0.25)' : 'rgba(41, 121, 255, 0.2)';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Connect to mouse
        if (mouse.x !== null) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 160) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = mouseLineColor;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  // Toggle Theme: Dark / Light
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Submit Contact Form to Backend
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null, refId: null });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit project request.');
      }

      setFormStatus({
        loading: false,
        success: true,
        error: null,
        refId: data.id
      });

      // Clear fields
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        service: 'Autonomous AI & LLM Systems',
        budget: '$15,000 - $35,000',
        message: ''
      });
    } catch (err) {
      setFormStatus({
        loading: false,
        success: false,
        error: err.message || 'Transmission error. Please contact directly via WhatsApp or phone.',
        refId: null
      });
    }
  };

  // Fetch owner inquiries from backend
  const fetchInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const res = await fetch('/api/contact');
      const data = await res.json();
      if (data.success) {
        setInquiries(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const handleOpenOwnerModal = () => {
    setOwnerModalOpen(true);
    fetchInquiries();
  };

  const handleDeleteInquiry = async (id) => {
    try {
      const res = await fetch(`/api/contact/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInquiries((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  // WhatsApp direct link generator
  const getWhatsAppLink = (customMsg) => {
    const msg = customMsg || `Hello Aveniq Leadership! I am interested in building a software solution with your team. Could we discuss availability?`;
    return `https://wa.me/${OWNER_CONTACT.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  // Transfer Estimator to Contact Form
  const applyEstimateToForm = () => {
    setFormData((prev) => ({
      ...prev,
      service: estService,
      budget: estScale === 'Startup MVP' ? '$10,000 - $25,000' : estScale === 'Growth Enterprise' ? '$30,000 - $65,000' : '$75,000+',
      message: `Project Requirement: ${estService} at ${estScale} scale. Desired timeline: ${estTimeline}. Please provide an architecture proposal and discovery roadmap.`
    }));
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Current active logo based on theme
  const currentLogo = theme === 'dark' ? logoDark : logoLight;

  return (
    <div className="aveniq-app">
      {/* Background Cyber Effect */}
      <div className="cyber-bg-overlay"></div>

      {/* ====================================================================
          Navigation Bar
          ==================================================================== */}
      <header className="navbar">
        <div className="container nav-container">
          <a href="#" className="nav-brand" id="brand-home-link">
            <div className="brand-logo-frame">
              <img
                src={currentLogo}
                alt={theme === 'dark' ? 'Aveniq Dark Logo' : 'Aveniq Light Logo'}
                className="brand-logo-img"
              />
            </div>
            <div>
              <span className="brand-title">AVENIQ</span>
              <span className="brand-tag">SOFTWARE SYSTEMS</span>
            </div>
          </a>

          <nav>
            <ul className="nav-links">
              <li><a href="#services" className="nav-link">Services</a></li>
              <li><a href="#estimator" className="nav-link">Architecture Estimator</a></li>
              <li><a href="#tech-stack" className="nav-link">Tech Radar</a></li>
              <li><a href="#owner-connect" className="nav-link">Direct Owner Contact</a></li>
              <li><a href="#contact" className="nav-link">Start Project</a></li>
            </ul>
          </nav>

          <div className="nav-actions">
            {/* Dark / Light Mode Switch */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              id="theme-toggle-btn"
              title="Toggle Dark / Light Mode"
            >
              {theme === 'dark' ? (
                <>
                  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Owner Leads Dashboard Quick Toggle */}
            <button
              onClick={handleOpenOwnerModal}
              className="btn-owner-badge"
              id="owner-portal-btn"
              title="View Client Inquiries Stored in Backend"
            >
              🔒 Owner Portal
            </button>

            <a href="#contact" className="btn btn-primary" id="nav-cta-btn" style={{ padding: '9px 18px', fontSize: '0.88rem' }}>
              Launch Project
            </a>
          </div>
        </div>
      </header>

      {/* ====================================================================
          Hero Section
          ==================================================================== */}
      <section className="hero-section" id="hero">
        <canvas ref={canvasRef} className="hero-canvas"></canvas>
        <div className="container hero-grid">
          <div>
            <div className="hero-badge-row">
              <span className="badge-pill">
                <span className="pulse-dot"></span>
                Next-Gen Startup Software Lab
              </span>
            </div>

            <h1 className="hero-title">
              Engineering <span className="gradient-text glow-text">Autonomous Software</span> for Tomorrow's Giants
            </h1>

            <p className="hero-subtext">
              Aveniq architects mission-critical digital systems, high-velocity cloud infrastructures, and domain-intelligent AI agents designed for boundless scale.
            </p>

            <div className="hero-cta-group">
              <a href="#contact" className="btn btn-primary" id="hero-get-started-btn">
                <span>Start Your Architecture</span>
                <span>→</span>
              </a>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-accent"
                id="hero-whatsapp-btn"
              >
                <span>💬 Direct WhatsApp Owner</span>
              </a>

              <a href="#estimator" className="btn btn-secondary" id="hero-estimate-btn">
                <span>⚡ Project Estimator</span>
              </a>
            </div>

            <div className="hero-metrics-bar">
              <div className="metric-item">
                <span className="metric-value">99.99%</span>
                <span className="metric-label">System Reliability</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">10x</span>
                <span className="metric-label">Deployment Velocity</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">&lt; 2 Hrs</span>
                <span className="metric-label">Founder Direct SLA</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hologram Centerpiece */}
          <div className="hero-visual-card">
            <div className="hero-hologram-header">
              <div className="sys-status-badge">
                <span className="pulse-dot"></span>
                <span>NODE-US-EAST // CORE ACTIVE</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                LATENCY: {serverHealth.latency}
              </span>
            </div>

            <div className="hero-logo-centerpiece">
              <div className="hologram-logo-ring">
                <img
                  src={currentLogo}
                  alt={theme === 'dark' ? 'Aveniq Dark Hologram' : 'Aveniq Light Hologram'}
                />
              </div>
              <h3 style={{ marginTop: '20px', fontSize: '1.4rem', letterSpacing: '0.08em' }} className="gradient-text">
                AVENIQ OS v2.6
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                {phrases[activePhraseIndex]}
              </p>
            </div>

            <div className="hero-telemetry-grid">
              <div className="telemetry-node">
                <div className="telemetry-title">API Gateways</div>
                <div className="telemetry-val">
                  <span style={{ color: '#00E5FF' }}>●</span> 100% Operational
                </div>
              </div>
              <div className="telemetry-node">
                <div className="telemetry-title">Backend Status</div>
                <div className="telemetry-val">
                  <span style={{ color: serverHealth.online ? '#25D366' : '#ef4444' }}>●</span>
                  {serverHealth.online ? 'Online (Port 5000)' : 'Offline'}
                </div>
              </div>
              <div className="telemetry-node">
                <div className="telemetry-title">Data Throughput</div>
                <div className="telemetry-val">4.8 GB/sec</div>
              </div>
              <div className="telemetry-node">
                <div className="telemetry-title">Security Model</div>
                <div className="telemetry-val">Zero-Trust AES-256</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Services Section
          ==================================================================== */}
      <section className="section" id="services">
        <div className="container">
          <div className="section-header">
            <span className="badge-pill">Capabilities</span>
            <h2 className="section-title">
              Futuristic Engineering Across the <span className="gradient-text">Entire Software Stack</span>
            </h2>
            <p className="section-desc">
              From autonomous reasoning agents to battle-tested microservice clusters, we build custom digital powerhouses engineered for high performance.
            </p>
          </div>

          <div className="services-grid">
            {SERVICES_DATA.map((srv) => (
              <div key={srv.id} className="glass-card service-card">
                <div className="service-card-icon">{srv.icon}</div>
                <h3 className="service-name">{srv.name}</h3>
                <p className="service-summary">{srv.summary}</p>
                <ul className="service-features-list">
                  {srv.features.map((feat, idx) => (
                    <li key={idx} className="service-feature-item">
                      <span className="check-dot">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <div className="service-tech-pills">
                  {srv.tech.map((t, idx) => (
                    <span key={idx} className="tech-tag">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          Interactive Architecture Estimator
          ==================================================================== */}
      <section className="section" id="estimator" style={{ background: 'var(--bg-surface)' }}>
        <div className="container">
          <div className="section-header">
            <span className="badge-pill">Interactive Scoper</span>
            <h2 className="section-title">
              Estimate Your <span className="gradient-text">Software Architecture Scope</span>
            </h2>
            <p className="section-desc">
              Configure your system requirements to preview engineering timelines, architecture blueprints, and budget expectations.
            </p>
          </div>

          <div className="estimator-container">
            <div className="glass-card calc-panel">
              <div className="calc-group">
                <label className="calc-label">1. Primary System Architecture</label>
                <div className="pill-selector-row">
                  {['Autonomous AI & Agents', 'Enterprise SaaS Platform', 'High-Speed Web/Mobile', 'Cloud Data Lake'].map((srv) => (
                    <button
                      key={srv}
                      type="button"
                      className={`select-pill-btn ${estService === srv ? 'active' : ''}`}
                      onClick={() => setEstService(srv)}
                    >
                      {srv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="calc-group">
                <label className="calc-label">2. Target Deployment Scale</label>
                <div className="pill-selector-row">
                  {['Startup MVP', 'Growth Enterprise', 'Tier-1 High Availability'].map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      className={`select-pill-btn ${estScale === scale ? 'active' : ''}`}
                      onClick={() => setEstScale(scale)}
                    >
                      {scale}
                    </button>
                  ))}
                </div>
              </div>

              <div className="calc-group">
                <label className="calc-label">3. Target Velocity & Timeline</label>
                <div className="pill-selector-row">
                  {['Rapid Sprint (4-6 Wks)', 'Standard (8-12 Wks)', 'Enterprise Phased (16+ Wks)'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`select-pill-btn ${estTimeline === t ? 'active' : ''}`}
                      onClick={() => setEstTimeline(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Estimator Summary Output */}
            <div className="glass-card calc-summary-card">
              <h3 className="summary-headline">Architecture Forecast</h3>
              <div className="estimate-output-box">
                <div className="est-amount">
                  {estScale === 'Startup MVP' ? '$15k - $28k' : estScale === 'Growth Enterprise' ? '$35k - $65k' : '$75k - $140k+'}
                </div>
                <div className="est-timeline">Estimated Roadmap: {estTimeline}</div>
              </div>

              <ul className="est-deliverables">
                <li className="est-deliverable-item">
                  <span style={{ color: 'var(--brand-cyan)' }}>✦</span>
                  <span>Fully modular, clean React/Node/Cloud codebase</span>
                </li>
                <li className="est-deliverable-item">
                  <span style={{ color: 'var(--brand-cyan)' }}>✦</span>
                  <span>Automated CI/CD deployment pipeline with Docker</span>
                </li>
                <li className="est-deliverable-item">
                  <span style={{ color: 'var(--brand-cyan)' }}>✦</span>
                  <span>Dedicated direct channel with Aveniq Founding Team</span>
                </li>
                <li className="est-deliverable-item">
                  <span style={{ color: 'var(--brand-cyan)' }}>✦</span>
                  <span>100% IP ownership and comprehensive architecture docs</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={applyEstimateToForm}
                className="btn btn-primary"
                style={{ width: '100%' }}
                id="apply-estimate-btn"
              >
                Transfer to Direct Inquiry →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Tech Radar
          ==================================================================== */}
      <section className="section" id="tech-stack">
        <div className="container">
          <div className="section-header">
            <span className="badge-pill">Battle-Tested Stack</span>
            <h2 className="section-title">
              Our Modern <span className="gradient-text">Technology Radar</span>
            </h2>
            <p className="section-desc">
              We leverage modern runtimes, typed languages, and high-performance infrastructure to ensure uncompromised speed and reliability.
            </p>
          </div>

          <div className="radar-grid">
            {TECH_STACK.map((category) => (
              <div key={category.category} className="glass-card tech-node-card">
                <span className="tech-node-badge">{category.category}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {category.items.map((tech) => (
                    <div
                      key={tech}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{tech}</span>
                      <span style={{ color: 'var(--brand-cyan)', fontSize: '0.75rem' }}>Active</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          Direct Owner Connect & Contact Section
          ==================================================================== */}
      <section className="section" id="contact">
        <div className="container">
          <div className="section-header">
            <span className="badge-pill">Direct Transmission</span>
            <h2 className="section-title">
              Connect Directly with <span className="gradient-text">Aveniq Leadership</span>
            </h2>
            <p className="section-desc">
              No middle managers. Communicate directly with startup founders and lead architects to scope your software initiative.
            </p>
          </div>

          <div className="contact-section-grid">
            {/* Left: Direct Founder Connect Channels */}
            <div className="owner-direct-panel" id="owner-connect">
              {/* WhatsApp Hotline Card */}
              <div className="glass-card hotline-card">
                <div className="hotline-header">
                  <div className="hotline-icon">💬</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>Direct WhatsApp Hotline</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      Instant direct chat with the company owner
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '18px', lineHeight: '1.6' }}>
                  Have an urgent requirement or prefer chatting in real-time? Start an instant encrypted chat with our leadership team.
                </p>
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-accent"
                  style={{ width: '100%' }}
                  id="direct-whatsapp-lead-btn"
                >
                  <span>Chat on WhatsApp Directly</span>
                  <span>→</span>
                </a>
              </div>

              {/* Direct Channels */}
              <div className="direct-channels-grid">
                <a
                  href={`tel:${OWNER_CONTACT.phoneCall}`}
                  className="glass-card direct-channel-card"
                  id="direct-phone-call-btn"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📞</span>
                    <span className="channel-label">Direct Voice Call</span>
                  </div>
                  <span className="channel-value">{OWNER_CONTACT.phoneDisplay}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tap to call founder</span>
                </a>

                <a
                  href={`mailto:${OWNER_CONTACT.email}?subject=Project%20Inquiry%20-%20Aveniq`}
                  className="glass-card direct-channel-card"
                  id="direct-email-btn"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>✉️</span>
                    <span className="channel-label">Executive Email</span>
                  </div>
                  <span className="channel-value">{OWNER_CONTACT.email}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Response in &lt; 2 hrs</span>
                </a>
              </div>

              {/* Backend Live Node Status */}
              <div className="glass-card server-health-card">
                <div className="server-stat-group">
                  <span className="pulse-dot"></span>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: '700' }}>Backend API Engine</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Running on Node.js • Port 5000
                    </div>
                  </div>
                </div>
                <div className="server-ping-badge">
                  {serverHealth.online ? `LIVE • ${serverHealth.latency}` : 'OFFLINE'}
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="glass-card contact-form-card">
              <h3 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Send Project Transmission</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Submissions are stored securely in our backend server and trigger instant alerts to our executive phone.
              </p>

              {formStatus.success && (
                <div className="form-alert form-alert-success">
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>✓ Transmission Received! Reference ID: {formStatus.refId}</div>
                  <div>Thank you! Our founding architect will review your project details and reach out within 2 hours.</div>
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={getWhatsAppLink(`Hi Aveniq! I just submitted project inquiry ${formStatus.refId}. Looking forward to connecting!`)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#25D366', fontWeight: '700', textDecoration: 'underline' }}
                    >
                      Follow up instantly on WhatsApp →
                    </a>
                  </div>
                </div>
              )}

              {formStatus.error && (
                <div className="form-alert form-alert-error">
                  {formStatus.error}
                </div>
              )}

              <form onSubmit={handleContactSubmit}>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-field-label">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Lin"
                      className="input-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-field-label">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. maya@company.com"
                      className="input-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-field-label">Direct Phone / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 019-2831"
                      className="input-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-field-label">Company / Venture Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Quantum AI Labs"
                      className="input-control"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-field-label">Primary Service</label>
                    <select
                      className="input-control"
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    >
                      {SERVICES_DATA.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-field-label">Budget Tier</label>
                    <select
                      className="input-control"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    >
                      <option value="$10,000 - $25,000">$10,000 - $25,000 (MVP)</option>
                      <option value="$25,000 - $50,000">$25,000 - $50,000 (Growth)</option>
                      <option value="$50,000 - $100,000">$50,000 - $100,000 (Scale)</option>
                      <option value="$100,000+">$100,000+ (Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-field-label">Project Scope & Objectives *</label>
                  <textarea
                    required
                    placeholder="Describe your software objectives, desired tech stack, integrations, or challenges..."
                    className="input-control"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={formStatus.loading}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '1rem', padding: '15px' }}
                  id="submit-contact-form-btn"
                >
                  {formStatus.loading ? 'Transmitting to Server...' : 'Submit Direct Inquiry →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Owner Dashboard Inquiries Modal
          ==================================================================== */}
      {ownerModalOpen && (
        <div className="modal-overlay" onClick={() => setOwnerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>Owner Administration Dashboard</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Stored Inquiries on Backend Server (`server/data/messages.json`)
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setOwnerModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {inquiriesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading inquiries from backend...
              </div>
            ) : inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No inquiries submitted yet. Submit a test message on the contact form!
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.88rem' }}>
                  <span>Total Leads: <strong>{inquiries.length}</strong></span>
                  <button
                    onClick={fetchInquiries}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-cyan)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    ↻ Refresh Leads
                  </button>
                </div>

                {inquiries.map((inq) => (
                  <div key={inq.id} className="inquiry-item-card">
                    <div className="inquiry-item-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="inquiry-id-badge">{inq.id}</span>
                        <strong style={{ fontSize: '1.05rem' }}>{inq.name}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({inq.company})</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(inq.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="inquiry-meta-row">
                      <span>📧 <a href={`mailto:${inq.email}`} style={{ color: 'var(--brand-cyan)' }}>{inq.email}</a></span>
                      <span>📞 {inq.phone}</span>
                      <span>🛠️ {inq.service}</span>
                      <span>💰 {inq.budget}</span>
                    </div>

                    <div className="inquiry-body-text">
                      "{inq.message}"
                    </div>

                    <div className="inquiry-action-row">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Hi ${inq.name}, following up regarding your Aveniq inquiry ${inq.id}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-accent"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        💬 Reply via WhatsApp
                      </a>
                      <a
                        href={`mailto:${inq.email}?subject=Aveniq%20Inquiry%20${inq.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        ✉️ Reply Email
                      </a>
                      <button
                        onClick={() => handleDeleteInquiry(inq.id)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        Archive / Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          Footer
          ==================================================================== */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div className="brand-logo-frame" style={{ width: '40px', height: '40px' }}>
                  <img src={currentLogo} alt="Aveniq Logo" className="brand-logo-img" />
                </div>
                <span className="brand-title" style={{ fontSize: '1.4rem' }}>AVENIQ</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '300px' }}>
                Engineering autonomous software systems, next-gen AI architectures, and hyper-scalable enterprise platforms for visionary businesses.
              </p>
            </div>

            <div>
              <h4 className="footer-col-title">Solutions</h4>
              <ul className="footer-nav-list">
                <li className="footer-nav-item"><a href="#services" className="footer-nav-link">Autonomous AI Agents</a></li>
                <li className="footer-nav-item"><a href="#services" className="footer-nav-link">Enterprise Cloud SaaS</a></li>
                <li className="footer-nav-item"><a href="#services" className="footer-nav-link">Zero-Trust Security</a></li>
                <li className="footer-nav-item"><a href="#services" className="footer-nav-link">Event-Driven Streaming</a></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-col-title">Direct Connect</h4>
              <ul className="footer-nav-list">
                <li className="footer-nav-item">
                  <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="footer-nav-link">
                    WhatsApp: {OWNER_CONTACT.phoneDisplay}
                  </a>
                </li>
                <li className="footer-nav-item">
                  <a href={`tel:${OWNER_CONTACT.phoneCall}`} className="footer-nav-link">
                    Phone: {OWNER_CONTACT.phoneDisplay}
                  </a>
                </li>
                <li className="footer-nav-item">
                  <a href={`mailto:${OWNER_CONTACT.email}`} className="footer-nav-link">
                    Email: {OWNER_CONTACT.email}
                  </a>
                </li>
                <li className="footer-nav-item">
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                    {OWNER_CONTACT.office}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="footer-col-title">Engineering Status</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Live backend cluster active with 99.99% uptime.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span className="pulse-dot"></span>
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>
              © {new Date().getFullYear()} Aveniq Software Technologies Inc. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Privacy Protocol</span>
              <span style={{ color: 'var(--text-dim)' }}>Terms of Architecture</span>
              <span style={{ color: 'var(--brand-cyan)', cursor: 'pointer' }} onClick={handleOpenOwnerModal}>
                Owner Dashboard
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
