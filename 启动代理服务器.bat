@echo off
chcp 65001 >nul
echo ========================================
echo   百度OCR代理服务器启动脚本
echo ========================================
echo.
echo 正在启动代理服务器...
echo.
node proxy-server.js
pause
