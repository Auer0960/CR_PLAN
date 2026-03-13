@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ==========================================
echo      角色關係圖應用程式 - 啟動中
echo ==========================================
echo.

:: 1. Check for Local Node (Priority 1)
if exist "%~dp0local_node\node-v20.18.0-win-x64\node.exe" (
    echo [系統] 偵測到獨立執行環境 (Local Node)
    set "PATH=%~dp0local_node\node-v20.18.0-win-x64;%PATH%"
) else (
    :: 2. Check for System Node (Priority 2)
    where node >nul 2>nul
    if !errorlevel! neq 0 (
        echo.
        echo ========================================================
        echo [錯誤] 找不到執行環境！
        echo ========================================================
        echo.
        echo 系統找不到 Node.js，也找不到獨立執行環境。
        echo.
        echo 請先執行資料夾中的「一鍵安裝.bat」來自動安裝必要元件。
        echo.
        echo ========================================================
        pause
        exit /b
    ) else (
        echo [系統] 使用系統安裝的 Node.js
    )
)

:: 3. Double Check Node Version
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] Node.js 無法執行。請嘗試重新執行「一鍵安裝.bat」。
    pause
    exit /b
)

:: 4. Start Application
echo.
echo [系統] 正在啟動伺服器...
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [錯誤] 程式異常終止。
    pause
)
