@echo off
chcp 65001 >nul
echo ========================================
echo    一鍵部署到 GitHub Pages
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 重新生成角色基本資料 (cr_data.json)...
node scripts/extract_cr_data.js
if errorlevel 1 (
    echo.
    echo ❌ 角色資料生成失敗！
    pause
    exit /b 1
)

echo.
echo [2/5] 整合 TAG 資料到 cr_data.json...
node merge-tags.js
if errorlevel 1 (
    echo.
    echo ❌ TAG 整合失敗！
    pause
    exit /b 1
)

echo.
echo [3/5] 複製 user_data.json 到 public 資料夾...
copy /Y user_data.json public\user_data.json
if errorlevel 1 (
    echo.
    echo ❌ 複製失敗！
    pause
    exit /b 1
)

echo.
echo [4/5] 打包專案...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ 打包失敗！
    pause
    exit /b 1
)

echo.
echo [5/5] 部署到 GitHub Pages...
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
echo   ✅ 角色基本資料 (cr_data.json)
echo   ✅ TAG 分類資料 (從 local/tags (1).json)
echo   ✅ 使用者編輯 (user_data.json)
echo   ✅ 角色圖片
echo.
echo 💡 本地和雲端體驗完全相同！
echo ========================================
echo.
pause

