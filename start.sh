#!/usr/bin/env bash
# Quick start script to run frontend and backend together

echo "🚀 Starting Honest-Deck Application..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   HONEST-DECK FULL STACK STARTER${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""

# Check if backend requirements are installed
echo -e "${YELLOW}[1/4]${NC} Checking backend dependencies..."
if ! python -m pip show fastapi > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing backend requirements...${NC}"
    cd backend
    pip install -r requirements.txt
    cd ..
fi
echo -e "${GREEN}✓ Backend dependencies checked${NC}"
echo ""

# Check if frontend dependencies are installed
echo -e "${YELLOW}[2/4]${NC} Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
fi
echo -e "${GREEN}✓ Frontend dependencies checked${NC}"
echo ""

# Start backend in background
echo -e "${YELLOW}[3/4]${NC} Starting backend server..."
echo -e "${BLUE}→ Backend will run on http://localhost:8000${NC}"
cd backend
python main.py > backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${YELLOW}[4/4]${NC} Starting frontend server..."
echo -e "${BLUE}→ Frontend will run on http://localhost:5173${NC}"
cd frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
