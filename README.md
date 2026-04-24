# SEETHRU — Setup Guide

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Copy and fill in your API keys
copy .env.example .env

uvicorn main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

### 3. MongoDB
Make sure MongoDB is running locally:
```bash
mongod --dbpath ./data
```

### 4. Ollama (for URL detection)
```bash
ollama pull llama3
ollama serve
```

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | e.g. `gemini-1.5-pro` |
| `OLLAMA_BASE_URL` | Ollama server URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | Ollama model name (default: `llama3`) |
| `MONGO_URI` | MongoDB connection string |
| `NEWS_API_KEY` | NewsAPI.org API key |
| `SMTP_USER` | Gmail address for alerts |
| `SMTP_PASSWORD` | Gmail App Password |
| `ALERT_RECIPIENT` | Email to receive alerts |

---

## Architecture

```
Input (Text / URL / Image)
        │
        ▼
  FastAPI Backend
        │
  LangGraph Agent ──► Text Classifier (Gemini)
                  ──► URL Detector (Ollama + heuristics)
                  ──► Image Detector (Gemini Vision)
                  ──► Evidence Retrieval (RAG + DuckDuckGo)
                  ──► Aggregator → Explainer → Alert Trigger
        │
  MongoDB (analyses, alerts, news_cache)
        │
  React Frontend (Vite + Tailwind)
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/analyze/text` | Analyze text for misinformation |
| POST | `/analyze/url` | Check URL for phishing |
| POST | `/analyze/image` | Check image authenticity |
| GET | `/news/` | Fetch latest news |
| GET | `/alerts/` | Get active alerts |
| DELETE | `/alerts/{id}` | Dismiss an alert |
