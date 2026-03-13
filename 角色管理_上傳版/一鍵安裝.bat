@echo off
chcp 65001 >nul
echo 正在啟動安裝精靈...
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0OneClickSetup.ps1'"
pause
