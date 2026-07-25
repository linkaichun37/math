@echo off
setlocal
cd /d "%~dp0"
title Math Gap Finder - Local Server

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if "%OPENAI_API_KEY%"=="" (
  echo.
  echo Photo analysis needs your OpenAI API key.
  set /p OPENAI_API_KEY=Paste your API key here, then press Enter: 
)

if "%OPENAI_API_KEY%"=="" (
  echo.
  echo No API key was entered, so photo analysis cannot run.
  pause
  exit /b 1
)

echo.
echo Starting Math Gap Finder...
start "" /b node server.mjs
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
echo Keep this window open while using the website.
echo Press Ctrl+C to stop the local server.
pause >nul
