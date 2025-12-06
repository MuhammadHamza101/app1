@echo off
REM PatentFlow Enterprise - One-Click Launcher for Windows
REM This batch file makes it easy for non-technical users to start the application

title PatentFlow Enterprise Launcher

echo.
echo ==========================================
echo    🚀 PatentFlow Enterprise Launcher
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed.
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org
    echo 2. Download and install Node.js LTS
    echo 3. Run this launcher again
    echo.
    echo Press any key to open Node.js download page...
    pause >nul
    start https://nodejs.org/en/download/
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed.
    echo.
    echo Please install Python first:
    echo 1. Go to https://python.org
    echo 2. Download and install Python 3.9+
    echo 3. Make sure to check "Add Python to PATH"
    echo 4. Run this launcher again
    echo.
    echo Press any key to open Python download page...
    pause >nul
    start https://python.org/downloads/
    exit /b 1
)

echo ✅ Python is installed
python --version

REM Navigate to script directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo 📦 Installing dependencies for the first time...
    echo This may take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed!
)

REM Initialize database
echo.
echo 🗄️ Setting up database...

REM Check if .env file exists
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

REM Set environment variables for this session
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo.

call npm run db:push
if %errorlevel% neq 0 (
    echo ❌ Failed to setup database
    pause
    exit /b 1
)

REM Check if collaboration service dependencies are installed
if not exist "mini-services\collaboration-service\node_modules" (
    echo.
    echo 📦 Installing collaboration service dependencies...
    cd mini-services\collaboration-service
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install collaboration service dependencies
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
    echo ✅ Collaboration service ready!
)

REM Start collaboration service in background
echo.
echo 🤝 Starting collaboration service...
cd mini-services\collaboration-service
start "Collaboration Service" cmd /c "npm run dev"
cd ..\..

REM Wait a moment for collaboration service to start
timeout /t 3 /nobreak >nul

REM Start web application
echo.
echo 🌐 Starting web application...
start "PatentFlow Enterprise" cmd /c "npm run dev"

REM Wait for services to start
echo.
echo ⏳ Waiting for services to start...
timeout /t 5 /nobreak >nul

echo.
echo ==========================================
echo    🎉 PatentFlow Enterprise is Ready!
echo ==========================================
echo.
echo 📱 Access the application at:
echo    http://localhost:3000
echo.
echo 🔑 Default login credentials:
echo    Email: admin@patentflow.com
echo    Password: admin123
echo.
echo 🛑 To stop the application:
echo    Close the black command windows
echo.
echo 🌐 Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:3000

echo ✅ Browser opened! PatentFlow Enterprise is ready to use!
echo.
echo Press any key to close this launcher...
pause >nul