# BioSentinal - Local Development Setup

This guide provides all commands to run the BioSentinal project locally on Windows.

## Prerequisites

- **Node.js** (v18 or higher) - Download from https://nodejs.org
- **Python** (v3.8 or higher) - Download from https://python.org
- **MongoDB** (optional, for database features) - Download from https://mongodb.com

## Quick Start Commands

Run these commands in separate terminals:

### Terminal 1 - Start Backend API
```cmd
cd bio-sentinal\ai
npm install
node app.js
```
Server will run on: **http://localhost:3000**

### Terminal 2 - Start Python GBIF API (Optional)
```cmd
cd bio-sentinal\ai
python gbif_ml_api.py 8000
```
Server will run on: **http://localhost:8000**

### Terminal 3 - Start Frontend
```cmd
cd bio-sentinal\frontend
npm install
npm run dev
```
Frontend will run on: **http://localhost:5173**

## Step-by-Step Installation

### 1. Clone and Setup
```cmd
git clone https://github.com/eags-aayush/bio-sentinal.git
cd bio-sentinal
```

### 2. Install Backend Dependencies
```cmd
cd bio-sentinal\ai
npm install
```

### 3. Install Frontend Dependencies
```cmd
cd bio-sentinal\frontend
npm install
```

### 4. Configure Environment Variables

**Backend (.env in bio-sentinal/ai/):**
```
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb://localhost:27017/biosentinel
PORT=3000
```

**Frontend (.env in bio-sentinal/frontend/):**
```
VITE_API_URL=http://localhost:3000/api
VITE_GBIF_API_URL=http://localhost:3000/api
VITE_AI_ANALYSIS_URL=http://localhost:3000/api
```

### 5. Start MongoDB (Optional)
```cmd
mongod
```

## Starting the Application

### Terminal 1 - Backend
```cmd
cd bio-sentinal\ai
node app.js
```

### Terminal 2 - Frontend
```cmd
cd bio-sentinal\frontend
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/classify/image/analyze` | POST | Analyze uploaded images for AI detection |
| `/api/classify/image` | POST | Basic image classification |
| `/api/satellite/ganga/analyze` | POST | Get species data for Ganga region |
| `/api/alerts` | GET | Fetch biodiversity alerts |
| `/api/chat` | POST | Chat with AI about species |

## Troubleshooting

### Port Already in Use
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID_NUMBER> /F
```

### MongoDB Connection Error
- MongoDB is optional - the app will work without it
- For full features, install MongoDB and ensure it's running

### Node Modules Issues
```cmd
# Remove node_modules and reinstall
rmdir /s node_modules
npm install
```

### Clear npm Cache
```cmd
npm cache clean --force
```

## Project Structure

```
bio-sentinal/
├── ai/                          # Backend (Node.js + Express)
│   ├── app.js                   # Main server file
│   ├── src/
│   │   ├── routes/              # API routes
│   │   ├── controllers/         # Route handlers
│   │   └── services/           # Business logic
│   └── .env                     # Environment variables
│
├── frontend/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   └── utils/              # Utility functions
│   └── .env                    # Environment variables
│
└── README.md                   # This file
```

## Features Working

- ✅ Image upload and ML-based AI detection
- ✅ GBIF species data integration
- ✅ Interactive maps with species markers
- ✅ Real-time alerts
- ✅ Chat with AI about biodiversity

## Environment Variables Required

Create `.env` file in `bio-sentinal/ai/`:
```
GROQ_API_KEY=gsk_your_api_key_here
```

Get GROQ API key from: https://console.groq.com

## Notes

- The backend runs on port 3000
- The frontend runs on port 5173
- Both must be running for full functionality
- Frontend proxy is configured to redirect API calls to backend
