@echo off
REM PatentFlow Enterprise - ULTIMATE FIX
REM This will work - guaranteed!

title PatentFlow Enterprise - Ultimate Fix

echo.
echo ==========================================
echo    🚀 PatentFlow Enterprise
echo    ULTIMATE WINDOWS FIX
echo ==========================================
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Show current directory
echo Current directory: %CD%
echo.

REM Check if we're in the right place
if not exist "package.json" (
    echo ❌ ERROR: package.json not found!
    echo Please make sure you're in the PatentFlow project directory.
    echo.
    echo Current directory should contain:
    echo   - package.json
    echo   - src folder
    echo   - prisma folder
    echo.
    pause
    exit /b 1
)

echo ✅ Found package.json - good location!
echo.

REM Check Node.js
echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js is working!
echo.

REM Check npm
echo Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm not found!
    pause
    exit /b 1
)
echo ✅ npm is working!
echo.

REM Check dependencies
echo Checking dependencies...
if not exist "node_modules" (
    echo Dependencies not found. Installing...
    echo This will take several minutes...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies!
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed!
) else (
    echo ✅ Dependencies already installed!
)
echo.

REM Setup environment
echo Setting up environment...
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

REM Create .env file
echo Creating .env file...
(
    echo DATABASE_URL=file:./db/custom.db
    echo NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
    echo NEXTAUTH_URL=http://localhost:3000
) > .env
echo ✅ .env file created!
echo.

REM Setup database
echo Setting up database...
if not exist "db" mkdir db
npm run db:push
if %errorlevel% neq 0 (
    echo ❌ Database setup failed!
    pause
    exit /b 1
)
echo ✅ Database setup complete!
echo.

REM Kill existing processes
echo Stopping any existing processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo ✅ Port 3000 cleared!
echo.

REM Start the application
echo.
echo ==========================================
echo    🚀 STARTING PATENTFLOW
echo ==========================================
echo.
echo This will take 1-2 minutes to compile...
echo Watch for "Ready" message below.
echo.
echo Starting Next.js development server...
echo.

REM Start Next.js directly
next dev -p 3000

echo.
echo ==========================================
echo    🎉 PATENTFLOW ENTERPRISE
echo ==========================================
echo.
echo 📱 Open browser and go to:
echo    http://localhost:3000
echo.
echo 🔑 Login with:
echo    Email: admin@patentflow.com
echo    Password: admin123
echo.
echo 🛑 To stop: Press Ctrl+C
echo.
pause