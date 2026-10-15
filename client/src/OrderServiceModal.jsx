import React, { useState } from 'react';

export const SOFTWARE_SERVICES = [
  {
    id: 'web-mobile',
    name: 'Web & Mobile App Development',
    category: 'Full-Stack Development',
    icon: '🚀',
    description: 'Modern, responsive business websites, web applications, customer portals, and mobile-friendly applications.',
    deliverables: ['Custom Responsive Web Design', 'Mobile & Tablet Optimization', 'Clean React & Node.js Architecture', 'Fast Loading & SEO Optimization', 'Contact Forms & WhatsApp Direct Chat'],
    defaultTimeline: '2-4 Weeks'
  },
  {
    id: 'custom-software',
    name: 'Custom Business Software & Management Systems',
    category: 'Software Solutions',
    icon: '💻',
    description: 'Tailored management systems such as Inventory Management, POS systems, Billing, and CRM tools built for Sri Lankan business operations.',
    deliverables: ['Custom Database & Record Management', 'Role-Based User Permissions', 'Invoicing, Billing & PDF Generation', 'Sales & Inventory Tracking', 'Secure Cloud Data Backup'],
    defaultTimeline: '3-6 Weeks'
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce & Online Stores',
    category: 'Online Business',
    icon: '🛒',
    description: 'Complete online shops with product catalog, cart, checkout, local payment gateways (e.g. PayHere, Bank Transfer, Koko), and order management.',
    deliverables: ['Product Catalog & Category Filtering', 'Shopping Cart & Secure Checkout', 'Local Payment Gateway Integration', 'Customer Accounts & Order History', 'Admin Inventory & Order Dashboard'],
    defaultTimeline: '3-5 Weeks'
  },
  {
    id: 'cloud-hosting',
    name: 'Cloud Hosting, Domain & Server Setup',
    category: 'Infrastructure',
    icon: '☁️',
    description: 'Reliable cloud server hosting, custom domain configuration (.lk / .com), SSL security, and continuous server monitoring.',
    deliverables: ['Domain Name Registration & DNS Setup', 'Free High-Security SSL Certificates', 'Automated Daily Database Backups', 'Fast SSD Cloud Server Hosting', '24/7 Server Uptime Monitoring'],
    defaultTimeline: '1-2 Weeks'
  },
  {
    id: 'api-automation',
    name: 'API Integrations & Automation',
    category: 'System Integration',
    icon: '⚡',
    description: 'Connect your software with SMS gateways (NotifyLK, Mobitel), WhatsApp API, accounting tools, and external services.',
    deliverables: ['Automated SMS & WhatsApp Alerts', 'Third-Party REST API Connectors', 'Spreadsheet / Excel Data Sync', 'Automated Daily Email Reports', 'Custom Webhooks & Triggers'],
    defaultTimeline: '1-3 Weeks'
  },
  {
    id: 'maintenance',
    name: 'Website Maintenance & Technical Support',
    category: 'Ongoing Support',
    icon: '⚙️',
    description: 'Keep your website and business software bug-free, updated, and secure with dedicated ongoing technical support.',
    deliverables: ['Routine Security Patches & Updates', 'Bug Fixes & Speed Optimization', 'Content & Image Updates', 'Monthly Performance Health Checks', 'Direct Phone & WhatsApp Support'],
    defaultTimeline: 'Monthly Retainer'
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

      const res = await fetch('/api/orders', {
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
