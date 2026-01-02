@echo off
chcp 65001 >nul
echo ========================================
echo 更新相田 龍之介的圖片
echo ========================================
echo.

cd /d "c:\Users\Auer0960\CR\角色管理"
node scripts\add_ryunosuke_image.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 圖片處理失敗!
    pause
    exit /b 1
)

echo.
echo ✅ 圖片更新完成!
echo.
pause




