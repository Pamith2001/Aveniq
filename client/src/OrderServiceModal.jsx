import React, { useState } from 'react';
import { API_BASE } from './apiConfig.js';

export const SOFTWARE_SERVICES = [
  {
    id: 'web-development',
    name: 'Web Development',
    category: 'Full-Stack Web Development',
    icon: '🌐',
    description: 'High-performance responsive websites, web applications, custom management portals, and e-commerce stores.',
    deliverables: ['Custom Responsive Web Design', 'Mobile & Tablet Optimization', 'Clean React & Node.js Architecture', 'Fast Page Load & SEO Optimization', 'Contact Forms & WhatsApp Direct Chat'],
    defaultTimeline: '2-4 Weeks'
  },
  {
    id: 'mobile-app',
    name: 'Mobile App Development',
    category: 'iOS & Android App Solutions',
    icon: '📱',
    description: 'Native and cross-platform mobile applications crafted with high responsiveness, offline caching, and push alerts.',
    deliverables: ['Cross-Platform iOS & Android Apps', 'Smooth Native Gestures & UX', 'Push Notification Integration', 'REST API & Cloud Data Sync', 'App Store & Google Play Launch Setup'],
    defaultTimeline: '3-6 Weeks'
  },
  {
    id: 'ui-ux-design',
    name: 'UI/UX Design',
    category: 'Product & Visual Design',
    icon: '🎨',
    description: 'Modern user experience wireframes, interactive Figma mockups, visual identity, and sleek design systems.',
    deliverables: ['User Flow & Wireframing', 'High-Fidelity Interactive Figma Prototype', 'Design System & Component Library', 'Mobile & Desktop Responsive Layouts', 'Developer Design Tokens Export'],
    defaultTimeline: '1-3 Weeks'
  },
  {
    id: 'cloud-devops',
    name: 'Cloud & DevOps',
    category: 'Cloud Architecture & Infrastructure',
    icon: '☁️',
    description: 'Reliable cloud server hosting, automated CI/CD deployments, containerization, and 24/7 uptime monitoring.',
    deliverables: ['Cloudflare / AWS Serverless Architecture', 'Docker Container Setup & Optimization', 'Automated GitHub Actions CI/CD', 'SSL, DNS & High-Availability Database Config', '24/7 Server Health Monitoring'],
    defaultTimeline: '1-2 Weeks'
  }
];

export default function OrderServiceModal({ isOpen, initialService, onClose, onOrderPlaced }) {
  const [selectedServiceId, setSelectedServiceId] = useState(() => initialService?.id || SOFTWARE_SERVICES[0].id);
  const [timeline, setTimeline] = useState('Standard (2-4 Weeks)');
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
        tier: 'Standard Project',
        timeline,
        requirements: formData.requirements
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit service order.');
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
            <span className="order-modal-badge">Service Request</span>
            <h2>Order Software or Web Service</h2>
            <p>Select the service your business needs and submit your details to get started.</p>
          </div>
          <button type="button" className="order-modal-close" onClick={onClose}>✕</button>
        </div>

        {successOrder ? (
          <div className="order-success-screen">
            <div className="order-success-icon">✓</div>
            <h3>Service Request Received!</h3>
            <p className="order-ref-text">Order Reference: <strong>{successOrder.id}</strong></p>
            <div className="order-success-summary">
              <div><strong>Service:</strong> {successOrder.serviceName}</div>
              <div><strong>Target Timeline:</strong> {successOrder.timeline}</div>
              <div><strong>Client:</strong> {successOrder.customerName} ({successOrder.customerEmail})</div>
              <div><strong>Status:</strong> <span className="order-status-pill">{successOrder.status}</span></div>
            </div>
            <p className="order-instructions-text">
              Thank you! Our Sri Lankan software team has received your order. We will review your requirements and contact you directly via phone or WhatsApp shortly.
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
            {/* Service Selection */}
            <div className="order-service-selection">
              <label className="order-field-label">1. Choose Service</label>
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
                      <div className="order-choice-price" style={{ color: 'var(--text-muted)' }}>{srv.category}</div>
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

            {/* Target Delivery Timeline */}
            <div className="order-config-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="order-config-col">
                <label className="order-field-label">2. Target Completion Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="order-select-input"
                >
                  <option value="Urgent / Fast-Track (1-2 Weeks)">Urgent / Fast-Track (1-2 Weeks)</option>
                  <option value="Standard (2-4 Weeks)">Standard (2-4 Weeks)</option>
                  <option value="Flexible / As Discussed">Flexible / As Discussed</option>
                </select>
              </div>
            </div>

            {/* Customer Contact Details */}
            <div className="order-customer-details">
              <label className="order-field-label">3. Your Contact Information</label>
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
                    placeholder="Email Address *"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="order-text-input"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    placeholder="Phone / WhatsApp Number *"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="order-text-input"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Company / Business Name"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="order-text-input"
                  />
                </div>
              </div>
            </div>

            {/* Custom Scope / Technical Notes */}
            <div className="order-requirements-group">
              <label className="order-field-label">4. Project Details & Special Requirements</label>
              <textarea
                rows="3"
                placeholder="Tell us about your business, specific pages, features, or design preferences..."
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
                {submitting ? 'Submitting Order...' : 'Submit Service Order →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
