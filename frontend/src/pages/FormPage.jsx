import React, { useState, useEffect } from 'react';

function FormPage() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // 1. Fetch available services for the dropdown selection
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        
        // 2. Parse query parameters from URL
        const params = new URLSearchParams(window.location.search);
        const urlService = params.get('service') || '';
        const urlPhone = params.get('phone') || '';
        
        setFormData(prev => ({
          ...prev,
          phone: urlPhone,
          // Prefill with the query parameter service, or select the first available service
          service: urlService || (data.length > 0 ? data[0].name : '')
        }));
      })
      .catch(err => {
        console.error('Error fetching services:', err);
      });

    // Fetch config for success message
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        if (config.registrationSuccessMessage) {
          setSuccessMessage(config.registrationSuccessMessage);
        }
      })
      .catch(err => console.error('Error fetching config:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.service) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please check if the server is running.');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lead-form-page">
      <div className="lead-form-card">
        {submitted ? (
          <div className="lead-success-card">
            <span className="lead-success-icon" role="img" aria-label="success">🐝</span>
            <h2 className="lead-success-title">Registration Done!</h2>
            <p className="lead-success-text">
              {successMessage || "Our registration is been done and our team will contact you for further detail and procedor within next 6-9 working hour."}
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              We have sent a confirmation email to <strong>{formData.email}</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="lead-form-header">
              <div className="lead-form-logo">🐝</div>
              <h1 className="lead-form-title">GrowBuzz</h1>
              <p className="lead-form-subtitle">Complete your registration to get started</p>
            </div>
            
            <form onSubmit={handleSubmit} className="lead-form-body">
              {error && (
                <div className="alert-message danger">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="service-select">Interested Service</label>
                <select
                  id="service-select"
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="" disabled>Select a service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="name-input">Full Name</label>
                <input
                  type="text"
                  id="name-input"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Omkar Prasad"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone-input">Phone Number</label>
                <input
                  type="tel"
                  id="phone-input"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 9850774901"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email-input">Email Address</label>
                <input
                  type="email"
                  id="email-input"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. name@example.com"
                  className="form-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px' }}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner" style={{ width: '16px', height: '16px', borderTopColor: '#1e1e1e' }}></span>
                    Submitting...
                  </>
                ) : 'Submit Registration'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default FormPage;
