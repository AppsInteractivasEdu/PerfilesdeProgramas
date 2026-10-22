@echo off
set PATH=%LOCALAPPDATA%\Programs\NodeJS20;%PATH%
cd /d "%~dp0"
npm run dev -- --host
