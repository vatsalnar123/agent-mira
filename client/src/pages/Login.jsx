import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { 
        email: email.toLowerCase().trim(),
        password 
      });
      
      if (res.data.success) {
        onLogin(res.data.user);
        navigate('/');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo-link">
              <div className="auth-logo">🏛</div>
            </Link>
            <h1>Welcome Back</h1>
            <p>Sign in to access your saved properties</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email or Username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Create one</Link></p>
          </div>
        </div>

        <div className="auth-info">
          <h2>MiraEstates</h2>
          <p>Find your dream home with our AI-powered real estate assistant</p>
          <ul>
            <li>✓ Save your favorite properties</li>
            <li>✓ Compare up to 3 properties side by side</li>
            <li>✓ Chat with Mira AI assistant</li>
            <li>✓ Smart search with natural language</li>
            <li>✓ Sync across all your devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
