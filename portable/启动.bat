@echo off
title Furniture Image Processor

echo.
echo ========================================
echo   Starting Web Server...
echo ========================================
echo.

:: Check if Node.js exists
if not exist node.exe (
    echo [ERROR] Node.js not found!
    echo Please ensure node.exe is in the current directory
    pause
    exit /b 1
)

:: Start server
echo [1/2] Starting web server...
node server.js

pause
