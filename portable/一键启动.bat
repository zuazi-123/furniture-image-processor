@echo off
chcp 65001 >nul
title 家具图片处理工具 - 一键启动

echo.
echo ========================================
echo   家具图片处理工具 - 一键启动
echo ========================================
echo.

:: 检查 UMI-OCR 是否存在
if not exist "UMI-OCR\Umi-OCR.exe" (
    echo [警告] 未找到 UMI-OCR！
    echo.
    echo 请确保 UMI-OCR 文件夹存在，并包含 Umi-OCR.exe
    echo.
    echo 您可以：
    echo 1. 下载 UMI-OCR 并解压到当前目录的 UMI-OCR 文件夹
    echo 2. 或手动启动 UMI-OCR 后，再运行"家具图片处理工具\启动.bat"
    echo.
    pause
    exit /b 1
)

:: 启动 UMI-OCR
echo [1/3] 正在启动 UMI-OCR...
start "" "UMI-OCR\Umi-OCR.exe"

:: 等待 UMI-OCR 启动
echo [2/3] 等待 UMI-OCR 启动（3秒）...
timeout /t 3 /nobreak >nul

:: 启动家具图片处理工具
echo [3/3] 正在启动家具图片处理工具...
cd /d "%~dp0家具图片处理工具"
start "" cmd /c "启动.bat"

echo.
echo ========================================
echo   所有服务已启动！
echo ========================================
echo.
echo 提示：
echo - UMI-OCR 已在后台运行
echo - 浏览器会自动打开应用页面
echo - 使用完毕后，请关闭所有窗口
echo.
echo 按任意键退出此窗口...
pause >nul
