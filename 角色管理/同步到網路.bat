@echo off
chcp 65001 >nul
echo ========================================
echo    一鍵更新並部署到 GitHub Pages
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 重新生成角色資料...
node scripts/extract_cr_data.js
if errorlevel 1 (
    echo.
    echo ❌ 角色資料生成失敗！
    pause
    exit /b 1
)

echo.
echo [2/4] 整合 TAG 資料...
node merge-tags.js
if errorlevel 1 (
    echo.
    echo ❌ TAG 整合失敗！
    pause
    exit /b 1
)

echo.
echo [3/4] 打包專案...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ 打包失敗！
    pause
    exit /b 1
)

echo.
echo [4/4] 部署到 GitHub Pages...
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
echo 提示：別忘了 push 到 main 分支！
echo   git add .
echo   git commit -m "更新角色資料"
echo   git push origin main
echo.
pause

