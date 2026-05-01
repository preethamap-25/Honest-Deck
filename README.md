# SEETHRU / Honest Deck Backend

Real-time misinformation and phishing analysis powered by Groq.

This backend is intentionally independent from `model/*`. The `model/` folder is
a separate local RAG experiment/service and is not used by the FastAPI backend.

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend defaults to `http://localhost:5173` and calls the backend at
`http://localhost:8000`. Override the backend URL with `VITE_API_URL` if needed.

### 3. MongoDB

MongoDB stores analyses, alerts, and monitoring watchlist data.

```bash
mongod --dbpath ./data
```

## Backend Environment Variables

Create `backend/.env` from `backend/.env.example`.

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Required for Groq text, URL, image, news, and explanation analysis |
| `GROQ_MODEL` | Text reasoning model, default `llama-3.3-70b-versatile` |
| `GROQ_VISION_MODEL` | Vision model, default `meta-llama/llama-4-scout-17b-16e-instruct` |
| `MONGO_URI` | MongoDB connection string |
| `MONGO_DB_NAME` | MongoDB database name, default `seethru_db` |
| `NEWS_API_KEY` | Optional, improves real-time evidence/news retrieval |
| `SMTP_HOST` / `SMTP_PORT` | Optional alert email SMTP config |
| `SMTP_USER` / `SMTP_PASSWORD` | Optional alert email credentials |
| `ALERT_RECIPIENT` | Optional email recipient for high-risk alerts |

No Gemini, Ollama, Qdrant, or `model/*` service is required for the backend.

## Runtime Architecture

```text
Input (Text / URL / Image)
        |
        v
  FastAPI Backend
        |
  LangGraph Agent
        |-- Text: live evidence retrieval + Groq fact checker
        |-- URL: URL heuristics + RDAP + Groq phishing analyst
        |-- Image: Groq vision authenticity detector
        |-- Aggregator -> Groq explainer -> alert trigger
        |
  MongoDB (analyses, alerts, watchlist)
        |
  React Frontend
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/analyze/text` | Fact-check text using live evidence and Groq |
| POST | `/analyze/url` | Check URL phishing risk using heuristics and Groq |
| POST | `/analyze/image` | Check image authenticity using Groq Vision |
| POST | `/api/analyze/` | Unified text, URL, or image analyzer |
| GET | `/analyze/history` | List stored analyses |
| GET | `/analyze/stats` | Analysis counts by risk label |
| GET | `/news/` | Fetch and Groq-classify news |
| GET | `/alerts/` | Get active alerts |
| DELETE | `/alerts/{id}` | Dismiss an alert |
| GET/POST/DELETE | `/monitor/watchlist` | Manage continuous monitoring |
| POST | `/monitor/run` | Re-check all watchlist items |
