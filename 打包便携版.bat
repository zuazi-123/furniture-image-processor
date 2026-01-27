@echo off
title Package Portable Version

echo.
echo ========================================
echo   Packaging Portable Version...
echo ========================================
echo.

:: 1. Build project
echo [1/5] Building project...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

:: 2. Create portable directory
echo [2/5] Creating portable directory...
if exist furniture-portable rd /s /q furniture-portable
mkdir furniture-portable
mkdir furniture-portable\app

:: 3. Copy files
echo [3/5] Copying application files...
xcopy /E /I /Y dist furniture-portable\app\dist >nul
copy /Y portable\server.js furniture-portable\app\ >nul
copy /Y portable\启动.bat furniture-portable\app\start.bat >nul
copy /Y portable\一键启动.bat furniture-portable\start.bat >nul
copy /Y portable\使用说明.txt furniture-portable\README.txt >nul

:: 4. Install dependencies
echo [4/5] Installing dependencies...
cd furniture-portable\app
call npm init -y >nul 2>&1
call npm install express --production --no-save >nul 2>&1
cd ..\..

:: 5. Prepare Node.js
echo [5/5] Preparing Node.js runtime...
if not exist node-portable (
    echo.
    echo [INFO] Node.js portable version needed
    echo Please download and extract to node-portable folder
    echo Download: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
    echo.
    echo Or skip this step, users need to install Node.js themselves
    echo.
) else (
    echo Copying Node.js runtime...
    copy /Y node-portable\node.exe furniture-portable\app\ >nul
)

echo.
echo ========================================
echo   Package Complete!
echo ========================================
echo.
echo Portable version location: furniture-portable\
echo.
echo Next steps:
echo 1. Copy UMI-OCR folder to furniture-portable\ directory
echo 2. Compress furniture-portable folder
echo 3. Distribute to users
echo.
pause
