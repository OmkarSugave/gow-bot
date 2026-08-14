import React, { useState, useEffect, useRef } from 'react';

function Admin({ navigate }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // States
  const [botStatus, setBotStatus] = useState({ status: 'disconnected', qr: '' });
  const [services, setServices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [config, setConfig] = useState({
    businessName: 'GrowBuzz',
    welcomeMessage: '',
    registrationSuccessMessage: '',
    smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '', adminEmail: '' }
  });
  
  // Status polling timer
  const statusInterval = useRef(null);

  // Load Data on Mount
  useEffect(() => {
    fetchConfig();
    fetchServices();
    fetchLeads();
    
    // Poll WhatsApp status every 3 seconds
    fetchWhatsAppStatus();
    statusInterval.current = setInterval(fetchWhatsAppStatus, 3000);

    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current);
    };
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setBotStatus(data);
    } catch (err) {
      console.error('Error fetching bot status:', err);
    }
  };

  const fetchConfig = () => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Error config:', err));
  };

  const fetchServices = () => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error('Error services:', err));
  };

  const fetchLeads = () => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error('Error leads:', err));
  };

  // WhatsApp logout handler
  const handleBotLogout = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp? This will clear session data and generate a new QR code.')) return;
    try {
      setBotStatus({ status: 'initializing', qr: '' });
      const res = await fetch('/api/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Bot connection reset. Generating a new QR code...');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to reset connection.');
    }
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="brand">
          <span>🐝</span> GrowBuzz Dashboard
        </div>
        <div className="nav-links">
          <button onClick={() => navigate('/form')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
            🔗 Open Form Page
          </button>
        </div>
      </header>
      
      <main className="main-content">
        <div className="tabs">
          <button onClick={() => setActiveTab('overview')} className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}>
            📊 Overview
          </button>
          <button onClick={() => setActiveTab('services')} className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}>
            🛠️ Services
          </button>
          <button onClick={() => setActiveTab('leads')} className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`}>
            👥 Leads ({leads.length})
          </button>
          <button onClick={() => setActiveTab('simulator')} className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}>
            💬 Bot Simulator
          </button>
          <button onClick={() => setActiveTab('settings')} className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}>
            ⚙️ Settings
          </button>
        </div>

        {activeTab === 'overview' && (
          <OverviewTab 
            botStatus={botStatus} 
            leads={leads} 
            handleLogout={handleBotLogout}
            onRefreshLeads={fetchLeads}
          />
        )}
        
        {activeTab === 'services' && (
          <ServicesTab 
            services={services} 
            onRefresh={fetchServices} 
          />
        )}

        {activeTab === 'leads' && (
          <LeadsTab 
            leads={leads} 
            onRefresh={fetchLeads} 
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorTab 
            services={services} 
            config={config} 
            onLeadAdded={fetchLeads}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
            config={config} 
            onRefresh={fetchConfig} 
          />
        )}
      </main>
    </div>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({ botStatus, leads, handleLogout, onRefreshLeads }) {
  const whatsappLeadsCount = leads.filter(l => l.source === 'WhatsApp').length;
  const webLeadsCount = leads.filter(l => l.source === 'Web Form').length;
  const simLeadsCount = leads.filter(l => l.source === 'Simulator').length;

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrapper">👥</div>
          <div className="stat-content">
            <span className="stat-value">{leads.length}</span>
            <span className="stat-label">Total Leads</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#e8f5e9' }}>💬</div>
          <div className="stat-content">
            <span className="stat-value">{whatsappLeadsCount}</span>
            <span className="stat-label">WhatsApp Leads</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#e3f2fd' }}>🌐</div>
          <div className="stat-content">
            <span className="stat-value">{webLeadsCount}</span>
            <span className="stat-label">Web Form Leads</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fff3e0' }}>🧪</div>
          <div className="stat-content">
            <span className="stat-value">{simLeadsCount}</span>
            <span className="stat-label">Simulator Leads</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">💬 WhatsApp Bot Link Status</h2>
          
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {botStatus.status === 'connected' ? (
              <div className="whatsapp-connection-box" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderStyle: 'solid' }}>
                <div className="status-indicator">
                  <span className="pulse-dot connected"></span>
                  <span style={{ color: '#166534' }}>Active & Connected</span>
                </div>
                <p style={{ marginTop: '12px', fontSize: '14px', color: '#166534', maxWidth: '300px' }}>
                  The bot is currently listening to your messages on WhatsApp. 
                  Incoming messages will automatically receive the GrowBuzz response flow.
                </p>
                <button onClick={handleLogout} className="btn btn-danger" style={{ marginTop: '20px', padding: '10px 18px', fontSize: '13px' }}>
                  Disconnect Bot
                </button>
              </div>
            ) : botStatus.status === 'qr_ready' && botStatus.qr ? (
              <div className="whatsapp-connection-box">
                <div className="status-indicator" style={{ marginBottom: '8px' }}>
                  <span className="pulse-dot qr_ready"></span>
                  <span style={{ color: '#d97706' }}>Scan QR Code to Link</span>
                </div>
                <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '320px' }}>
                  Open WhatsApp on your phone, go to Linked Devices, select "Link a Device", and scan this QR code.
                </p>
                <img src={botStatus.qr} alt="WhatsApp QR Code" className="qr-code-image" />
                <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  Refresh QR
                </button>
              </div>
            ) : (
              <div className="whatsapp-connection-box">
                <div className="status-indicator" style={{ marginBottom: '16px' }}>
                  <span className="pulse-dot initializing"></span>
                  <span>Connecting to WhatsApp...</span>
                </div>
                <span className="loading-spinner"></span>
                <p style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
                  Initializing browser engine. This might take up to a minute if starting for the first time.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">🐝 Quick Instructions</h2>
          <div style={{ padding: '8px 0', fontSize: '14.5px', color: '#334155' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>1. Edit Services:</strong> Go to the <strong>Services</strong> tab to customize the services you offer. The bot automatically updates its service menus instantly!
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong>2. Testing the Bot:</strong> You can test the exact state machine (welcome messages, service options, name & email collection) using the <strong>Bot Simulator</strong> tab without needing to link your phone.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong>3. Excel Leads File:</strong> The registrations are stored in <code>leads.xlsx</code> in the project folder. You can download this file from the <strong>Leads</strong> tab.
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>4. SMTP Settings:</strong> Make sure to update the SMTP options in the <strong>Settings</strong> tab so the bot can send notifications to both you and your client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SERVICES TAB ====================
function ServicesTab({ services, onRefresh }) {
  const [editingService, setEditingService] = useState(null); // service object or 'new'
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const startEdit = (s) => {
    setEditingService(s);
    setFormData({ name: s.name, description: s.description });
  };

  const startAdd = () => {
    setEditingService('new');
    setFormData({ name: '', description: '' });
  };

  const cancelEdit = () => {
    setEditingService(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description) return;
    setSubmitting(true);

    let updatedList;
    if (editingService === 'new') {
      const newId = String(Date.now());
      updatedList = [...services, { id: newId, ...formData }];
    } else {
      updatedList = services.map(s => s.id === editingService.id ? { ...s, ...formData } : s);
    }

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        setEditingService(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service? The bot will no longer show this service in its menus.')) return;
    const updatedList = services.filter(s => s.id !== id);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting service');
    }
  };

  return (
    <div className="card">
      <div className="flex-between">
        <h2 className="card-title" style={{ border: 'none', margin: 0, padding: 0 }}>🛠️ Manage Services</h2>
        {!editingService && (
          <button onClick={startAdd} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13.5px' }}>
            ➕ Add Service
          </button>
        )}
      </div>

      <p className="section-desc">
        These services are displayed dynamically in the WhatsApp bot response. You can add, edit, or remove services here, and the bot will update its options instantly.
      </p>

      {editingService ? (
        <form onSubmit={handleSave} style={{ border: '1px solid var(--color-border)', padding: '20px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', backgroundColor: '#fcfbf7' }}>
          <h3 style={{ marginBottom: '16px' }}>{editingService === 'new' ? 'Create New Service' : 'Edit Service'}</h3>
          <div className="form-group">
            <label className="form-label">Service Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="e.g. Website Design"
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description / Subtitle (Shown in menus)</label>
            <textarea 
              className="form-textarea" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Provide a short description of the service..."
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              {submitting ? 'Saving...' : 'Save Service'}
            </button>
            <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="services-grid">
        {services.map((s, index) => (
          <div className="service-card" key={s.id}>
            <div className="service-card-header">
              <span className="service-card-num">0{index + 1}</span>
              <div className="service-card-actions">
                <button onClick={() => startEdit(s)} className="icon-btn" title="Edit">✏️</button>
                <button onClick={() => handleDelete(s.id)} className="icon-btn delete" title="Delete">🗑️</button>
              </div>
            </div>
            <div className="service-name-display">{s.name}</div>
            <div className="service-desc-display">{s.description}</div>
          </div>
        ))}
        {services.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', gridColumn: '1/-1', padding: '32px' }}>
            No services configured. Click "Add Service" above to get started.
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== LEADS TAB ====================
function LeadsTab({ leads, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm) ||
    l.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card">
      <div className="flex-between">
        <h2 className="card-title" style={{ border: 'none', margin: 0, padding: 0 }}>👥 Leads Directory</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/api/leads/download" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '13.5px' }}>
            📤 Export Excel Sheet
          </a>
          <button onClick={onRefresh} className="btn btn-secondary" style={{ padding: '10px 14px' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <p className="section-desc">
        A list of customers who completed the intake form either directly on WhatsApp or using the Web registration link.
        This directory is synchronized with the <code>leads.xlsx</code> file in your project folder.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search leads by name, email, phone, or service..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Selected Service</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Source</th>
              <th>Registered At</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(l => (
              <tr key={l.id}>
                <td><strong>{l.name}</strong></td>
                <td><span style={{ color: '#b45309', fontWeight: '600' }}>{l.service}</span></td>
                <td><a href={`tel:${l.phone}`}>{l.phone}</a></td>
                <td><a href={`mailto:${l.email}`}>{l.email}</a></td>
                <td>
                  <span className={`badge ${l.source === 'WhatsApp' ? 'badge-success' : l.source === 'Simulator' ? 'badge-warning' : 'badge-info'}`}>
                    {l.source}
                  </span>
                </td>
                <td>{new Date(l.timestamp).toLocaleString()}</td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== SIMULATOR TAB ====================
function SimulatorTab({ services, config, onLeadAdded }) {
  const [chatUser] = useState(`user-${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hi! Send any message to start the chatbot simulation.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [simulating, setSimulating] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll chat to bottom
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || simulating) return;

    const userMsgText = inputText;
    setInputText('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsgText }]);
    setSimulating(true);

    try {
      const res = await fetch('/api/simulator/msg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: chatUser, message: userMsgText })
      });
      const data = await res.json();
      
      if (data.replies && data.replies.length > 0) {
        // Render replies with delay to feel natural
        for (let i = 0; i < data.replies.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 800));
          setMessages(prev => [...prev, { id: Date.now() + i, sender: 'bot', text: data.replies[i] }]);
        }

        // If the registration was finalized in this flow, refresh leads directory
        if (data.replies.some(text => text.includes("registration is complete") || text.includes("registration has been completed"))) {
          onLeadAdded();
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'Error connecting to chatbot simulator service.' }]);
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/simulator/msg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: chatUser, message: 'reset' })
      });
      setMessages([
        { id: 1, sender: 'bot', text: 'Chatbot session reset. Send any message to start fresh!' }
      ]);
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="card">
      <div className="flex-between">
        <h2 className="card-title" style={{ border: 'none', margin: 0, padding: 0 }}>💬 Live Chatbot Simulator</h2>
        <button onClick={handleReset} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
          🔄 Reset Chat Session
        </button>
      </div>
      
      <p className="section-desc">
        Interact with the chatbot right here to check formatting, test the services configuration, and verify Name/Email collection. 
        Submitting a simulation lead will update the Excel sheet and trigger SMTP emails exactly like a real user!
      </p>

      <div className="simulator-layout">
        <div className="simulator-info">
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Testing Commands</h3>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
            Type any message (e.g. <code>hello</code>) to trigger the initial welcome and see the services list.
          </p>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
            Reply with the index number (like <code>1</code>, <code>2</code>, <code>3</code>) to pick a service.
          </p>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
            Reply <code>chat</code> to fill out the lead sheet details inside this interface.
          </p>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
            Type <code>menu</code> or click the reset button at any point to go back to the welcome state.
          </p>
        </div>

        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-avatar">🐝</div>
            <div className="chat-bot-info">
              <span className="chat-bot-name">{config.businessName} Assistant</span>
              <span className="chat-bot-status">online</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`message-bubble ${m.sender === 'bot' ? 'incoming' : 'outgoing'}`}>
                {m.text}
                <span className="message-time">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {simulating && (
              <div className="message-bubble incoming" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '12px' }}>
                <span className="loading-spinner" style={{ width: '12px', height: '12px', margin: 0 }}></span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="chat-footer">
            <input
              type="text"
              className="chat-input"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type your reply here..."
              disabled={simulating}
              required
            />
            <button type="submit" className="chat-send-btn" disabled={simulating}>
              ➡️
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==================== SETTINGS TAB ====================
function SettingsTab({ config, onRefresh }) {
  const [formData, setFormData] = useState({ ...config });
  const [loading, setLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    setFormData({ ...config });
  }, [config]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      smtp: {
        ...prev.smtp,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: 'Configuration settings updated successfully.' });
        onRefresh();
      } else {
        setStatus({ type: 'danger', msg: 'Failed to update configuration.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'danger', msg: 'Network error saving configurations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTestEmailLoading(true);
    setStatus({ type: '', msg: '' });
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.smtp)
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: 'SMTP Connection Test successful! Mail server is working.' });
      } else {
        setStatus({ type: 'danger', msg: `SMTP Test failed: ${data.error}` });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'danger', msg: 'Connection error during SMTP test.' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="card">
      <h2 className="card-title">⚙️ General & SMTP Configuration</h2>
      <p className="section-desc">
        Alter the default bot replies, business branding metadata, and Nodemailer mail dispatcher credentials.
      </p>

      {status.msg && (
        <div className={`alert-message ${status.type}`}>
          <span>{status.type === 'success' ? '✅' : '⚠️'}</span>
          {status.msg}
        </div>
      )}

      <h3 style={{ fontSize: '16px', margin: '20px 0 10px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
        Business Branding
      </h3>
      
      <div className="form-group">
        <label className="form-label">Business Name</label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName || ''}
          onChange={handleChange}
          className="form-input"
          required
        />
      </div>

      <h3 style={{ fontSize: '16px', margin: '20px 0 10px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
        WhatsApp Bot Script Templates
      </h3>

      <div className="form-group">
        <label className="form-label">Welcome Message Script (Use <code>{'{services}'}</code> where the list of services should go)</label>
        <textarea
          name="welcomeMessage"
          value={formData.welcomeMessage || ''}
          onChange={handleChange}
          className="form-textarea"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Registration Success Confirmation Message</label>
        <textarea
          name="registrationSuccessMessage"
          value={formData.registrationSuccessMessage || ''}
          onChange={handleChange}
          className="form-textarea"
          required
        />
      </div>

      <h3 style={{ fontSize: '16px', margin: '20px 0 10px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
        📊 Google Sheets Sync (100% Free & Permanent)
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
        If you deploy on Render Free Tier, this option keeps your database sync'd forever on Google Drive for free.
      </p>
      
      <div className="form-group">
        <label className="form-label">Google Sheets Webhook URL</label>
        <input
          type="text"
          name="googleSheetsWebhook"
          value={formData.googleSheetsWebhook || ''}
          onChange={handleChange}
          placeholder="https://script.google.com/macros/s/.../exec"
          className="form-input"
        />
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13.5px', marginBottom: '20px', color: 'var(--color-text-main)' }}>
        <h4 style={{ fontSize: '14.5px', marginBottom: '8px', fontWeight: 'bold' }}>📋 How to setup your Google Sheet:</h4>
        <ol style={{ paddingLeft: '16px', marginBottom: '12px', lineHeight: '1.6' }}>
          <li style={{ marginBottom: '4px' }}>Open <a href="https://sheets.new" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-primary-hover)', fontWeight: 'bold' }}><strong>sheets.new</strong></a> to create a new Google Sheet.</li>
          <li style={{ marginBottom: '4px' }}>Go to the top menu ➡️ <strong>Extensions</strong> ➡️ <strong>Apps Script</strong>.</li>
          <li style={{ marginBottom: '4px' }}>Delete any default code in the editor, and paste the code block below.</li>
          <li style={{ marginBottom: '4px' }}>Click <strong>Deploy</strong> (top right) ➡️ <strong>New deployment</strong>.</li>
          <li style={{ marginBottom: '4px' }}>Click the gear icon next to "Select type" and choose <strong>Web App</strong>.</li>
          <li style={{ marginBottom: '4px' }}>Configure it: Set "Execute as" to <strong>Me</strong> and "Who has access" to <strong>Anyone</strong> (this allows the bot to write data securely).</li>
          <li style={{ marginBottom: '4px' }}>Click <strong>Deploy</strong>, copy the generated <strong>Web App URL</strong>, and paste it into the "Google Sheets Webhook URL" field above!</li>
        </ol>
        
        <label className="form-label" style={{ fontSize: '12.5px', color: 'var(--color-charcoal)', fontWeight: 'bold', marginTop: '12px', display: 'block' }}>Click inside box to copy Apps Script Code:</label>
        <textarea
          readOnly
          className="form-textarea"
          style={{ minHeight: '140px', fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#334155', cursor: 'pointer' }}
          value={`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add headers if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Lead ID", "Name", "Email", "Phone", "Service Selected", "Source", "Registered At"]);
    }
    
    sheet.appendRow([
      data.id,
      data.name,
      data.email,
      data.phone,
      data.service,
      data.source,
      new Date(data.timestamp).toLocaleString()
    ]);
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
          onClick={(e) => { 
            e.target.select(); 
            navigator.clipboard.writeText(e.target.value);
            alert('Google Apps Script code copied to clipboard!'); 
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--color-text-light)', display: 'block', marginTop: '6px' }}>
          💡 Tip: Click inside the gray text box above to copy the script code immediately.
        </span>
      </div>

      <h3 style={{ fontSize: '16px', margin: '20px 0 10px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
        Nodemailer SMTP Email Settings
      </h3>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">SMTP Host</label>
          <input
            type="text"
            name="host"
            value={formData.smtp?.host || ''}
            onChange={handleSmtpChange}
            placeholder="e.g. smtp.gmail.com"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">SMTP Port</label>
          <input
            type="number"
            name="port"
            value={formData.smtp?.port || 587}
            onChange={handleSmtpChange}
            placeholder="e.g. 587"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">SMTP Username (Email Address)</label>
          <input
            type="text"
            name="user"
            value={formData.smtp?.user || ''}
            onChange={handleSmtpChange}
            placeholder="e.g. your-email@gmail.com"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">SMTP Password / App Password</label>
          <input
            type="password"
            name="pass"
            value={formData.smtp?.pass || ''}
            onChange={handleSmtpChange}
            placeholder="Enter App Password"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Sender Email Envelope Header ("From")</label>
          <input
            type="text"
            name="from"
            value={formData.smtp?.from || ''}
            onChange={handleSmtpChange}
            placeholder='e.g. "GrowBuzz Info" <no-reply@growbuzz.online>'
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Admin Alert Target Email</label>
          <input
            type="email"
            name="adminEmail"
            value={formData.smtp?.adminEmail || ''}
            onChange={handleSmtpChange}
            placeholder="e.g. admin@growbuzz.online"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="secure"
            checked={formData.smtp?.secure || false}
            onChange={handleSmtpChange}
          />
          Use SSL/TLS Connection (Required for Port 465)
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Saving...' : 'Save Configurations'}
        </button>
        <button type="button" onClick={handleTestEmail} disabled={testEmailLoading} className="btn btn-secondary">
          {testEmailLoading ? 'Testing...' : 'Test SMTP Connection'}
        </button>
      </div>
    </form>
  );
}

export default Admin;
