@echo off
chcp 65001 >nul
title 家具图片处理工具 - Web 服务器

echo.
echo ========================================
echo   正在启动 Web 服务器...
echo ========================================
echo.

:: 检查 Node.js 是否存在（本地或系统）
set NODE_CMD=

if exist node.exe (
    set NODE_CMD=node.exe
    echo [✓] 找到本地 Node.js
) else (
    where node >nul 2>nul
    if errorlevel 0 (
        set NODE_CMD=node
        echo [✓] 找到系统 Node.js
    )
)

if "%NODE_CMD%"=="" (
    echo [✗] 未找到 Node.js！
    echo.
    echo 请执行以下操作之一：
    echo 1. 确保 node.exe 在当前目录
    echo 2. 或安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 检查必要文件
if not exist server.js (
    echo [✗] 未找到 server.js
    pause
    exit /b 1
)

if not exist dist\index.html (
    echo [✗] 未找到 dist 目录或 index.html
    pause
    exit /b 1
)

if not exist node_modules\express (
    echo [✗] 未找到 express 依赖
    echo 请运行: npm install express
    pause
    exit /b 1
)

:: 检查端口是否被占用
echo [1/2] 正在检查端口 8888...
netstat -ano | findstr ":8888" >nul 2>nul
if %errorlevel% equ 0 (
    echo [警告] 端口 8888 已被占用
    echo 请关闭占用该端口的程序，或修改 server.js 中的端口号
    echo.
    echo 提示：可以运行 "关闭占用端口.bat" 自动解决
    echo.
    pause
) else (
    echo [✓] 端口 8888 可用
)

:: 启动服务器
echo [2/2] 正在启动 Web 服务器...
echo.
%NODE_CMD% server.js

echo.
echo 服务器已停止
pause
