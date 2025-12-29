@echo off
chcp 65001 >nul
echo ========================================
echo    一鍵部署到 GitHub Pages
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 整合 TAG 資料...
node merge-tags.js
if errorlevel 1 (
    echo.
    echo ❌ TAG 整合失敗！
    pause
    exit /b 1
)

echo.
echo [2/3] 打包專案...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ 打包失敗！
    pause
    exit /b 1
)

echo.
echo [3/3] 部署到 GitHub Pages...
call npx gh-pages -d dist -b deploy
if errorlevel 1 (
    echo.
    echo ❌ 部署失敗！
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 部署完成！
echo 網址: https://auer0960.github.io/CR_PLAN/
echo ========================================
echo.
pause

