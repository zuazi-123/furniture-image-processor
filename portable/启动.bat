@echo off
title Furniture Image Processor

echo.
echo ========================================
echo   Starting Web Server...
echo ========================================
echo.

:: Check if local node.exe exists
if exist node.exe (
    echo Using local Node.js...
    node server.js
    goto :end
)

:: Try to use system Node.js
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo Using system Node.js...
    node server.js
    goto :end
)

:: Node.js not found
echo [ERROR] Node.js not found!
echo.
echo Please either:
echo 1. Install Node.js from https://nodejs.org
echo 2. Or place node.exe in this directory
echo.
pause
exit /b 1

:end
pause
