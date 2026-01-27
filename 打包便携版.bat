@echo off
chcp 65001 >nul
title 打包便携版

echo.
echo ========================================
echo   家具图片处理工具 - 便携版打包
echo ========================================
echo.

:: 1. 构建项目
echo [1/5] 正在构建项目...
call npm run build
if errorlevel 1 (
    echo [错误] 构建失败！
    pause
    exit /b 1
)

:: 2. 创建便携版目录
echo [2/5] 创建便携版目录...
if exist furniture-portable rd /s /q furniture-portable
mkdir furniture-portable
mkdir furniture-portable\app

:: 3. 复制文件
echo [3/5] 复制应用文件...
xcopy /E /I /Y dist furniture-portable\app\dist >nul
copy /Y portable\server.js furniture-portable\app\ >nul
copy /Y portable\启动.bat furniture-portable\app\ >nul
copy /Y portable\一键启动.bat furniture-portable\ >nul
copy /Y portable\使用说明.txt furniture-portable\ >nul

:: 4. 安装生产依赖
echo [4/5] 安装依赖包...
cd furniture-portable\app
call npm init -y >nul 2>&1
call npm install express --production --no-save >nul 2>&1
cd ..\..

:: 5. 下载 Node.js 便携版（如果不存在）
echo [5/5] 准备 Node.js 运行环境...
if not exist node-portable (
    echo.
    echo [提示] 需要下载 Node.js 便携版
    echo 请手动下载并解压到 node-portable 文件夹
    echo 下载地址: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
    echo.
    echo 或者跳过此步骤，用户需要自行安装 Node.js
    echo.
) else (
    echo 复制 Node.js 运行环境...
    copy /Y node-portable\node.exe furniture-portable\app\ >nul
)

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 便携版位置: furniture-portable\
echo.
echo 下一步：
echo 1. 将 UMI-OCR 文件夹复制到 furniture-portable\ 目录
echo 2. 压缩 furniture-portable 文件夹
echo 3. 分发给用户
echo.
pause
