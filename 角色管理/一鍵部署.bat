@echo off
chcp 65001 >nul
echo ========================================
echo    一鍵部署到 GitHub Pages
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 重新生成角色基本資料 (cr_data.json)...
node scripts/extract_cr_data.js
if errorlevel 1 (
    echo.
    echo ❌ 角色資料生成失敗！
    pause
    exit /b 1
)

echo.
echo [2/4] 整合 TAG 資料到 cr_data.json...
node merge-tags.js
if errorlevel 1 (
    echo.
    echo ❌ TAG 整合失敗！
    pause
    exit /b 1
)

echo.
echo [3/4] 複製 user_data.json 到 public 資料夾...
copy /Y user_data.json public\user_data.json
if errorlevel 1 (
    echo.
    echo ❌ 複製失敗！
    pause
    exit /b 1
)

echo.
echo [4/4] 打包並部署...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ 打包失敗！
    pause
    exit /b 1
)

echo.
echo 正在部署到 GitHub Pages...
call npx gh-pages -d dist -b deploy
if errorlevel 1 (
    echo.
    echo ❌ 部署失敗！
    pause
    exit /b 1
)

echo.
echo 清理 public 資料夾中的 user_data.json...
del /F /Q public\user_data.json

echo.
echo ========================================
echo ✅ 部署完成！
echo.
echo 網址: https://auer0960.github.io/CR_PLAN/
echo.
echo 📌 已部署內容：
echo   ✅ 角色基本資料 (cr_data.json - 從母專案提取)
echo   ✅ TAG 分類資料 (已整合)
echo   ✅ 使用者編輯資料 (user_data.json - 關係圖/筆記/TAG)
echo   ✅ 角色圖片
echo.
echo 💡 網路版會自動合併兩個檔案：
echo    - cr_data.json 提供角色基本資料和圖片
echo    - user_data.json 提供您的編輯（關係圖優先）
echo ========================================
echo.
pause

