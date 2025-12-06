@echo off
REM PatentFlow Enterprise - Quick Database Fix
REM This script fixes the DATABASE_URL issue immediately

echo ==========================================
echo    🔧 PatentFlow Database Fix
echo ==========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Create .env file with correct path
echo Creating .env file with database configuration...
(
    echo DATABASE_URL=file:./db/custom.db
    echo NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
    echo NEXTAUTH_URL=http://localhost:3000
) > .env

echo ✅ .env file created successfully!

REM Ensure database directory exists
if not exist "db" (
    mkdir db
    echo ✅ Database directory created
)

REM Set environment variable for this session
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

echo.
echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo.

echo 🗄️ Setting up database...
npm run db:push

if %errorlevel% equ 0 (
    echo.
    echo ✅ Database setup completed successfully!
    echo.
    echo You can now run the main launcher:
    echo   start-windows.bat
    echo.
    echo Or start the application manually:
    echo   npm run dev
    echo.
) else (
    echo.
    echo ❌ Database setup failed.
    echo Please check the error message above.
)

pause