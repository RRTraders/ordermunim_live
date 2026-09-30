@echo off
title Meesho OTP Hub - Automation & Cloud Tunnel
echo ========================================================
echo        STARTING MEESHO OTP HUB BACKGROUND SERVICES
echo ========================================================
echo.

cd /d "%~dp0server"

echo [1/2] Starting Cloudflare HTTPS Tunnel...
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:4000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Meesho OTP Node.js Backend Server...
start "Meesho OTP Worker" cmd /k "node server.js"

echo.
echo ========================================================
echo Services launched successfully!
echo Public Live Web App: https://meesho-otp-live.web.app
echo ========================================================
pause
