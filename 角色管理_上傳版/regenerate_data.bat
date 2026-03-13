@echo off
chcp 65001 >nul
echo ========================================
echo 重新生成角色資料
echo ========================================
echo.

echo [1/2] 執行資料提取腳本...
node scripts\extract_cr_data.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 資料提取失敗!
    pause
    exit /b 1
)

echo.
echo [2/2] 資料已更新!
echo.
echo ✅ 完成! 新的角色資料已生成到 public\cr_data.json
echo.
echo 📝 注意事項:
echo    - 如果應用程式正在運行,請重新整理瀏覽器 (F5)
echo    - 新的角色和圖片會自動載入
echo.
pause
