@echo off
echo ====================================
echo Installing Sharp Library...
echo ====================================
call npm install sharp --save-dev

if %errorlevel% neq 0 (
    echo.
    echo Installation failed. Please check the error above.
    pause
    exit /b 1
)

echo.
echo ====================================
echo Running Image Optimization...
echo ====================================
call node scripts/optimize_images.js

echo.
echo ====================================
echo Done!
echo ====================================
pause
