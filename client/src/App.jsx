import { useState, useEffect, useRef } from 'react';
import logoDark from './assets/logo-dark.jpg';
import logoLight from './assets/logo-light.jpg';
import ChatWidget from './ChatWidget.jsx';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import ClientPortal from './ClientPortal.jsx';
import OrderServiceModal, { SOFTWARE_SERVICES } from './OrderServiceModal.jsx';
import { API_BASE } from './apiConfig.js';
import './App.css';

// Direct Contact details for the Software Company
const OWNER_CONTACT = {
  phoneDisplay: '+94 77 123 4567',
  phoneCall: '+94771234567',
  whatsappNumber: '94771234567',
  email: 'info@aveniq.lk',
  office: 'Colombo, Sri Lanka'
};

const SERVICES_DATA = [
  {
    id: 'web-development',
    name: 'Web Development',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    summary: 'High-performance corporate websites, robust web applications, e-commerce stores, and custom client management portals built with modern frameworks.',
    features: ['Responsive UI on Mobile, Tablet & Desktop', 'Fast Page Load & Clean React/Vite Architecture', 'SEO Optimization & Google Search Ranking', 'Custom REST APIs & WhatsApp Direct Connect'],
    tech: ['React.js', 'Next.js', 'Node.js', 'Tailwind CSS', 'TypeScript']
  },
  {
    id: 'mobile-app',
    name: 'Mobile App Development',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
    summary: 'Native and cross-platform mobile apps for iOS and Android tailored for smooth user flows, offline capability, and high engagement.',
    features: ['Cross-Platform iOS & Android Apps', 'Fluid Native Gestures & 60fps Animations', 'Push Notifications & Real-Time Sync', 'App Store & Google Play Launch Assistance'],
    tech: ['React Native', 'Flutter', 'Firebase', 'REST APIs', 'Node.js']
  },
  {
    id: 'ui-ux-design',
    name: 'UI/UX Design',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
    summary: 'User-centered product design, interactive wireframing, high-fidelity prototypes, and sleek modern design systems created in Figma.',
    features: ['Modern Intuitive User Journey Mapping', 'High-Fidelity Interactive Figma Prototypes', 'Comprehensive Brand Design Systems', 'Usability Testing & Design System Hand-off'],
    tech: ['Figma', 'Prototyping', 'Design Systems', 'Micro-Interactions']
  },
  {
    id: 'cloud-devops',
    name: 'Cloud & DevOps',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
    summary: 'Scalable cloud infrastructure, automated CI/CD pipelines, container orchestration, serverless edge hosting, and 24/7 reliability.',
    features: ['Cloudflare Edge & Serverless Deployment', 'Docker Containerization & Kubernetes', 'Automated GitHub Actions CI/CD Pipelines', 'Database Clustering, SSL & 99.99% Uptime SLA'],
    tech: ['Cloudflare Workers', 'AWS', 'Docker', 'Linux', 'PostgreSQL', 'CI/CD']
  }
];

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Dedicated Admin Dashboard Route: /admin-dashboard
  if (currentPath === '/admin-dashboard' || window.location.hash === '#admin-dashboard') {
    return <AdminDashboard />;
  }

  // Admin Login / Gatekeeper Route: /admin or /portal
  if (currentPath === '/admin' || currentPath === '/portal' || window.location.hash === '#admin') {
    return <AdminLogin onAuthenticated={() => {
      window.history.pushState({}, '', '/admin-dashboard');
      setCurrentPath('/admin-dashboard');
    }} />;
  }

  // Client Portal route: Customers login to track their project progress
  if (currentPath === '/client-portal' || currentPath === '/progress' || currentPath === '/client' || window.location.hash === '#client') {
    return <ClientPortal onBackToWebsite={() => { window.location.href = '/'; }} />;
  }

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('aveniq_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Default website loading theme is strictly light mode unless explicitly changed
    return 'light';
  });
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);
  const phrases = [
    'Custom Web & Mobile Applications',
    'Business Management & POS Software',
    'E-Commerce & Online Store Solutions',
    'Reliable Software Services in Sri Lanka'
  ];

  // Contact Form State (Without budget)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: 'Web & Mobile App Development',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null, refId: null });

  // Backend Health & Status
  const [serverHealth, setServerHealth] = useState({ online: true, latency: '12ms', uptime: '99.99%' });
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrderService, setSelectedOrderService] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Project Estimator / Scoper State
  const [estService, setEstService] = useState('Web & Mobile App');
  const [estScale, setEstScale] = useState('Small Business / Startup');
  const [estTimeline, setEstTimeline] = useState('Standard (2-4 Weeks)');

  // Live Showcase Projects state
  const [showcases, setShowcases] = useState([]);
  const [showcasesLoading, setShowcasesLoading] = useState(true);
  const [previewModalProject, setPreviewModalProject] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Click-triggered preview modal open
  const handleOpenPreview = (proj) => {
    setPreviewModalProject(proj);
    setIframeLoaded(false);
  };

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Canvas Ref for futuristic neural background
  const canvasRef = useRef(null);

  // Theme synchronization to document root and storage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aveniq_theme', theme);
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
        const res = await fetch(`${API_BASE}/api/health`);
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

  // Fetch Public Project Showcases
  const fetchPublicShowcases = async () => {
    try {
      setShowcasesLoading(true);
      const res = await fetch(`${API_BASE}/api/showcases`);
      if (res.ok) {
        const data = await res.json();
        setShowcases(data.showcases || []);
      }
    } catch (err) {
      console.error('Failed to load showcases:', err);
    } finally {
      setShowcasesLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicShowcases();
  }, []);

  // IntersectionObserver for Scroll Animation Load Sections
  useEffect(() => {
    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Once animated, unobserve to retain high performance
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.12
    });

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [showcases]);

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

    // High-performance adaptive particle count: 18 on mobile, 45 on desktop
    const isMobile = width < 768;
    const count = isMobile ? 18 : 45;
    const particles = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isMobile ? 0.4 : 0.6),
        vy: (Math.random() - 0.5) * (isMobile ? 0.4 : 0.6),
        radius: Math.random() * 1.5 + 1
      });
    }

    let mouse = { x: null, y: null };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

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

          if (dist < (isMobile ? 85 : 125)) {
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
      const res = await fetch(`${API_BASE}/api/contact`, {
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
        service: 'Web & Mobile App Development',
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
      const res = await fetch(`${API_BASE}/api/contact`);
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
      const res = await fetch(`${API_BASE}/api/contact/${id}`, { method: 'DELETE' });
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
      service: estService === 'Web & Mobile App' ? 'Web & Mobile App Development' : estService === 'Business Management Software' ? 'Business Management Software' : estService === 'E-Commerce Store' ? 'E-Commerce & Online Stores' : 'Domain, Hosting & Cloud Setup',
      message: `Project Requirement: ${estService} for ${estScale}. Preferred timeline: ${estTimeline}. Please contact me to discuss details.`
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
                width="44"
                height="44"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            <div>
              <span className="brand-title">AVENIQ</span>
              <span className="brand-tag">SOFTWARE SYSTEMS</span>
            </div>
          </a>

          <nav className="desktop-nav">
            <ul className="nav-links">
              <li>
                <a href="#projects-showcase" className="nav-link nav-link-highlight">
                  <span>Projects</span>
                  <span className="nav-live-badge">LIVE</span>
                </a>
              </li>
              <li><a href="#estimator" className="nav-link">Project Scoper</a></li>
              <li><a href="#owner-connect" className="nav-link">Contact</a></li>
            </ul>
          </nav>

          <div className="nav-actions">
            {/* Dark / Light Mode Switch */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              id="theme-toggle-btn"
              title="Toggle Dark / Light Mode"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
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
                  <span className="theme-btn-label">Light</span>
                </>
              ) : (
                <>
                  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className="theme-btn-label">Dark</span>
                </>
              )}
            </button>

            <a
              href="/client-portal"
              className="btn btn-secondary nav-action-btn"
              id="nav-client-portal-btn"
            >
              <span>Client Login</span>
            </a>

            {/* Order Services direct CTA */}
            <button
              onClick={() => {
                setSelectedOrderService(SOFTWARE_SERVICES[0]);
                setOrderModalOpen(true);
              }}
              className="btn btn-primary nav-action-btn nav-order-highlight"
              id="nav-order-btn"
            >
              <span>Order Service</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              className={`mobile-hamburger-btn ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              <span className="hamburger-bar"></span>
              <span className="hamburger-bar"></span>
              <span className="hamburger-bar"></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Backdrop & Sheet */}
        {mobileMenuOpen && (
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-nav-header">
                <span className="mobile-nav-title">Menu Navigation</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={toggleTheme}
                    className="theme-toggle-btn"
                    title="Toggle Dark / Light Mode"
                    aria-label="Toggle Theme"
                    style={{ padding: '6px 12px' }}
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button
                    type="button"
                    className="mobile-nav-close"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <ul className="mobile-nav-list">
                <li>
                  <a href="#projects-showcase" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                    <span>Projects & Websites</span>
                    <span className="nav-live-badge-mobile">LIVE</span>
                  </a>
                </li>
                <li>
                  <a href="#estimator" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                    <span>Project Scoper</span>
                  </a>
                </li>
                <li>
                  <a href="#owner-connect" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                    <span>Contact Leadership</span>
                  </a>
                </li>
                <li>
                  <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-item">
                    <span>Submit Inquiry</span>
                  </a>
                </li>
              </ul>

              <div className="mobile-nav-footer">
                <a
                  href="/client-portal"
                  className="btn btn-secondary mobile-cta-btn"
                >
                  Client Portal Login
                </a>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSelectedOrderService(SOFTWARE_SERVICES[0]);
                    setOrderModalOpen(true);
                  }}
                  className="btn btn-primary mobile-cta-btn"
                >
                  Order Service Online
                </button>
              </div>
            </div>
          </div>
        )}
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
                Software & Web Development in Sri Lanka
              </span>
            </div>

            <h1 className="hero-title">
              Reliable <span className="gradient-text glow-text">Software & Web Solutions</span> for Your Business
            </h1>

            <p className="hero-subtext">
              We design and build modern websites, business management systems, POS software, and mobile applications to help Sri Lankan businesses grow.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderService(SOFTWARE_SERVICES[0]);
                  setOrderModalOpen(true);
                }}
                className="btn btn-primary"
                id="hero-order-service-btn"
              >
                <span>Order Service Online</span>
                <span>→</span>
              </button>

              <a href="#contact" className="btn btn-secondary" id="hero-get-started-btn">
                <span>Request a Quote</span>
              </a>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-accent"
                id="hero-whatsapp-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <svg className="whatsapp-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp Us</span>
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
          Company Milestone & Achievements Banner
          ==================================================================== */}
      <section className="achievements-banner-section scroll-reveal">
        <div className="container">
          <div className="achievements-banner-card">
            <div className="achievement-stat-item">
              <div className="stat-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number gradient-text">100+</div>
                <div className="stat-title">Projects Completed</div>
                <div className="stat-desc">Delivered on-time across web, mobile & cloud</div>
              </div>
            </div>

            <div className="achievement-divider"></div>

            <div className="achievement-stat-item">
              <div className="stat-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number gradient-text">60+</div>
                <div className="stat-title">Trusted Clients</div>
                <div className="stat-desc">Startups, SMEs & enterprises in Sri Lanka & global</div>
              </div>
            </div>

            <div className="achievement-divider"></div>

            <div className="achievement-stat-item">
              <div className="stat-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number gradient-text">5+ Years</div>
                <div className="stat-title">Proven Experience</div>
                <div className="stat-desc">Engineering resilient, production-ready systems</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Project Scoper Section
          ==================================================================== */}
      <section className="section scroll-reveal" id="estimator" style={{ background: 'var(--bg-surface)' }}>
        <div className="container">
          <div className="section-header">
            <span className="badge-pill">Project Scoper</span>
            <h2 className="section-title">
              Configure Your <span className="gradient-text">Project Requirements</span>
            </h2>
            <p className="section-desc">
              Select your required software service, company size, and delivery timeline to plan your development roadmap.
            </p>
          </div>

          <div className="estimator-container">
            <div className="glass-card calc-panel">
              <div className="calc-group">
                <label className="calc-label">1. Primary Software Service</label>
                <div className="pill-selector-row">
                  {['Web & Mobile App', 'Business Management Software', 'E-Commerce Store', 'Cloud & Hosting'].map((srv) => (
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
                <label className="calc-label">2. Business Scale</label>
                <div className="pill-selector-row">
                  {['Small Business / Startup', 'Medium Enterprise', 'Established Company'].map((scale) => (
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
                <label className="calc-label">3. Desired Completion Timeline</label>
                <div className="pill-selector-row">
                  {['Fast-Track (1-2 Weeks)', 'Standard (2-4 Weeks)', 'Full Phase (4-8 Weeks)'].map((t) => (
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

            {/* Scoper Summary Output */}
            <div className="glass-card calc-summary-card">
              <h3 className="summary-headline">Project Overview</h3>
              <div className="estimate-output-box">
                <div className="est-amount" style={{ fontSize: '1.25rem' }}>
                  {estService}
                </div>
                <div className="est-timeline" style={{ marginTop: '6px' }}>Target Delivery: {estTimeline}</div>
              </div>

              <ul className="est-deliverables">
                <li className="est-deliverable-item">
                  <span className="check-dot">✓</span>
                  <span>Modern, clean and responsive web & mobile UI</span>
                </li>
                <li className="est-deliverable-item">
                  <span className="check-dot">✓</span>
                  <span>Complete source code and full ownership</span>
                </li>
                <li className="est-deliverable-item">
                  <span className="check-dot">✓</span>
                  <span>Direct phone & WhatsApp technical support</span>
                </li>
                <li className="est-deliverable-item">
                  <span className="check-dot">✓</span>
                  <span>Free deployment, domain and SSL setup support</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={applyEstimateToForm}
                className="btn btn-primary"
                style={{ width: '100%' }}
                id="apply-estimate-btn"
              >
                Send as Project Inquiry →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Our Newest Projects & Live Hosted Websites Showcase Section
          ==================================================================== */}
      <section className="section showcase-section scroll-reveal" id="projects-showcase">
        <div className="container">
          <div className="section-header">
            <span className="badge-pill">Portfolio & Live Systems</span>
            <h2 className="section-title">
              Our Newest <span className="gradient-text">Deployed Projects & Websites</span>
            </h2>
            <p className="section-desc">
              Explore websites and web applications built and hosted by Aveniq. Move your cursor over any website square to preview it live with full interactive scrolling.
            </p>
          </div>

          {showcasesLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div className="pulse-dot" style={{ display: 'inline-block', width: '14px', height: '14px', marginBottom: '12px' }}></div>
              <div>Loading live project websites...</div>
            </div>
          ) : showcases.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px', borderRadius: '16px' }}>
              <div className="stat-icon-wrapper" style={{ margin: '0 auto 12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                </svg>
              </div>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '6px' }}>New Projects Coming Soon</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
                We are currently deploying our newest client systems. You can add new projects directly from the Admin Panel to showcase them here!
              </p>
            </div>
          ) : (
            <div className="showcase-rectangle-grid">
              {showcases.map((proj) => (
                <div
                  key={proj.id}
                  className="showcase-rectangle-card"
                  onClick={() => handleOpenPreview(proj)}
                >
                  {/* Browser-style Top Bar */}
                  <div className="showcase-card-browser-bar">
                    <div className="browser-dots">
                      <span className="b-dot red"></span>
                      <span className="b-dot yellow"></span>
                      <span className="b-dot green"></span>
                    </div>
                    <div className="browser-address-pill">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="address-text">{proj.url.replace(/^https?:\/\//i, '')}</span>
                    </div>
                    <span className="showcase-tag-mini">{proj.tag || 'Live'}</span>
                  </div>

                  {/* Rectangle Website Screen Area */}
                  <div className="showcase-screen-viewport">
                    {/* Live iframe miniature view with scrolling capability */}
                    <iframe
                      src={proj.url}
                      title={proj.name}
                      className="showcase-embedded-iframe"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      loading="lazy"
                    />

                    {/* Interactive hover overlay */}
                    <div className="showcase-screen-overlay">
                      <div className="overlay-content">
                        <span className="overlay-badge">Interactive Preview</span>
                        <h4 className="overlay-title">{proj.name}</h4>
                        <p className="overlay-desc">{proj.description || 'Interactive live web system built with modern architecture.'}</p>
                        <div className="overlay-actions">
                          <button
                            type="button"
                            className="btn btn-primary overlay-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPreview(proj);
                            }}
                          >
                            Open Scroll View
                          </button>
                          <a
                            href={proj.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary overlay-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Visit Hosted Site ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="showcase-card-footer">
                    <div>
                      <h4 className="showcase-proj-name">{proj.name}</h4>
                      <p className="showcase-proj-domain">{proj.url}</p>
                    </div>
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="showcase-launch-btn"
                      title="Open external website in new tab"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
          POPUP PREVIEW MODAL WITH FULL SCROLLABLE WINDOW (Opens only on click)
          ==================================================================== */}
      {previewModalProject && (
        <div
          className="showcase-modal-overlay"
          onClick={() => setPreviewModalProject(null)}
        >
          <div
            className="showcase-modal-window"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Browser Header */}
            <div className="showcase-modal-header">
              <div className="browser-dots" style={{ gap: '6px' }}>
                <span className="b-dot red" onClick={() => setPreviewModalProject(null)} style={{ cursor: 'pointer' }} title="Close"></span>
                <span className="b-dot yellow"></span>
                <span className="b-dot green"></span>
              </div>

              <div className="showcase-modal-url-bar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="modal-url-text">{previewModalProject.url}</span>
                <span className="url-badge-verified">SSL SECURE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={previewModalProject.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  Open Full Tab ↗
                </a>
                <button
                  type="button"
                  className="showcase-modal-close-btn"
                  onClick={() => setPreviewModalProject(null)}
                  title="Close popup"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Info Bar */}
            <div className="showcase-modal-subbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="showcase-tag-pill">{previewModalProject.tag || 'Project Website'}</span>
                <strong className="showcase-modal-proj-title">{previewModalProject.name}</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Scroll and interact inside this preview window. Click outside or use the close button to exit.
              </div>
            </div>

            {/* Scrollable Square/Rectangle Iframe Area */}
            <div className="showcase-modal-scroll-frame">
              {!iframeLoaded && (
                <div className="showcase-iframe-loader">
                  <div className="loader-spinner"></div>
                  <div style={{ marginTop: '14px', fontSize: '0.9rem', color: '#00e5ff' }}>
                    Loading preview for {previewModalProject.name}...
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                    Scrollable window rendering hosted website
                  </div>
                </div>
              )}
              <iframe
                src={previewModalProject.url}
                title={previewModalProject.name}
                className="showcase-modal-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          Direct Owner Connect & Contact Section
          ==================================================================== */}
      <section className="section scroll-reveal" id="contact">
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
                  <div className="hotline-icon" style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="whatsapp-svg-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </div>
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
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  id="direct-whatsapp-lead-btn"
                >
                  <svg className="whatsapp-svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
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
                      <span>Email: <a href={`mailto:${inq.email}`} style={{ color: 'var(--brand-cyan)' }}>{inq.email}</a></span>
                      <span>Phone: {inq.phone}</span>
                      <span>Service: {inq.service}</span>
                      {inq.budget && <span>Budget: {inq.budget}</span>}
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
                        style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg className="whatsapp-svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        <span>Reply via WhatsApp</span>
                      </a>
                      <a
                        href={`mailto:${inq.email}?subject=Aveniq%20Inquiry%20${inq.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        Reply Email
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
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>ISO 27001 & SOC-2 Verified</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Real-time Chatbox for public visitors */}
      <ChatWidget theme={theme} />

      {/* Software & Services Order Modal */}
      <OrderServiceModal
        isOpen={orderModalOpen}
        initialService={selectedOrderService}
        onClose={() => setOrderModalOpen(false)}
      />
    </div>
  );
}
