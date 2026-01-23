@echo off
echo ========================================
echo   Starting Development Server
echo ========================================
echo.

cd /d "%~dp0"

echo Starting proxy server...
start "Proxy Server" cmd /k "node proxy-server.js"

timeout /t 2 /nobreak >nul

echo Starting Vite dev server...
npm run dev

pause
