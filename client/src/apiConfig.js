// Central API Base URL Configuration & Fetch Interceptor for Production
export const API_BASE = 'https://aveniq-backend.aveniq-cloudflare-backend.workers.dev';
export const WS_BASE = 'wss://aveniq-backend.aveniq-cloudflare-backend.workers.dev';

// Intercept window.fetch so all relative /api/... calls point directly to the live Cloudflare Worker
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (resource, options) {
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      resource = `${API_BASE}${resource}`;
    }
    return originalFetch(resource, options);
  };

  // Intercept window.WebSocket so all /ws connections connect to the live Cloudflare Durable Object
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (typeof url === 'string' && (url.endsWith('/ws') || url.includes('/ws'))) {
      url = `${WS_BASE}/ws`;
    }
    return new OriginalWebSocket(url, protocols);
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
}
