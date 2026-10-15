import React, { useState, useEffect, useRef } from 'react';

export default function ChatWidget({ theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('aveniq_chat_session') || ('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  });
  const [clientName, setClientName] = useState(() => localStorage.getItem('aveniq_client_name') || '');
  const [clientEmail, setClientEmail] = useState(() => localStorage.getItem('aveniq_client_email') || '');
  const [isRegistered, setIsRegistered] = useState(() => !!localStorage.getItem('aveniq_client_name'));
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Save session ID
  useEffect(() => {
    localStorage.setItem('aveniq_chat_session', sessionId);
  }, [sessionId]);

  // Initial fetch of session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/chat/session/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.session) {
            setMessages(data.session.messages || []);
            if (data.session.clientName && data.session.clientName !== 'Visitor') {
              setClientName(data.session.clientName);
              setIsRegistered(true);
            }
            if (data.session.clientEmail) {
              setClientEmail(data.session.clientEmail);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use current host which Vite proxies /ws to ws://localhost:5000, or directly localhost:5000 in fallback
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws;
    let reconnectTimer;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'init_client',
            payload: { sessionId, clientName, clientEmail }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'init_client_success') {
              if (data.session?.messages) {
                setMessages(data.session.messages);
              }
            } else if (data.type === 'new_message' && data.sessionId === sessionId) {
              setMessages((prev) => {
                if (prev.some(m => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
              if (!isOpen && data.message.sender === 'admin') {
                setUnreadCount((c) => c + 1);
              }
            }
          } catch (e) {
            console.error('Error handling ws message', e);
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 4000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [sessionId, clientName, clientEmail]);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
      // Mark read
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mark_read',
          payload: { sessionId, role: 'client' }
        }));
      }
    }
  }, [messages, isOpen]);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    localStorage.setItem('aveniq_client_name', clientName.trim());
    localStorage.setItem('aveniq_client_email', clientEmail.trim());
    setIsRegistered(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'init_client',
        payload: { sessionId, clientName: clientName.trim(), clientEmail: clientEmail.trim() }
      }));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const text = inputVal.trim();
    setInputVal('');
    setIsSending(true);

    const payload = {
      sessionId,
      sender: 'client',
      text,
      clientName: clientName.trim() || 'Visitor',
      clientEmail: clientEmail.trim() || ''
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        payload
      }));
      setIsSending(false);
    } else {
      // Fallback to HTTP POST
      try {
        const res = await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.message) {
          setMessages((prev) => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } catch (err) {
        console.error('Error sending message via HTTP:', err);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <div className="chat-widget-root">
      {/* Floating Launcher Button */}
      <button
        type="button"
        className={`chat-launcher-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Live Chat"
      >
        <span className="chat-launcher-icon">
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          )}
        </span>
        {!isOpen && unreadCount > 0 && (
          <span className="chat-unread-badge">{unreadCount}</span>
        )}
        {!isOpen && unreadCount === 0 && (
          <span className="chat-launcher-pulse"></span>
        )}
      </button>

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="chat-window-box">
          {/* Header */}
          <div className="chat-window-header">
            <div className="chat-header-info">
              <div className="chat-avatar-wrapper">
                <div className="chat-avatar-pulse"></div>
                <div className="chat-avatar-symbol">⚡</div>
              </div>
              <div>
                <h4 className="chat-header-title">Aveniq Live Engineering</h4>
                <div className="chat-header-status">
                  <span className="chat-status-dot"></span>
                  <span>Direct Admin & Tech Team</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Registration / Pre-chat prompt if name not set */}
          {!isRegistered && messages.length === 0 ? (
            <div className="chat-welcome-container">
              <div className="chat-welcome-hero">
                <span className="chat-welcome-badge">Direct Line</span>
                <h3>Welcome to Aveniq Support</h3>
                <p>Chat directly with our core engineering leadership and software architects.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="chat-welcome-form">
                <div className="chat-input-group">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liam Smith"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="chat-field-input"
                  />
                </div>
                <div className="chat-input-group">
                  <label>Work Email (Optional for updates)</label>
                  <input
                    type="email"
                    placeholder="liam@company.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="chat-field-input"
                  />
                </div>
                <button type="submit" className="chat-submit-btn">
                  Start Live Chat →
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Message History */}
              <div className="chat-messages-container">
                <div className="chat-timestamp-badge">
                  Connected to Aveniq Core Relay • Live Session
                </div>

                {messages.length === 0 ? (
                  <div className="chat-empty-hint">
                    <p>👋 Hello {clientName || 'there'}! Ask us anything about our custom AI agents, Cloud SaaS, or enterprise software development.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isClient = m.sender === 'client';
                    return (
                      <div
                        key={m.id}
                        className={`chat-bubble-row ${isClient ? 'client-row' : 'admin-row'}`}
                      >
                        {!isClient && (
                          <div className="chat-bubble-avatar">
                            AVQ
                          </div>
                        )}
                        <div className={`chat-bubble ${isClient ? 'client-bubble' : 'admin-bubble'}`}>
                          <div className="chat-bubble-sender">
                            {isClient ? 'You' : 'Aveniq Admin'}
                          </div>
                          <div className="chat-bubble-text">{m.text}</div>
                          <div className="chat-bubble-time">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                <input
                  type="text"
                  placeholder="Type your message to Admin..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="chat-input-element"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isSending}
                  className="chat-send-btn"
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
