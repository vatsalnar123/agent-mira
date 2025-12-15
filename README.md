# 🏛 Agent Mira - AI-Powered Real Estate Chatbot

A full-stack real estate chatbot application that helps users find their dream homes using natural language conversations powered by Google's Gemini AI.

## 🌐 Live Demo

- **Frontend**: [https://vatsalnar123.github.io/agent-mira/](https://vatsalnar123.github.io/agent-mira/)


## ✨ Features

### Core Features
- **🤖 AI-Powered Chat Assistant** - Natural language property search using Google Gemini 3 Pro
- **🔍 Smart Search** - Search by location, price, bedrooms with flexible parsing (e.g., "3 bed apartments in Miami under 500k")
- **💾 User Authentication** - Secure login/signup with password hashing (bcrypt)
- **❤️ Save Favorites** - Save properties to your personal favorites list
- **⚖️ Property Comparison** - Compare up to 3 properties side-by-side
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **🔄 Data Persistence** - MongoDB integration for cross-device sync

### Bonus Features
- **✨ Gemini AI Integration** - Advanced NLP for understanding complex queries
- **📊 Real-Time Filtering** - Dynamic property filtering as you type
- **🎨 Modern UI** - Elegant, Airbnb-inspired interface with luxury aesthetic

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| AI | Google Gemini 3 Pro Preview |
| Hosting | GitHub Pages (Frontend), Heroku (Backend) |

## 📁 Project Structure

```
agent-mira/
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main application component
│   │   ├── App.css           # Styles
│   │   ├── pages/
│   │   │   ├── Login.jsx     # Login page
│   │   │   ├── Signup.jsx    # Registration page
│   │   │   └── Auth.css      # Auth styles
│   │   └── components/
│   │       └── ComparisonModal.jsx
│   └── package.json
├── server/                    # Node.js backend
│   ├── index.js              # Express server & API routes
│   ├── data_merger.js        # JSON data merging utility
│   └── models/
│       ├── User.js           # User schema with password hashing
│       ├── SavedProperty.js  # Saved properties schema
│       └── ComparisonList.js # Comparison list schema
├── data/                      # Property JSON files
│   ├── property_basics.json
│   ├── property_characteristics.json
│   └── property_images.json
└── README.md
```

## 🚀 Approach & Architecture

### 1. Data Merging Strategy
The application works with three separate JSON files simulating real-world data sources:
- `property_basics.json` - ID, title, price, location
- `property_characteristics.json` - Bedrooms, bathrooms, size, amenities
- `property_images.json` - Property image URLs

These are merged at runtime using the `data_merger.js` utility, joining records by their common `id` field.

### 2. AI-First Search Architecture
```
User Query → Gemini AI (Filter Extraction) → Property Filter → Gemini AI (Response Generation)
```

The chatbot uses a two-step AI process:
1. **Filter Extraction**: Gemini parses natural language to extract structured filters (location, price, bedrooms)
2. **Response Generation**: Gemini generates contextual, friendly responses based on results

A regex fallback ensures the system works even if the AI is unavailable.

### 3. Smart Search Implementation
The search bar implements intelligent parsing:
- Recognizes bedroom variations: "3 bed", "3br", "3bhk", "3 bedroom"
- Handles price formats: "$500k", "500000", "under 1 million"
- Location fuzzy matching: "NYC" → "New York", "LA" → "Los Angeles"

### 4. Authentication Flow
- Password hashing with bcrypt (10 salt rounds)
- Session persistence via localStorage
- Login supports both email AND username
- Protected routes redirect unauthenticated users



## 🔧 Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google AI Studio API key

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/vatsalnar123/agent-mira.git
cd agent-mira
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

3. **Configure environment variables**

Create `server/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp
```

4. **Run the application**
```bash
# Terminal 1 - Start backend
cd server && node index.js

# Terminal 2 - Start frontend
cd client && npm run dev
```

5. **Open in browser**: http://localhost:5173

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/chat` | AI chat endpoint |
| GET | `/api/properties` | Get all properties |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login (email or username) |
| GET | `/api/saved` | Get saved properties |
| POST | `/api/saved` | Save a property |
| DELETE | `/api/saved/:id` | Remove from saved |
| GET | `/api/comparison` | Get comparison list |
| POST | `/api/comparison` | Add to comparison |
| DELETE | `/api/comparison/:id` | Remove from comparison |

## 👨‍💻 Author

**Vatsal Narula**

---

*Built for the Agent Mira Hackathon Case Study*
