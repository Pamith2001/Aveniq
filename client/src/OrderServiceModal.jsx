import React, { useState } from 'react';

export const SOFTWARE_SERVICES = [
  {
    id: 'ai-agents',
    name: 'Autonomous AI & Multi-Agent Systems',
    category: 'Artificial Intelligence',
    icon: '⚡',
    basePrice: '$18,500',
    description: 'Custom fine-tuned LLM agents, dynamic vector search pipelines, autonomous reasoning workflows, and enterprise automation.',
    deliverables: ['Custom RAG & Multi-Agent Orchestration', 'Self-Healing Tool Calling Architecture', 'Vector DB & Hybrid Semantic Search', 'API Endpoints & Real-time WebSockets', 'Full IP Rights & Deployment Automation'],
    defaultTimeline: '6-8 Weeks'
  },
  {
    id: 'cloud-saas',
    name: 'Enterprise Cloud-Native SaaS Platform',
    category: 'Cloud Architecture',
    icon: '☁️',
    basePrice: '$24,000',
    description: 'Scalable multi-tenant cloud architectures with Kubernetes microservices, high-concurrency PostgreSQL, and automated CI/CD.',
    deliverables: ['Multi-Tenant Database Architecture', 'Kubernetes Helm & Auto-scaling Ingress', 'Role-Based Access Control (RBAC)', 'Stripe / LemonSqueezy Billing Integration', 'Zero-Downtime Rolling Deployment Pipelines'],
    defaultTimeline: '8-12 Weeks'
  },
  {
    id: 'web-mobile',
    name: 'Ultra-Fast React 19 & Mobile Suite',
    category: 'Full-Stack Apps',
    icon: '🚀',
    basePrice: '$14,500',
    description: 'High-velocity modern web application with React 19, cross-platform iOS/Android compatibility, and instant state reactivity.',
    deliverables: ['Responsive Web App + PWA / Hybrid Mobile', 'Glassmorphism Futuristic Custom UI/UX', 'Sub-millisecond Global Edge Caching', 'Authentication & Session Shield', 'Real-Time Notifications & WebSocket Bus'],
    defaultTimeline: '4-6 Weeks'
  },
  {
    id: 'data-pipelines',
    name: 'Real-Time Streaming & Big Data Engine',
    category: 'Data Engineering',
    icon: '📊',
    basePrice: '$21,000',
    description: 'Distributed event-driven data streaming pipelines that ingest millions of events per second with sub-second analytics.',
    deliverables: ['Apache Kafka / Redpanda Cluster Setup', 'ClickHouse / Time-Series Database Store', 'Real-Time Streaming Telemetry Dashboards', 'Automated ETL & Anomaly Alert Triggers', 'High-Throughput Webhook Processing Engine'],
    defaultTimeline: '6-10 Weeks'
  },
  {
    id: 'cybersecurity',
    name: 'Zero-Trust Cyber Architecture & Audit',
    category: 'Security & Hardening',
    icon: '🛡️',
    basePrice: '$16,000',
    description: 'End-to-end security architecture with mTLS, automated penetration testing, secrets rotation, and SOC-2 audit compliance.',
    deliverables: ['Zero-Trust Mesh & Encrypted Network Access', 'OAuth 2.1 & WebAuthn / Passkey Security', 'Penetration Testing & Vulnerability Assessment', 'HashiCorp Vault Secrets Management', 'Compliance Audit Documentation Pack'],
    defaultTimeline: '4-6 Weeks'
  },
  {
    id: 'devops-infra',
    name: 'GitOps, Kubernetes & Self-Healing Infra',
    category: 'DevOps & SRE',
    icon: '⚙️',
    basePrice: '$12,500',
    description: 'Infrastructure as Code automation via Terraform and ArgoCD with Prometheus observability and self-healing clusters.',
    deliverables: ['Terraform Modular Multi-Region IaC', 'GitOps ArgoCD Synchronized Pipelines', 'Prometheus & Grafana Observability Dashboards', 'Automated Failover & Multi-Zone Backups', 'Cost Optimization & Cloud Spend Reduction'],
    defaultTimeline: '3-5 Weeks'
  }
];

