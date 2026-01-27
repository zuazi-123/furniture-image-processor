@echo off
chcp 65001 >nul
title 家具图片处理工具

echo.
echo ========================================
echo   家具图片处理工具 - 启动中...
echo ========================================
echo.

:: 检查 Node.js 是否存在
if not exist "node.exe" (
    echo [错误] 未找到 Node.js 运行环境！
    echo 请确保 node.exe 在当前目录下
    pause
    exit /b 1
)

:: 启动服务器
echo [1/2] 正在启动 Web 服务器...
node server.js

pause
