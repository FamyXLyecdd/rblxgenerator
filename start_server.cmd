@echo off
title Roblox Generator Server
color 0c
echo ==============================================================
echo      ROBLOX SNEAKY GENERATOR - SERVER LAUNCHER
echo ==============================================================
echo.
echo [1/3] Checking dependencies...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit
)

echo [2/3] Installing/Updating required libraries...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install requirements. Check internet connection.
    pause
    exit
)

echo [3/3] Starting Server...
echo.
echo Access the Dashboard at: http://localhost:5000
echo.
python server.py
pause
