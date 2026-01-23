@echo off
setlocal

echo ========================================
echo   Clean Build Process
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Cleaning cache...
rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache" 2>nul
rmdir /s /q "release" 2>nul
echo Cache cleaned!

echo.
echo Step 2: Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Packaging Electron app...
call npx electron-builder --win --x64

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Packaging failed!
    echo.
    echo Try these solutions:
    echo 1. Close all programs and try again
    echo 2. Restart your computer
    echo 3. Run this script as Administrator
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS! Check release folder
echo ========================================
echo.
pause
