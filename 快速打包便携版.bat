@echo off
echo ========================================
echo   Quick Rebuild (Portable Version Only)
echo ========================================
echo.

cd /d "%~dp0"

echo Closing any running instances...
taskkill /F /IM "家具图片处理工具.exe" 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Cleaning release folder...
rmdir /s /q "release\win-unpacked" 2>nul
timeout /t 1 /nobreak >nul

echo Building...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo Packaging portable version...
call npx electron-builder --win --x64 --dir

if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS!
echo   Run: release\win-unpacked\家具图片处理工具.exe
echo ========================================
echo.
pause
