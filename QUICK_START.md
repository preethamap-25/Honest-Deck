# Quick Start Guide - Running Honest-Deck Integrated

This guide will help you run the fully integrated Honest-Deck application with frontend and backend communication.

## Prerequisites

- **Python 3.8+** - Backend runtime
- **Node.js 16+** - Frontend runtime  
- **MongoDB** - Database (local or cloud)
- **pip** - Python package manager
- **npm** - Node package manager

## Option 1: One-Command Start (Windows)

Simply run the batch file:

```bash
start.bat
```

This will:
1. Check and install dependencies
2. Start the backend on `http://localhost:8000`
3. Start the frontend on `http://localhost:5173`

Both will open in separate terminal windows.

## Option 2: One-Command Start (macOS/Linux)

```bash
bash start.sh
```

Same as above, but for Unix-based systems.

## Option 3: Manual Start (Recommended for Development)

### Terminal 1: Start Backend

```bash
cd backend
pip install -r requirements.txt  # First time only
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Expected output:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## Testing the Integration

### 1. Chat Page (Main Feature)
1. Open http://localhost:5173
2. Type or paste a news claim (e.g., "The Great Wall of China is visible from space")
3. Click "Analyse" or press Shift+Enter
4. Watch the analysis stages progress (searching → extracting → cross-referencing → calculating → compiling)
5. Backend returns verdict, score, and evidence

**Expected Result**: Real analysis from backend AI, not mock data

### 2. History Page
1. Navigate to **History** using sidebar
2. Page should load previous analyses from backend
3. You can search, filter by verdict, and sort by date/score

**Expected Result**: Real data from `/api/analyze/history` endpoint

### 3. Dashboard Page
1. Navigate to **Dashboard** using sidebar
2. Page fetches trending news from backend news fetcher
3. Each news item shows credibility score and verdict
4. Click "Deep-check" to analyze any article

**Expected Result**: Real news data from `/news` endpoint

## Configuration

### Change Backend URL

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Change `8000` to your backend port if different.

### MongoDB Connection

Backend expects MongoDB connection. If not configured, edit `backend/db/mongo.py`:

```python
# Local MongoDB
MONGODB_URI = "mongodb://localhost:27017"

# Or MongoDB Atlas cloud
MONGODB_URI = "mongodb+srv://user:password@cluster.mongodb.net/database"
```

### Backend Port

If you want backend on different port, edit `backend/main.py`:

```python
# Change the port in uvicorn.run()
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)  # Change 8000 here
```

## Troubleshooting

### Frontend shows "API error" or blank page

1. **Check backend is running**:
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy"}`

2. **Check API URL in .env**:
   ```bash
   cat frontend/.env
   ```
   Should show correct backend URL

3. **Clear frontend cache**:
   ```bash
   cd frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

### Backend crashes on startup

1. **Check Python version**:
   ```bash
   python --version
   ```
   Should be 3.8+

2. **Check MongoDB connection**:
   - Verify MongoDB is running (if local)
   - Or check connection string in `backend/db/mongo.py`

3. **Check port availability**:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # macOS/Linux
   lsof -i :8000
   ```
   If port 8000 is in use, change it

### Frontend stuck on loading

1. **Check browser console** (F12):
   - Look for network errors
   - Check if API requests are being made

2. **Check backend logs**:
   - Look for error messages in backend terminal

3. **Try hard refresh**:
   - Frontend: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## API Endpoints Reference

All these endpoints are now connected:

### Analyze
- `POST /api/analyze/text` - Analyze text claim
- `POST /api/analyze/url` - Analyze URL
- `POST /api/analyze/auto` - Auto-detect and analyze
- `POST /api/analyze/image` - Analyze image
- `GET /api/analyze/history?limit=50` - Get analysis history

### News
- `GET /news?category=latest&page_size=10` - Get news articles

### Alerts
- `GET /alerts?limit=20` - Get alerts
- `DELETE /alerts/{alert_id}` - Dismiss alert

### Monitor
- `GET /monitor/watchlist` - Get watchlist
- `POST /monitor/watchlist` - Add to watchlist
- `DELETE /monitor/watchlist/{id}` - Remove from watchlist

## File Structure

```
Honest-Deck/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── utils/
│   │   │   └── api.js     # ← API helper functions
│   │   ├── hooks/
│   │   │   └── useFactCheck.js  # ← Now uses real API
│   │   └── pages/
│   │       ├── ChatPage.jsx      # ← Uses real API
│   │       └── DashboardPage.jsx # ← Uses real API
│   └── .env              # ← API configuration
│
├── backend/               # FastAPI
│   ├── main.py           # App entry point
│   ├── routes/           # API endpoints
│   ├── db/               # Database connection
│   └── agent/            # AI agent logic
│
└── start.bat             # Windows quick start
└── start.sh              # Unix quick start
```

## Performance Tips

- **Disable animations** in Settings if slow
- **Close browser tabs** to free memory
- **Use development builds** (not production)
- **Check internet speed** for news fetching

## Next Steps

1. ✅ **Integration Complete** - Frontend and backend are now connected
2. 🔄 **Test Thoroughly** - Try all pages and features
3. 📝 **Customize** - Add your own API endpoints or UI features
4. 🚀 **Deploy** - Deploy backend (Heroku, Railway, etc.) and frontend (Vercel, Netlify, etc.)

## Support

For issues:
1. Check browser console (F12)
2. Check backend terminal output
3. Try hard refresh (Ctrl+Shift+R)
4. Restart both servers
5. Check `INTEGRATION_GUIDE.md` for detailed changes

---

**Happy Fact-Checking! 🎉**
