# <img src="https://biosentinal.vercel.app/BioSentinal.png" alt="BioSentinel Logo" width="40" height="40" /> Bio Sentinal

Real-time biodiversity protection platform using AI, satellite insights, and community action.

---

## Overview

Bio Sentinal is a biodiversity monitoring platform that combines AI, satellite intelligence, and community reports to protect ecosystems. It provides real-time alerts, species insights, and collaborative dashboards for students, researchers, and conservation teams.

---

## Key Features

- Real-time biodiversity alerts and risk analysis
- AI assistant for species guidance and conservation recommendations
- Satellite and ocean monitoring (fire, vegetation, chlorophyll, ocean color)
- GBIF species intelligence and trend-based risk scoring
- Ganga river riparian analysis and water quality insights
- Community reporting and role-based dashboards

---

## App Download

Scan the QR code to download the APK - Scanning starts APK Download

# <img src="https://biosentinal.vercel.app/ApkQR.png" alt="Apk QR" width="300" height="300" />

---

## User Manual (How to Use)

1. Open the web app or install the APK using the QR code.
2. Sign up or log in.
3. Complete your profile and choose a role (Student, Researcher, Community).
4. Explore the live map and biodiversity alerts.
5. Search species, view detail pages, and check conservation guidance.
6. Submit reports and contribute observations.
7. Use the AI assistant for species-specific help.
8. (Advanced) Run satellite or riparian analysis for deeper insights.

---

## System Components

- Frontend: React + Vite web app
- Node API: Main backend for auth, alerts, AI chat, satellite and riparian features
- GBIF ML API: Optional FastAPI service for GBIF and ML-based analysis
- HF FastAPI: Lightweight FastAPI service for image authenticity analysis

---

## 🌐 Running Locally

### Starting
```bash
git clone https://github.com/eags-aayush/bio-sentinal.git
cd bio-sentinal
```

### Vercel (Frontend)
```bash
cd frontend
npm install
npm run dev || npm run build
```

### Render (Express API)
```bash
cd ai
npm install
node app.js
```

### Render (Python / GBIF ML API or HF FastAPI)
```bash
cd ai
pip install -r requirements.txt
python gbif_ml_api.py 8000 || python app.py
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_key_here
MONGODB_URI=mongodb://localhost:27017/Bio-Sentinal
JWT_SECRET=your_secret_here
NASA_FIRMS_API_KEY=your_key_here
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
VITE_GBIF_API_URL=http://localhost:3000/api
VITE_AI_ANALYSIS_URL=http://localhost:3000/api

VITE_MAP_CENTER_LAT=25.5
VITE_MAP_CENTER_LON=83.0
VITE_MAP_DEFAULT_ZOOM=7

VITE_APP_NAME=BioSentinal
```

---

## API Endpoints

### 1) Node/Express API

Base URL: http://localhost:3000

Core
- GET /
- GET /health
- POST /api/species

Auth (/api/auth)
- POST /signup
- POST /signin
- GET /me
- PUT /profile
- POST /logout

AI and Image (/api)
- POST /chat
- POST /classify/image (multipart file)
- POST /classify/image/url
- POST /classify/image/analyze (multipart file)

Alerts and GBIF (/api/alerts)
- POST /gbif/classify
- GET /gbif/search
- GET /
- GET /danger-zones
- GET /mosdac
- POST /process
- POST /
- GET /risk-analysis

Satellite (/api/satellite)
- POST /fetch
- GET /layers
- POST /analyze/mosdac
- GET /mosdac/chlorophyll
- GET /mosdac/ocean
- GET /ganga/buffer
- POST /ganga/analyze
- GET /ganga/layers
- GET /mosdac/ganga

Riparian and Ganga (/api/riparian)
- POST /water-status/analyze (multipart image)
- POST /species/estimate
- GET /ganga/stretches
- GET /ganga/stretch/:id
- POST /ganga/full-analysis (multipart image)

---

### 2) GBIF ML API (FastAPI)

Base URL: http://localhost:8000

- POST /gbif/classify
- GET /gbif/search
- GET /health
- GET /docs
- GET /api
- POST /satellite/analyze
- POST /classify/image
- GET /

---

### 3) HF FastAPI (Image Authenticity)

Base URL: http://localhost:7860

- GET /
- GET /api/health
- POST /api/classify/image/analyze

---

## 📊 Project Status

### ✅ Completed (70%)
- User authentication system
- MongoDB integration
- Role-based dashboards
- Gemini AI chat
- Alert system with mock data
- Interactive map
- Species search

### 🔄 In Progress (20%)
- Live data polling
- NASA FIRMS integration
- WebSocket for real-time updates
- Alert caching

### ⚠️ TODO (10%)
- Image uploads
- Push notifications
- Offline sync
- Admin dashboard

---

## ⚠️ Known Issues

1. **NASA FIRMS API** - May fail silently on rate limits → Needs better error handling
2. **No real-time updates** - Alerts only load on refresh → Implement polling
3. **File-based storage** - Not scalable → Migrate to MongoDB

---

## 👥 Team

| Name | Role |
|------|------|
| **Vijay Ramdev** | ML & Model Developer |
| **Preeti Yadav** | Event Manager & Researcher |
| **Aayush Laddha** | Web & Backend Developer |
| 


---

## 🔗 External Resources

- [MOSDAC API](https://mosdac.gov.in/downloadapi-manual/)
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)
- [GBIF Docs](https://techdocs.gbif.org/en/)
- [Groq Docs](https://console.groq.com/docs/overview/)
- [Fast API](https://fastapi.tiangolo.com/tutorial/)

---

**Last Updated:** February 11, 2026  
**Version:** 1.0.0  
**Status:** Active Development

🌍 **Help protect our planet! Join Bio Sentinal today.**
