import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import ComparisonModal from './components/ComparisonModal';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Use environment variable in production, localhost in development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function App() {
  // User authentication
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('miraUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Properties
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [savedProperties, setSavedProperties] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [bedsFilter, setBedsFilter] = useState('');
  
  // View mode: 'all' or 'favorites'
  const [viewMode, setViewMode] = useState('all');
  
  // Comparison - stored in MongoDB
  const [comparisonList, setComparisonList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Property Details Modal
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [toast, setToast] = useState(null);
  const messagesEndRef = useRef(null);

  // Get unique locations for filter dropdown
  const locations = [...new Set(allProperties.map(p => p.location))];

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('miraUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('miraUser');
    }
  }, [user]);

  // Verify session on app load
  useEffect(() => {
    const verifySession = async () => {
      const savedUser = localStorage.getItem('miraUser');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          const res = await axios.post(`${API_URL}/api/auth/verify`, { 
            username: userData.username 
          });
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            // Session invalid, clear it
            localStorage.removeItem('miraUser');
            setUser(null);
          }
        } catch (e) {
          // Verification failed, clear session
          localStorage.removeItem('miraUser');
          setUser(null);
        }
      }
    };
    verifySession();
  }, []);

  useEffect(() => {
    fetchProperties();
    if (user) {
      fetchSavedProperties();
      fetchComparisonList();
    }
    initChat();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Parse search term for smart filters
  const parseSearchQuery = (query) => {
    let text = query.toLowerCase();
    const parsed = { text: '' };
    
    // Extract bedrooms - flexible matching for many variations
    const bedPattern = /(\d+)\s*[-]?\s*(bed|beds|bedroom|bedrooms|bhk|br|rk|b)\b/i;
    const bedMatch = text.match(bedPattern);
    if (bedMatch) {
      parsed.beds = parseInt(bedMatch[1]);
      text = text.replace(bedMatch[0], ' ');
    }
    
    // Extract price - flexible matching
    const pricePattern = /(under|below|less than|budget|max|upto|up to|<)?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|m|million|thousand|lac|lakh)?\b/i;
    const priceMatch = text.match(pricePattern);
    if (priceMatch && priceMatch[1]) { // Only if there's a price keyword
      let price = parseFloat(priceMatch[2].replace(/,/g, ''));
      const suffix = (priceMatch[3] || '').toLowerCase();
      
      if (suffix === 'k' || suffix === 'thousand') price *= 1000;
      else if (suffix === 'm' || suffix === 'million') price *= 1000000;
      else if (suffix === 'lac' || suffix === 'lakh') price *= 100000;
      else if (price < 10000) price *= 1000;
      
      // Ensure clean integer (no floating point issues on mobile)
      parsed.maxPrice = Math.round(price);
      text = text.replace(priceMatch[0], ' ');
    }
    
    // Clean up remaining text - this becomes the location/title search
    parsed.text = text
      .replace(/\s+/g, ' ')
      .replace(/\b(in|at|for|the|with|and|a|an|show|me|find|get|looking|want|need|properties|property|homes|home|house|houses|apartment|apartments|flat|flats)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return parsed;
  };

  // Apply all filters
  useEffect(() => {
    let results = [...allProperties];
    
    // Parse search term for smart filtering
    const parsed = parseSearchQuery(searchTerm);
    
    // Text search (remaining text after parsing)
    if (parsed.text) {
      const lower = parsed.text.toLowerCase();
      results = results.filter(p =>
        p.title.toLowerCase().includes(lower) ||
        p.location.toLowerCase().includes(lower) ||
        p.amenities?.some(a => a.toLowerCase().includes(lower))
      );
    }
    
    // Beds from search term (exact match)
    if (parsed.beds) {
      results = results.filter(p => p.bedrooms === parsed.beds);
    }
    
    // Price from search term
    if (parsed.maxPrice) {
      results = results.filter(p => p.price <= parsed.maxPrice);
    }
    
    // Location dropdown filter
    if (locationFilter) {
      results = results.filter(p => p.location === locationFilter);
    }
    
    // Price dropdown filter
    if (priceFilter) {
      const maxPrice = parseInt(priceFilter);
      results = results.filter(p => p.price <= maxPrice);
    }
    
    // Beds dropdown filter
    if (bedsFilter) {
      const minBeds = parseInt(bedsFilter);
      results = results.filter(p => p.bedrooms >= minBeds);
    }
    
    setFilteredProperties(results);
  }, [searchTerm, locationFilter, priceFilter, bedsFilter, allProperties]);

  const fetchProperties = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/properties`);
      setAllProperties(res.data);
      setFilteredProperties(res.data);
    } catch (e) {
      console.error('Failed to load properties');
    }
  };

  const fetchSavedProperties = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/api/saved?username=${user.username}`);
      setSavedProperties(res.data);
      setSavedIds(res.data.map(p => p.id));
    } catch (e) {
      console.error('Failed to load saved properties');
    }
  };

  const fetchComparisonList = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/api/comparison?username=${user.username}`);
      setComparisonList(res.data);
    } catch (e) {
      console.error('Failed to load comparison list');
    }
  };

  const initChat = () => {
    setMessages([{ 
      sender: 'bot', 
      text: "Hello! I'm Mira, your personal real estate assistant. How can I help you find your perfect home today?" 
    }]);
  };

  const navigate = useNavigate();

  // Login handler (called from Login/Signup pages)
  const handleLogin = (userData) => {
    setUser(userData);
    showToast(`Welcome, ${userData.username}!`);
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setSavedIds([]);
    setSavedProperties([]);
    setComparisonList([]);
    showToast('Logged out');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setPriceFilter('');
    setBedsFilter('');
  };

  // Save
  const handleSave = async (id) => {
    // Require login
    if (!user) {
      navigate('/login');
      return;
    }
    
    setIsChatOpen(false); // Auto-close chat
    
    const isAlreadySaved = savedIds.includes(id);
    
    if (isAlreadySaved) {
      // Remove from favorites
      try {
        await axios.delete(`${API_URL}/api/saved/${id}?username=${user.username}`);
        setSavedIds(prev => prev.filter(i => i !== id));
        fetchSavedProperties();
        showToast('Removed from favorites');
      } catch (e) {
        showToast('Error removing');
      }
    } else {
      // Add to favorites
      try {
        await axios.post(`${API_URL}/api/saved`, { propertyId: id, username: user.username });
        setSavedIds(prev => [...prev, id]);
        fetchSavedProperties();
        showToast('Added to favorites ♥');
      } catch (e) {
        showToast('Error saving');
      }
    }
  };

  // Remove from comparison - using MongoDB
  const handleRemoveFromComparison = async (id) => {
    if (!user) return;
    try {
      await axios.delete(`${API_URL}/api/comparison/${id}?username=${user.username}`);
      fetchComparisonList();
    } catch (e) {
      showToast('Error removing from comparison');
    }
  };

  // Clear all comparison - using MongoDB
  const handleClearComparison = async () => {
    if (!user) return;
    try {
      await axios.delete(`${API_URL}/api/comparison?username=${user.username}`);
      setComparisonList([]);
      setShowComparison(false);
    } catch (e) {
      showToast('Error clearing comparison');
    }
  };

  // Compare - using MongoDB
  const handleCompare = async (property) => {
    // Require login
    if (!user) {
      navigate('/login');
      return;
    }
    
    setIsChatOpen(false); // Auto-close chat
    
    const exists = comparisonList.find(p => p.id === property.id);
    
    if (exists) {
      // Remove from comparison
      try {
        await axios.delete(`${API_URL}/api/comparison/${property.id}?username=${user.username}`);
        fetchComparisonList();
      } catch (e) {
        showToast('Error removing from comparison');
      }
        } else {
      // Add to comparison
      if (comparisonList.length >= 3) {
        showToast('Maximum 3 properties for comparison');
        return;
      }
      try {
        await axios.post(`${API_URL}/api/comparison`, { propertyId: property.id, username: user.username });
        fetchComparisonList();
      } catch (e) {
        showToast('Error adding to comparison');
      }
    }
  };

  // Open comparison modal
  const openComparison = () => {
    setIsChatOpen(false); // Auto-close chat
    setShowComparison(true);
  };

  // Chat
  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const text = chatInput.trim();
    const newMessage = { sender: 'user', text };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setChatInput('');
    setIsTyping(true);

    try {
      // Send conversation history for context
      const res = await axios.post(`${API_URL}/api/chat`, { 
        message: text,
        history: updatedMessages 
      });
      const { message: botText, filters } = res.data;
      
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: botText }]);
      
      // Apply filters from AI to main grid
      if (filters && filters.action !== 'saved') {
        applyAIFilters(filters);
      }
    } catch (e) {
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Connection error. Please try again.' }]);
    }
  };

  const applyAIFilters = (filters) => {
    // Update filter dropdowns based on AI response (silent, no toast)
    if (filters.location) {
      const matchedLocation = locations.find(l => 
        l.toLowerCase().includes(filters.location.toLowerCase())
      );
      if (matchedLocation) setLocationFilter(matchedLocation);
    }
    if (filters.maxPrice) {
      // Ensure price is a clean integer (no floating point issues)
      const cleanPrice = Math.round(Number(filters.maxPrice));
      setPriceFilter(cleanPrice.toString());
    }
    if (filters.bedrooms) {
      setBedsFilter(filters.bedrooms.toString());
    }
  };

  const handleSuggestion = (text) => {
    setChatInput(text);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || locationFilter || priceFilter || bedsFilter;

  // Main app content (as JSX variable, not function, to prevent re-mounting on state change)
  const mainContent = (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo" onClick={() => window.location.reload()}>
          <div className="logo-icon">🏛</div>
          <div className="logo-text">Mira<span>Estates</span></div>
        </div>

        <div className="filters-wrapper">
          <div className="search-bar">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Try: 3 beds in Miami under 500k"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <select 
              value={locationFilter} 
              onChange={(e) => setLocationFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            
            <select 
              value={priceFilter} 
              onChange={(e) => setPriceFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Any Price</option>
              <option value="300000">Under $300k</option>
              <option value="500000">Under $500k</option>
              <option value="750000">Under $750k</option>
              <option value="1000000">Under $1M</option>
            </select>
            
            <select 
              value={bedsFilter} 
              onChange={(e) => setBedsFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Any Beds</option>
              <option value="1">1+ Beds</option>
              <option value="2">2+ Beds</option>
              <option value="3">3+ Beds</option>
              <option value="4">4+ Beds</option>
            </select>
            
            {hasActiveFilters && (
              <button className="clear-filters" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="header-actions">
          {user && (
            <>
              {viewMode === 'favorites' && (
                <button 
                  className="view-toggle"
                  onClick={() => setViewMode('all')}
                >
                  ← Back to All
                </button>
              )}
              <button 
                className={`view-toggle favorites ${viewMode === 'favorites' ? 'active' : ''}`}
                onClick={() => setViewMode('favorites')}
              >
                ♥ Favorites ({savedProperties.length})
              </button>
            </>
          )}
          
          {user ? (
            <div className="user-menu">
              <span className="user-name">👤 {user.username}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="main">
        <div className="section-header">
          <h1 className="section-title">
            {viewMode === 'favorites' 
              ? 'Your Favorites' 
              : hasActiveFilters 
                ? 'Filtered Results' 
                : 'Exclusive Properties'}
          </h1>
          <p className="section-subtitle">
            {viewMode === 'favorites'
              ? `${savedProperties.length} saved properties`
              : hasActiveFilters 
                ? `Showing ${filteredProperties.length} of ${allProperties.length} properties`
                : 'Discover luxury homes curated for refined living'
            }
          </p>
        </div>

        {(viewMode === 'favorites' ? savedProperties : filteredProperties).length === 0 ? (
          <div className="no-results">
            <h3>{viewMode === 'favorites' ? 'No favorites yet' : 'No properties found'}</h3>
            <p>{viewMode === 'favorites' ? 'Save properties by clicking the ♥ button' : 'Try adjusting your filters or chat with Mira for help'}</p>
            {viewMode !== 'favorites' && <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>}
              </div>
        ) : (
          <div className="property-grid">
            {(viewMode === 'favorites' ? savedProperties : filteredProperties).map(property => (
              <div key={property.id} className="property-card">
                <div className="property-image">
                  <img src={property.image_url} alt={property.title} />
                  <span className="property-badge">Featured</span>
                  <button 
                    className={`property-save ${savedIds.includes(property.id) ? 'saved' : ''}`}
                    onClick={() => handleSave(property.id)}
                    title={savedIds.includes(property.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ♥
                  </button>
                  {viewMode === 'favorites' && (
                    <button 
                      className="remove-favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(property.id);
                      }}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                <div className="property-content">
                  <div className="property-price">${property.price?.toLocaleString('en-US')}</div>
                  <h3 className="property-title">{property.title}</h3>
                  <div className="property-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {property.location}
                  </div>
                  <div className="property-features">
                    <div className="feature">
                      <span className="feature-icon">🛏</span>
                      <span>{property.bedrooms} Beds</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">🚿</span>
                      <span>{property.bathrooms} Baths</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">📐</span>
                      <span>{property.size_sqft?.toLocaleString('en-US')} sqft</span>
                    </div>
                  </div>
                  <div className="property-actions">
                    <button className="btn btn-primary" onClick={() => setSelectedProperty(property)}>View Details</button>
                    <button 
                      className={`btn btn-secondary ${comparisonList.find(p => p.id === property.id) ? 'active' : ''}`}
                      onClick={() => handleCompare(property)}
                    >
                      {comparisonList.find(p => p.id === property.id) ? '✓ Selected' : 'Compare'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Compare Bucket - Small floating button */}
      {comparisonList.length > 0 && (
        <button className="compare-bucket" onClick={openComparison}>
          <span className="bucket-icon">⚖️</span>
          <span className="bucket-count">{comparisonList.length}</span>
        </button>
      )}

      {/* Chat Widget */}
      <div className="chat-widget">
        {isChatOpen && (
          <div className="chat-window">
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">🏛</div>
                <div>
                  <div className="chat-title">Mira Assistant</div>
                  <div className="chat-status">Online</div>
                </div>
              </div>
              <button className="chat-close" onClick={() => setIsChatOpen(false)}>×</button>
            </div>

            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.sender}`}>
                  <div className="chat-bubble">{msg.text}</div>
            </div>
          ))}
          {isTyping && (
                <div className="chat-message bot">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

            <div className="chat-input-area">
              <div className="chat-input-wrapper">
            <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask me anything..."
                />
                <button className="chat-send-btn" onClick={sendMessage}>➤</button>
          </div>
              <div className="chat-suggestions">
                <button className="chat-suggestion" onClick={() => handleSuggestion('Show luxury homes')}>
                  Luxury homes
            </button>
                <button className="chat-suggestion" onClick={() => handleSuggestion('Under 500k')}>
                  Under $500k
            </button>
                <button className="chat-suggestion" onClick={() => handleSuggestion('3 bedroom in Miami')}>
                  Miami 3BR
            </button>
          </div>
        </div>
      </div>
        )}
        <button className="chat-toggle" onClick={() => setIsChatOpen(!isChatOpen)}>
          {isChatOpen ? '×' : '💬'}
        </button>
        </div>

      {/* Comparison Modal */}
      {showComparison && (
        <ComparisonModal 
          properties={comparisonList} 
          onClose={() => setShowComparison(false)} 
          onClear={handleClearComparison}
          onRemove={handleRemoveFromComparison}
        />
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="modal-overlay" onClick={() => setSelectedProperty(null)}>
          <div className="property-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedProperty(null)}>×</button>
            
            <div className="detail-image">
              <img src={selectedProperty.image_url} alt={selectedProperty.title} />
            </div>
            
            <div className="detail-content">
              <div className="detail-header">
                <h2>{selectedProperty.title}</h2>
                <div className="detail-price">${selectedProperty.price?.toLocaleString('en-US')}</div>
              </div>
              
              <div className="detail-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {selectedProperty.location}
              </div>
              
              <div className="detail-specs">
                <div className="detail-spec">
                  <span className="spec-value">{selectedProperty.bedrooms}</span>
                  <span className="spec-label">Bedrooms</span>
                </div>
                <div className="detail-spec">
                  <span className="spec-value">{selectedProperty.bathrooms}</span>
                  <span className="spec-label">Bathrooms</span>
                </div>
                <div className="detail-spec">
                  <span className="spec-value">{selectedProperty.size_sqft?.toLocaleString('en-US')}</span>
                  <span className="spec-label">Sq Ft</span>
                </div>
              </div>
              
              <div className="detail-section">
                <h3>Amenities</h3>
                <div className="detail-amenities">
                  {selectedProperty.amenities?.map((amenity, i) => (
                    <span key={i} className="amenity-tag">{amenity}</span>
                  ))}
                </div>
              </div>
              
              <div className="detail-actions">
                <button 
                  className={`btn btn-primary ${savedIds.includes(selectedProperty.id) ? 'saved' : ''}`}
                  onClick={() => handleSave(selectedProperty.id)}
                >
                  {savedIds.includes(selectedProperty.id) ? '♥ Saved' : '♡ Save to Favorites'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    handleCompare(selectedProperty);
                    setSelectedProperty(null);
                  }}
                >
                  Add to Compare
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      <Route path="/*" element={user ? mainContent : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
