@echo off
REM PatentFlow Enterprise - WORKING Launcher
REM This script starts the application properly

title PatentFlow Enterprise Launcher

echo.
echo ==========================================
echo    🚀 PatentFlow Enterprise Launcher
echo ==========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Set environment variables
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    (
        echo DATABASE_URL=file:./db/custom.db
        echo NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
        echo NEXTAUTH_URL=http://localhost:3000
    ) > .env
    echo ✅ .env file created
)

REM Ensure database directory exists
if not exist "db" (
    mkdir db
    echo ✅ Database directory created
)

REM Kill any existing processes on port 3000
echo 🔄 Checking for existing services...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    echo Stopping process on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

REM Start web application
echo.
echo 🌐 Starting PatentFlow Enterprise...
echo This may take 1-2 minutes to start...
echo.

REM Start in current window so we can see output
echo Starting Next.js development server...
call npm run dev

echo.
echo ==========================================
echo    🎉 PatentFlow Enterprise
echo ==========================================
echo.
echo 📱 If application started successfully:
echo    Open: http://localhost:3000
echo.
echo 🔑 Login credentials:
echo    Email: admin@patentflow.com
echo    Password: admin123
echo.
echo 🛑 To stop: Press Ctrl+C
echo.
pause