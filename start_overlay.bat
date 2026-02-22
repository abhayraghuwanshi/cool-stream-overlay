@echo off
echo Starting Stream Overlay Services...

echo Starting Node WebSocket Backend (Port 3388)...
start "OBS AI Backend" cmd /k "cd backend && node server.js"

echo Starting React Frontend (Vite)...
start "React Overlay" cmd /k "npm run dev"

echo Both services have been started in separate windows!
echo It is safe to close this launcher window.
timeout /t 5
exit
