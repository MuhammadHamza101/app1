@echo off
REM PatentFlow Enterprise - TEST Launcher
REM Simple test to check if web app can start

echo ==========================================
echo    🧪 PatentFlow Enterprise Test
echo ==========================================
echo.

cd /d "%~dp0"

REM Set environment variables
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

REM Kill existing processes
echo 🔄 Stopping any existing processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Start web application
echo.
echo 🌐 Starting web application...
echo.

REM Direct command without call
npm run dev

pause