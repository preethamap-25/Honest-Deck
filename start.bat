@echo off
REM Quick start script to run frontend and backend together on Windows

echo.
echo ========================================================
echo    HONEST-DECK FULL STACK STARTER
echo ========================================================
echo.

REM Check if backend requirements are installed
echo [1/4] Checking backend dependencies...
python -m pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing backend requirements...
    cd backend
    pip install -r requirements.txt
    cd ..
)
echo ✓ Backend dependencies checked
echo.

REM Check if frontend dependencies are installed
echo [2/4] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)
echo ✓ Frontend dependencies checked
echo.

REM Start backend in new window
echo [3/4] Starting backend server...
echo → Backend will run on http://localhost:8000
cd backend
start "Honest-Deck Backend" python main.py
cd ..
echo ✓ Backend started in new window
echo.

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start frontend in new window
echo [4/4] Starting frontend server...
echo → Frontend will run on http://localhost:5173
cd frontend
start "Honest-Deck Frontend" cmd /k npm run dev
cd ..

echo.
echo ========================================================
echo    ✓ Application started!
echo ========================================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
echo Both servers are running in separate windows.
echo Close the windows to stop the servers.
echo.
pause
