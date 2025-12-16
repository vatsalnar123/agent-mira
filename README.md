# 🏛 Agent Mira - AI-Powered Real Estate Platform

A full-stack real estate application that helps users find their dream homes using natural language conversations powered by Google's Gemini AI.

## 🌐 Live Demo

- **Application**: [https://vatsalnar123.github.io/agent-mira/](https://vatsalnar123.github.io/agent-mira/)


---

## ✨ Features

### 🤖 AI Chat Assistant (Mira)
Mira is an intelligent real estate assistant powered by Google Gemini 3 Pro. Users can ask questions in natural language like:
- *"Show me properties in Miami under 500k"*
- *"I need a 3 bedroom apartment"*
- *"What homes are available in New York?"*

**How it works:**
1. Type your query in the chat widget (bottom-right corner)
2. Mira extracts your preferences (location, price, bedrooms) using AI
3. Properties are automatically filtered in the main grid
4. Mira responds with a helpful summary and suggestions

The chat maintains **conversation context**, so you can have follow-up conversations like:
- User: *"Show me homes in Miami"*
- Mira: *"Found 3 properties in Miami!"*
- User: *"Only under 500k please"*
- Mira: *"Filtered to 2 properties under $500k in Miami"*

---

### ⚖️ Property Comparison
Compare properties side-by-side to make informed decisions.

| Aspect | Details |
|--------|---------|
| **Maximum Properties** | Up to **3 properties** can be compared at once |
| **How to Add** | Click the **"⚖️ Compare"** button on any property card |
| **Access Comparison** | Click the floating **Compare Bucket** button (shows count) |
| **What's Compared** | Price, location, bedrooms, bathrooms, size, amenities |
| **Remove Properties** | Click the "×" on individual properties or "Clear All" |

The comparison modal displays properties in a clean table format, highlighting differences to help you decide.

---

### ❤️ Save to Favorites
Save properties you like to revisit later.

- Click the **"💾 Save"** button or the **heart icon** on any property
- Access favorites by clicking **"View Favorites"** in the header
- Favorites are stored in MongoDB and **persist across sessions and devices**
- Remove from favorites by clicking the "✕ Remove" button when viewing favorites

---

### 🔍 Smart Search Bar
The search bar understands flexible queries:

| Query Type | Examples |
|------------|----------|
| **Location** | "Miami", "New York", "Austin TX" |
| **Bedrooms** | "3 beds", "3br", "3 bedroom", "3bhk" |
| **Price** | "under 500k", "below 1 million", "budget 800000" |
| **Combined** | "3 bed in Miami under 500k" |

---

### 🔐 User Authentication
- **Sign Up**: Create account with username, email, and password
- **Login**: Use either email OR username to login
- **Password Security**: Passwords are hashed using bcrypt
- **Session Persistence**: Stay logged in during your browser session
- **Protected Features**: Saving and comparing require authentication

---

### 📱 Responsive Design
The application adapts to all screen sizes:
- **Desktop**: Full grid layout with sidebar chat
- **Tablet**: Adjusted grid with collapsible elements
- **Mobile**: Single column layout with accessible navigation

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| AI | Google Gemini 3 Pro Preview |
| Hosting | GitHub Pages (Frontend), Heroku (Backend) |

---

## 🚀 Approach & Architecture

### Data Merging Strategy
The application works with three separate JSON files simulating real-world data sources:
- `property_basics.json` - ID, title, price, location
- `property_characteristics.json` - Bedrooms, bathrooms, size, amenities
- `property_images.json` - Property image URLs

These are merged at runtime using a custom `data_merger.js` utility, joining records by their common `id` field.

### AI-First Search Architecture
```
User Query → Gemini AI (Filter Extraction) → Property Filter → Gemini AI (Response Generation)
```

The chatbot uses a two-step AI process:
1. **Filter Extraction**: Gemini parses natural language to extract structured filters (location, price, bedrooms)
2. **Response Generation**: Gemini generates contextual, friendly responses based on results

A regex fallback ensures the system works even if the AI is unavailable.

### Smart Search Implementation
The search bar implements intelligent parsing:
- Recognizes bedroom variations: "3 bed", "3br", "3bhk", "3 bedroom"
- Handles price formats: "$500k", "500000", "under 1 million"
- Location fuzzy matching in property titles and locations

### Authentication Flow
- Password hashing with bcrypt (10 salt rounds)
- Session persistence via localStorage
- Login supports both email AND username
- Protected routes redirect unauthenticated users

---

## 😤 Challenges Faced

### 1. Multi-Step Prompt Handling
The chat required two separate AI calls per user message - first to extract filters (location, price, bedrooms) as JSON, then to generate a conversational response. Coordinating these sequential calls while maintaining conversation context required passing chat history to both prompts.

### 2. Data Merging from Multiple Sources
Property data was split across three JSON files (basics, characteristics, images). Created a merge utility that joins records by ID and handles missing data with defaults.

### 3. SPA Routing on GitHub Pages
GitHub Pages doesn't support client-side routing - refreshing any route except `/` returns 404. Added a `404.html` redirect hack that preserves the URL path.

### 4. Filter State Synchronization
Three different inputs (search bar, dropdowns, AI chat) all modify which properties display. Designed state management so these don't conflict - chat filters update the search bar, dropdowns stack on top.

### 5. Cross-Device Number Formatting
Prices displayed incorrectly on phones set to Indian locale - `$380,000` showed as `$3,80,000` (lakhs format). Fixed by explicitly using `toLocaleString('en-US')` instead of relying on device locale.
