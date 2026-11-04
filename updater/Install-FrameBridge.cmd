@echo off
title FRAME One-Click Update Helper
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-FrameBridge.ps1"
if errorlevel 1 (
 echo.
 echo FRAME helper setup failed. Copy the error above when reporting it.
)
echo.
pause
