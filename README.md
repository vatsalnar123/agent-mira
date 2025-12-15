# Real Estate Chatbot - Mira Estates

A full-stack AI-powered chatbot that helps users find homes based on their preferences.

## Features

### Core Features
- ✅ **Conversational UI** - Chat-based interface for natural property search
- ✅ **Data Merging** - Aggregates data from 3 JSON files (basics, characteristics, images)
- ✅ **Smart Filtering** - Filters properties by location, budget, bedrooms
- ✅ **MongoDB Integration** - Saves user's favorite properties
- ✅ **Property Comparison** - Compare up to 3 properties side-by-side

### Bonus Features
- ✨ **Gemini AI Integration** - Natural language understanding for smarter responses
- ✨ **Real-time Search** - Instant property filtering
- ✨ **Modern UI** - Beautiful dark theme with animations

## Tech Stack
- **Frontend**: React.js (Vite)
- **Backend**: Node.js / Express
- **Database**: MongoDB
- **AI**: Google Gemini API

## Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Gemini API key (optional, for AI features)

### 1. Backend Setup

```bash
cd server
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your credentials:
# - MONGO_URI (your MongoDB connection string)
# - GEMINI_API_KEY (get free at https://makersuite.google.com/app/apikey)

npm run dev
```

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

### 3. Open the App

Visit `http://localhost:5173` (or the port shown in terminal)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/properties | Get properties (with filters) |
| POST | /api/chat | AI chat endpoint |
| GET | /api/saved | Get saved properties |
| POST | /api/saved | Save a property |
| DELETE | /api/saved/:id | Remove saved property |
| GET | /api/health | Health check |

## Usage

Talk to Mira naturally:
- "Show me homes in New York under 500k"
- "Find 3 bedroom apartments in Miami"
- "What's available in Los Angeles?"
- "Show my saved properties"

## Environment Variables

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/realestate
GEMINI_API_KEY=your_api_key_here
```

## Deployment

### Frontend (Vercel/Netlify)
```bash
cd client
npm run build
# Deploy the dist/ folder
```

### Backend (Render/Railway)
- Set environment variables in the platform
- Deploy the server/ directory

## Approach & Challenges

### Approach
1. **Data Integration**: created a `data_merger.js` utility to combine the three separate JSON files (`basics`, `characteristics`, `images`) into a unified `properties` array based on the `id` field. This happens on server startup to ensure fast read access.
2. **Hybrid Chat System**: Implemented a dual-layer chat system:
   - **Layer 1 (Rule-based)**: Uses regex to instantly extract intent (search, saved properties) and filters (location, price, bedrooms) for fast, deterministic results.
   - **Layer 2 (AI-powered)**: Uses Google's Gemini API to generate friendly, context-aware responses and handle conversational nuances.
3. **State Management**: React state handles the complex interaction between the chat stream, property cards, and comparison view without needing an external library like Redux.

### Challenges
- **Data consistency**: Merging data from different files required handling potential missing fields gracefully (e.g., if an image was missing for a property ID).
- **Natural Language Processing**: accurately extracting structured filters (like "under 500k" or "3 bedrooms") from free-form text required careful regex tuning to handle various user phrasing.
- **State Synchronization**: Keeping the chat history, selected comparison items, and search results in sync required careful state updates in React.

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main chatbot component
│   │   └── index.css      # Styles
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Server with AI integration
│   ├── data_merger.js     # JSON data merger
│   ├── models/            # MongoDB models
│   └── .env.example       # Environment template
├── data/                   # JSON data files
│   ├── property_basics.json
│   ├── property_characteristics.json
│   └── property_images.json
└── README.md
```
