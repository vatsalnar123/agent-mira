const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const dotenv = require('dotenv');
const { loadData } = require('./data_merger');
const SavedProperty = require('./models/SavedProperty');
const ComparisonList = require('./models/ComparisonList');
const User = require('./models/User');

// Load environment variables.
// Supports either `server/.env` (recommended) or project-root `.env`.
const envFromServer = dotenv.config({ path: path.resolve(__dirname, '.env') });
const envFromRoot = dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
if (!process.env.GEMINI_API_KEY) {
  const serverCount = envFromServer?.parsed ? Object.keys(envFromServer.parsed).length : 0;
  const rootCount = envFromRoot?.parsed ? Object.keys(envFromRoot.parsed).length : 0;
  console.log(`⚠️ dotenv loaded keys - server/.env: ${serverCount}, root .env: ${rootCount}`);
}

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Load property data
const properties = loadData();
console.log(`Loaded ${properties.length} properties`);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is required');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB connection error:', err.message));

// Gemini AI Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env['Gemini-api-key'];
let genAI = null;
let model = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // Using Gemini 3 Pro Preview as requested
  model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
  console.log('✅ Gemini AI initialized (Gemini 3 Pro Preview)');
} else {
  console.log('⚠️ No GEMINI_API_KEY found - using smart keyword extraction');
}

// Location mapping
const locationMap = {
  'new york': 'New York',
  'nyc': 'New York',
  'ny': 'New York',
  'miami': 'Miami',
  'los angeles': 'Los Angeles',
  'la': 'Los Angeles',
  'austin': 'Austin',
  'san francisco': 'San Francisco',
  'sf': 'San Francisco',
  'chicago': 'Chicago',
  'dallas': 'Dallas',
  'seattle': 'Seattle',
  'boston': 'Boston'
};

// Filter properties
const filterProperties = (filters) => {
  let results = [...properties];
  
  if (filters.location) {
    const searchLoc = filters.location.toLowerCase();
    results = results.filter(p => 
      p.location.toLowerCase().includes(searchLoc)
    );
  }
  
  if (filters.maxPrice) {
    results = results.filter(p => p.price <= Number(filters.maxPrice));
  }
  
  if (filters.minPrice) {
    results = results.filter(p => p.price >= Number(filters.minPrice));
  }
  
  if (filters.bedrooms) {
    results = results.filter(p => p.bedrooms >= Number(filters.bedrooms));
  }
  
  return results;
};

// Extract filters from text
const extractFiltersFromText = (text) => {
  const lowerText = text.toLowerCase();
  const filters = { action: 'search' };
  
  // Saved properties
  if (lowerText.includes('saved') || lowerText.includes('bookmark') || lowerText.includes('my properties') || lowerText.includes('favorites')) {
    filters.action = 'saved';
    return filters;
  }
  
  // Show all
  if (lowerText.includes('all properties') || lowerText.includes('show all') || lowerText.includes('everything')) {
    return filters; // No specific filters = all properties
  }
  
  // Location detection
  for (const [key, value] of Object.entries(locationMap)) {
    if (lowerText.includes(key)) {
      filters.location = value;
      break;
    }
  }
  
  // Budget detection
  const budgetPatterns = [
    /under\s*\$?\s*(\d[\d,.]*)\s*(k|m|million)?\b/i,
    /below\s*\$?\s*(\d[\d,.]*)\s*(k|m|million)?\b/i,
    /max\s*\$?\s*(\d[\d,.]*)\s*(k|m|million)?\b/i,
    /budget\s*\$?\s*(\d[\d,.]*)\s*(k|m|million)?\b/i,
    /\$(\d[\d,.]*)\s*(k|m|million)?\b/i,
    /(\d[\d,.]*)\s*(?:million|m)\b/i
  ];
  
  for (const pattern of budgetPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      const suffix = match[2] ? match[2].toLowerCase() : '';
      
      if (suffix === 'k') {
        amount *= 1000;
      } else if (suffix === 'm' || suffix === 'million') {
        amount *= 1000000;
      } else if (amount < 1000) {
         // Assume 'k' if someone types "500" in context of house prices, 
         // but strictly speaking 500 is 500. Let's keep it safe:
         // If it's very small < 1000, likely meant k, but 1 could mean 1 million.
         // Let's rely on explicit suffixes for now, or existing logic:
         if (amount < 200) amount *= 1000; // Legacy heuristic
      }
      
      filters.maxPrice = amount;
      break;
    }
  }
  
  // Bedroom detection (BHK, bed, bedroom, br)
  const bedroomMatch = lowerText.match(/(\d+)\s*(?:bhk|bed|bedroom|br)\b/i);
  if (bedroomMatch) {
    filters.bedrooms = parseInt(bedroomMatch[1]);
  }
  
  return filters;
};

