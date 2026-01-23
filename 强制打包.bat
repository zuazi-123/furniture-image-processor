@echo off
echo ========================================
echo   Force Clean and Rebuild
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Killing any node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Cleaning all caches...
rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache" 2>nul
rmdir /s /q "release" 2>nul
rmdir /s /q "dist" 2>nul
timeout /t 1 /nobreak >nul

echo Step 3: Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo Step 4: Packaging (this may take a few minutes)...
call npx electron-builder --win --x64

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Packaging failed!
    echo.
    echo Please try:
    echo 1. Run this script as Administrator (right-click, Run as administrator)
    echo 2. Close all programs and try again
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS! Check release folder
echo ========================================
echo.
pause
