@echo off
echo Cleaning electron-builder cache...
echo.

taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

rmdir /s /q "%LOCALAPPDATA%\electron-builder" 2>nul
rmdir /s /q "%APPDATA%\npm-cache" 2>nul

echo.
echo Cache cleaned!
echo Now run "强制打包.bat" as Administrator
echo.
pause