// ============ ROUTES ============

// ============ AUTHENTICATION ============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, name } = req.body;
  
  // Validation
  if (!username || username.length < 3) {
    return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email is required' });
  }
  
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores' });
  }
  
  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();
  
  try {
    // Check if username or email exists
    const existingUser = await User.findOne({ 
      $or: [{ username: cleanUsername }, { email: cleanEmail }] 
    });
    
    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    
    // Create new user (password will be hashed by pre-save hook)
    const user = new User({ 
      username: cleanUsername,
      email: cleanEmail,
      password,
      name: name || ''
    });
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      user: { 
        username: user.username,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  
  const cleanEmail = email.toLowerCase().trim();
  
  try {
    const user = await User.findOne({ email: cleanEmail });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    res.json({ 
      success: true, 
      user: { 
        username: user.username,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// Verify session (check if user exists)
app.post('/api/auth/verify', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }
  
  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Session invalid' });
    }
    
    res.json({ 
      success: true, 
      user: { 
        username: user.username,
        email: user.email,
        name: user.name 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Get properties
app.get('/api/properties', (req, res) => {
  const { location, minPrice, maxPrice, bedrooms } = req.query;
  const filters = {};
  if (location) filters.location = location;
  if (minPrice) filters.minPrice = minPrice;
  if (maxPrice) filters.maxPrice = maxPrice;
  if (bedrooms) filters.bedrooms = bedrooms;
  
  res.json(filterProperties(filters));
});

// Store last used filters per session (simple in-memory, resets on server restart)
let lastFilters = {};

// Smart Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  let filters = { action: 'search' };
  let aiFailed = false;
  
  // Check if this is a follow-up response (yes, sure, show me, etc.)
  const lowerMessage = message.toLowerCase().trim();
  const isFollowUp = /^(yes|yeah|yep|sure|ok|okay|please|show me|show|let's see|go ahead|proceed)/.test(lowerMessage);

  // 1. Try to get filters from AI first
  if (model) {
    try {
      // Build conversation context from history
      let conversationContext = '';
      if (history && history.length > 0) {
        conversationContext = history.slice(-6).map(m => 
          `${m.sender === 'user' ? 'User' : 'Mira'}: ${m.text}`
        ).join('\n');
      }
      
      const prompt = `You are analyzing a chat conversation to extract property search filters.
      
${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}Current user message: "${message}"

${isFollowUp ? `This appears to be a follow-up/confirmation. If the previous message mentioned a location or criteria, USE THOSE SAME FILTERS.` : ''}

Return ONLY a JSON object with these keys (only include keys that are mentioned):
- location (string, e.g. "Miami", "New York")
- maxPrice (number, convert "1 million" to 1000000, "500k" to 500000)
- minPrice (number)
- bedrooms (number)
- action (string: "search" or "saved")

If the user asks to see saved properties, set action to "saved".
If user says yes/sure/show me to a previous property query, extract the filters from that previous query.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean up markdown code blocks if present
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      filters = JSON.parse(jsonStr);
      console.log('🤖 AI Extracted Filters:', filters);
      
      // Store these filters for potential follow-ups
      if (filters.location || filters.maxPrice || filters.bedrooms) {
        lastFilters = { ...filters };
      }
      
    } catch (error) {
      console.error('AI Extraction Error:', error.message);
      aiFailed = true;
    }
  }

  // 2. Fallback to Regex if AI failed or is missing
  if (!model || aiFailed) {
    console.log('⚠️ Using Regex Fallback');
    
    // For follow-ups, use last known filters
    if (isFollowUp && Object.keys(lastFilters).length > 0) {
      filters = { ...lastFilters };
      console.log('↩️ Using last filters for follow-up:', filters);
    } else {
      filters = extractFiltersFromText(message);
      // Store for follow-ups
      if (filters.location || filters.maxPrice || filters.bedrooms) {
        lastFilters = { ...filters };
      }
    }
  }
  
  // Handle saved properties
  if (filters.action === 'saved') {
    return res.json({
      message: "Let me fetch your saved properties! 💾",
      filters,
      properties: [],
      aiEnabled: !!model
    });
  }
  
  // Get exact matches using the extracted filters
  let matchedProperties = filterProperties(filters);
  let responseMessage = '';
  
  // If no exact matches, try to find alternatives
  if (matchedProperties.length === 0 && (filters.location || filters.bedrooms || filters.maxPrice)) {
    // Try relaxing bedroom requirement
    if (filters.bedrooms && filters.location) {
      const locationOnly = filterProperties({ location: filters.location });
      if (locationOnly.length > 0) {
        const maxBeds = Math.max(...locationOnly.map(p => p.bedrooms));
        responseMessage = `There are no ${filters.bedrooms}+ bedroom properties in ${filters.location}. The best option there is a ${maxBeds} bedroom property. Here's what's available:\n\n`;
        matchedProperties = locationOnly;
      }
    }
    
    // Try relaxing location
    if (matchedProperties.length === 0 && filters.bedrooms) {
      const bedroomsOnly = filterProperties({ bedrooms: filters.bedrooms });
      if (bedroomsOnly.length > 0) {
        responseMessage = `No ${filters.bedrooms}+ bedroom properties in ${filters.location || 'that area'}, but I found some in other locations:\n\n`;
        matchedProperties = bedroomsOnly;
      }
    }
    
    // Still nothing - show all
    if (matchedProperties.length === 0) {
      responseMessage = `I couldn't find exact matches for your criteria. Try adjusting your filters (e.g., different location or price). 🏠\n\n`;
    }
  } else if (matchedProperties.length > 0) {
    // Found exact matches
    responseMessage = `🎉 Found ${matchedProperties.length} ${matchedProperties.length === 1 ? 'property' : 'properties'}`;
    if (filters.location) responseMessage += ` in ${filters.location}`;
    if (filters.bedrooms) responseMessage += ` with ${filters.bedrooms}+ bedrooms`;
    if (filters.maxPrice) responseMessage += ` under $${filters.maxPrice.toLocaleString()}`;
    responseMessage += '!\n\nHere are your matches:';
  } else {
    // No filters - show all
    matchedProperties = properties;
    responseMessage = `Here are all ${properties.length} available properties! 🏘️`;
  }
  
  // 3. Generate friendly response (AI Step 2)
  if (model && !aiFailed) {
    try {
      // Build property summary for AI context
      const propertyPreview = matchedProperties.slice(0, 3).map(p => 
        `• ${p.title} in ${p.location} - $${p.price?.toLocaleString()} (${p.bedrooms}BR)`
      ).join('\n');
      
      const prompt = `You are Mira, a friendly real estate assistant chatbot on a property listing website.
      
IMPORTANT CONTEXT: When you find properties, they appear in the MAIN GRID on the left side of the screen (not in this chat). The chat is a floating widget on the right.

User asked: "${message}"
Filters applied: ${JSON.stringify(filters)}
Properties found: ${matchedProperties.length}

${matchedProperties.length > 0 ? `Top matches:\n${propertyPreview}` : ''}

Generate a helpful response following these rules:
1. Be conversational and friendly with 1-2 relevant emojis
2. If properties found: mention the count and say they've been filtered in the main view/grid
3. If NO properties found: suggest adjusting criteria (different location, higher budget, fewer beds)
4. You can briefly mention 1-2 standout properties from the preview if relevant
5. Keep it SHORT (2-3 sentences max)
6. NEVER say "below" or "see below" - properties appear in the main grid, not the chat`;
      
      const result = await model.generateContent(prompt);
      responseMessage = result.response.text();
      console.log('🤖 AI Generated Response:', responseMessage.substring(0, 80) + '...');
    } catch (error) {
      console.error('AI Response Error:', error.message);
      // Fallback to template response if AI fails
      responseMessage = matchedProperties.length > 0 
        ? `Found ${matchedProperties.length} properties for you! Check out the filtered results in the main grid. 🏠`
        : `No properties match those criteria. Try adjusting your search! 🔍`;
    }
  }
  
  res.json({
    message: responseMessage,
    filters,
    properties: matchedProperties,
    aiEnabled: !!model
  });
});

// Save property (requires username)
app.post('/api/saved', async (req, res) => {
  const { propertyId, username } = req.body;
  if (!propertyId) return res.status(400).json({ error: 'Property ID required' });
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    const existing = await SavedProperty.findOne({ propertyId, username: cleanUsername });
    if (existing) return res.json({ message: 'Already saved' });
    
    const saved = new SavedProperty({ propertyId, username: cleanUsername });
    await saved.save();
    res.status(201).json({ message: 'Saved!' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get saved (requires username)
app.get('/api/saved', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    const savedDocs = await SavedProperty.find({ username: cleanUsername }).sort({ savedAt: -1 });
    const savedIds = savedDocs.map(doc => doc.propertyId);
    res.json(properties.filter(p => savedIds.includes(p.id)));
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete saved (requires username)
app.delete('/api/saved/:propertyId', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    await SavedProperty.deleteOne({ propertyId: Number(req.params.propertyId), username: cleanUsername });
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ============ COMPARISON LIST ============

// Get comparison list (requires username)
app.get('/api/comparison', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    const comparisonDocs = await ComparisonList.find({ username: cleanUsername }).sort({ addedAt: -1 });
    const comparisonIds = comparisonDocs.map(doc => doc.propertyId);
    const comparisonProperties = properties.filter(p => comparisonIds.includes(p.id));
    res.json(comparisonProperties);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add to comparison (requires username)
app.post('/api/comparison', async (req, res) => {
  const { propertyId, username } = req.body;
  if (!propertyId) return res.status(400).json({ error: 'Property ID required' });
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    const existing = await ComparisonList.findOne({ propertyId, username: cleanUsername });
    if (existing) return res.json({ message: 'Already in comparison' });
    
    // Limit to 3 properties max per user
    const count = await ComparisonList.countDocuments({ username: cleanUsername });
    if (count >= 3) {
      return res.status(400).json({ error: 'Maximum 3 properties for comparison' });
    }
    
    const comparison = new ComparisonList({ propertyId, username: cleanUsername });
    await comparison.save();
    res.status(201).json({ message: 'Added to comparison!' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Remove from comparison (requires username)
app.delete('/api/comparison/:propertyId', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    await ComparisonList.deleteOne({ propertyId: Number(req.params.propertyId), username: cleanUsername });
    res.json({ message: 'Removed from comparison' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Clear all comparison (requires username)
app.delete('/api/comparison', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const cleanUsername = username.toLowerCase().trim();

  try {
    await ComparisonList.deleteMany({ username: cleanUsername });
    res.json({ message: 'Comparison list cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ai: model ? 'enabled' : 'disabled',
    properties: properties.length
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`📊 ${properties.length} properties loaded`);
  console.log(`🤖 AI: ${model ? 'Gemini enabled' : 'Smart extraction mode'}\n`);
});
