@echo off
setlocal

echo ========================================
echo   Building Electron App
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend build failed!
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo.
echo Step 2: Packaging Electron app...
call npx electron-builder --win --x64

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Packaging failed!
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS! Check release folder
echo ========================================
echo.
echo Press any key to exit...
pause >nul
