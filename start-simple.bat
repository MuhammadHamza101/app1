@echo off
REM PatentFlow Enterprise - Simple Startup (No Collaboration)
REM This script starts the web application only

echo ==========================================
echo    🚀 PatentFlow Enterprise - Simple Start
echo ==========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Set environment variables
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

REM Kill any existing process on port 3000
echo 🔄 Checking for existing services...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    echo Stopping process on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

REM Start web application
echo.
echo 🌐 Starting PatentFlow Enterprise...
echo This may take a minute to start...
echo.

call npm run dev

echo.
echo If the application started successfully:
echo 📱 Open: http://localhost:3000
echo 🔑 Login: admin@patentflow.com / admin123
echo.
pause