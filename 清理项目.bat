@echo off
echo ========================================
echo   Cleaning unused files...
echo ========================================
echo.

cd /d "%~dp0"

echo Deleting unused batch files...
del /q "启动代理服务器.bat" 2>nul
del /q "打包桌面应用.bat" 2>nul
del /q "test-build.bat" 2>nul
del /q "清理缓存.bat" 2>nul

echo Deleting proxy-server.js (now embedded in electron-main.cjs)...
del /q "proxy-server.js" 2>nul

echo Deleting icon files (not used)...
del /q "icon.svg" 2>nul
del /q "icon.png" 2>nul
del /q "icon.ico" 2>nul
del /q "icon.icns" 2>nul

echo.
echo ========================================
echo   Cleanup complete!
echo   Kept useful files:
echo   - build.bat (standard build)
echo   - 一键打包.bat (clean build)
echo   - 快速打包便携版.bat (portable version)
echo   - 强制打包.bat (force build)
echo   - 彻底清理缓存.bat (cache cleaner)
echo ========================================
echo.
pause