export default function OrderServiceModal({ isOpen, initialService, onClose, onOrderPlaced }) {
  const [selectedServiceId, setSelectedServiceId] = useState(() => initialService?.id || SOFTWARE_SERVICES[0].id);
  const [tier, setTier] = useState('Production Core Architecture');
  const [timeline, setTimeline] = useState('Standard (6-8 Weeks)');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    requirements: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  if (!isOpen) return null;

  const currentService = SOFTWARE_SERVICES.find(s => s.id === selectedServiceId) || SOFTWARE_SERVICES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        company: formData.company,
        serviceId: currentService.id,
        serviceName: currentService.name,
        tier,
        timeline,
        requirements: formData.requirements
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place service order.');
      }

      setSuccessOrder(data.order);
      if (onOrderPlaced) onOrderPlaced(data.order);
    } catch (err) {
      setErrorMsg(err.message || 'Error transmitting order to Aveniq server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div className="order-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="order-modal-header">
          <div className="order-modal-title-group">
            <span className="order-modal-badge">Direct Service Provisioning</span>
            <h2>Order Aveniq Software Engineering</h2>
            <p>Deploy specialized architectural capabilities directly to your enterprise pipeline.</p>
          </div>
          <button type="button" className="order-modal-close" onClick={onClose}>✕</button>
        </div>

        {successOrder ? (
          <div className="order-success-screen">
            <div className="order-success-icon">✓</div>
            <h3>Service Order Confirmed!</h3>
            <p className="order-ref-text">Order Reference: <strong>{successOrder.id}</strong></p>
            <div className="order-success-summary">
              <div><strong>Service:</strong> {successOrder.serviceName}</div>
              <div><strong>Package:</strong> {successOrder.tier}</div>
              <div><strong>Client:</strong> {successOrder.customerName} ({successOrder.customerEmail})</div>
              <div><strong>Status:</strong> <span className="order-status-pill">{successOrder.status}</span></div>
            </div>
            <p className="order-instructions-text">
              Your order has been transmitted directly to our Chief Systems Architect. Our engineering team will review your specifications and follow up within 2 hours.
            </p>
            <div className="order-success-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Close & Return to Website
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="order-modal-body">
            {/* Service Selection Carousel / Cards */}
            <div className="order-service-selection">
              <label className="order-field-label">1. Choose Service Architecture</label>
              <div className="order-services-carousel">
                {SOFTWARE_SERVICES.map((srv) => (
                  <div
                    key={srv.id}
                    className={`order-service-card-choice ${srv.id === selectedServiceId ? 'selected' : ''}`}
                    onClick={() => setSelectedServiceId(srv.id)}
                  >
                    <div className="order-choice-icon">{srv.icon}</div>
                    <div className="order-choice-info">
                      <div className="order-choice-name">{srv.name}</div>
                      <div className="order-choice-price">Starting from {srv.basePrice}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Service Detail Preview */}
            <div className="order-service-preview-box">
              <div className="order-preview-head">
                <span className="order-preview-title">{currentService.icon} {currentService.name}</span>
                <span className="order-preview-category">{currentService.category}</span>
              </div>
              <p className="order-preview-desc">{currentService.description}</p>
              <div className="order-preview-deliverables">
                {currentService.deliverables.map((del, i) => (
                  <span key={i} className="order-deliverable-item">✓ {del}</span>
                ))}
              </div>
            </div>

            {/* Configuration Row */}
            <div className="order-config-grid">
              <div className="order-config-col">
                <label className="order-field-label">2. Architectural Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="order-select-input"
                >
                  <option value="Proof of Concept (POC / Prototype)">Proof of Concept (POC / Prototype)</option>
                  <option value="Production Core Architecture">Production Core Architecture (Standard)</option>
                  <option value="Enterprise Mission-Critical Scale">Enterprise Mission-Critical Scale (Full Suite)</option>
                </select>
              </div>

              <div className="order-config-col">
                <label className="order-field-label">3. Target Delivery Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="order-select-input"
                >
                  <option value="Fast-Track Sprint (2-4 Weeks)">Fast-Track Sprint (2-4 Weeks)</option>
                  <option value="Standard (6-8 Weeks)">Standard ({currentService.defaultTimeline})</option>
                  <option value="Quarterly Enterprise Milestone (10-14 Weeks)">Quarterly Enterprise Milestone (10-14 Weeks)</option>
                </select>
              </div>
            </div>

            {/* Customer Contact Details */}
            <div className="order-customer-details">
              <label className="order-field-label">4. Your Organization & Contact Info</label>
              <div className="order-inputs-grid">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="order-text-input"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Work Email *"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="order-text-input"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone / WhatsApp (Optional)"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="order-text-input"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Company / Organization Name"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="order-text-input"
                  />
                </div>
              </div>
            </div>

            {/* Custom Scope / Technical Notes */}
            <div className="order-requirements-group">
              <label className="order-field-label">5. Technical Scope & Requirements (Optional)</label>
              <textarea
                rows="3"
                placeholder="Mention any specific requirements, integrations (e.g. AWS, Stripe, Kafka), or APIs your system requires..."
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                className="order-textarea-input"
              />
            </div>

            {errorMsg && (
              <div className="order-error-banner">{errorMsg}</div>
            )}

            {/* Submit Action */}
            <div className="order-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary order-submit-action"
              >
                {submitting ? 'Transmitting Order...' : `Confirm & Place Service Order (${currentService.basePrice}) →`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
