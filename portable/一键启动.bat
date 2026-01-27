@echo off
title Furniture Image Processor - One Click Start

echo.
echo ========================================
echo   One Click Start
echo ========================================
echo.

:: Check if UMI-OCR exists
if not exist UMI-OCR\Umi-OCR.exe (
    echo [WARNING] UMI-OCR not found!
    echo.
    echo Please ensure UMI-OCR folder exists with Umi-OCR.exe
    echo.
    echo You can:
    echo 1. Download UMI-OCR and extract to UMI-OCR folder
    echo 2. Or manually start UMI-OCR, then run app\start.bat
    echo.
    pause
    exit /b 1
)

:: Start UMI-OCR
echo [1/3] Starting UMI-OCR...
start "" UMI-OCR\Umi-OCR.exe

:: Wait for UMI-OCR to start
echo [2/3] Waiting for UMI-OCR to start (3 seconds)...
timeout /t 3 /nobreak >nul

:: Start application
echo [3/3] Starting application...
cd /d "%~dp0app"
start "" cmd /c start.bat

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo Tips:
echo - UMI-OCR is running in background
echo - Browser will open automatically
echo - Close all windows when done
echo.
echo Press any key to exit...
pause >nul
