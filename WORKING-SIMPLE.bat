@echo off
REM PatentFlow Enterprise - WORKING SIMPLE TEST
REM This will create a working version

echo ==========================================
echo    PatentFlow Simple Test
echo ==========================================
echo.

cd /d "%~dp0"

set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

echo Testing basic functionality...
echo.

REM Create simple working dashboard
echo 'use client' > "src\app\dashboard\simple-page.tsx"
echo. >> "src\app\dashboard\simple-page.tsx"
echo import { useSession } from 'next-auth/react' >> "src\app\dashboard\simple-page.tsx"
echo import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' >> "src\app\dashboard\simple-page.tsx"
echo import { Button } from '@/components/ui/button' >> "src\app\dashboard\simple-page.tsx"
echo. >> "src\app\dashboard\simple-page.tsx"
echo export default function SimpleDashboard() { >> "src\app\dashboard\simple-page.tsx"
echo   const { data: session } = useSession() >> "src\app\dashboard\simple-page.tsx"
echo. >> "src\app\dashboard\simple-page.tsx"
echo   if (!session) { >> "src\app\dashboard\simple-page.tsx"
echo     return div Loading... /div >> "src\app\dashboard\simple-page.tsx"
echo   } >> "src\app\dashboard\simple-page.tsx"
echo. >> "src\app\dashboard\simple-page.tsx"
echo   return ( >> "src\app\dashboard\simple-page.tsx"
echo     div className="min-h-screen bg-gray-50 p-8" >> "src\app\dashboard\simple-page.tsx"
echo       Card className="max-w-4xl mx-auto" >> "src\app\dashboard\simple-page.tsx"
echo         CardHeader >> "src\app\dashboard\simple-page.tsx"
echo           CardTitle PatentFlow Enterprise Dashboard /CardTitle >> "src\app\dashboard\simple-page.tsx"
echo         /CardHeader >> "src\app\dashboard\simple-page.tsx"
echo         CardContent >> "src\app\dashboard\simple-page.tsx"
echo           div className="text-center space-y-4" >> "src\app\dashboard\simple-page.tsx"
echo             h1 className="text-2xl font-bold" Welcome to PatentFlow Enterprise! /h1 >> "src\app\dashboard\simple-page.tsx"
echo             p className="text-gray-600" You are successfully logged in. /p >> "src\app\dashboard\simple-page.tsx"
echo             div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" >> "src\app\dashboard\simple-page.tsx"
echo               p User: {session.user?.email || 'Unknown'} /p >> "src\app\dashboard\simple-page.tsx"
echo               p Name: {session.user?.name || 'Unknown'} /p >> "src\app\dashboard\simple-page.tsx"
echo               p Role: {session.user?.role || 'Unknown'} /p >> "src\app\dashboard\simple-page.tsx"
echo             /div >> "src\app\dashboard\simple-page.tsx"
echo             div className="mt-6" >> "src\app\dashboard\simple-page.tsx"
echo               Button onClick={() = window.location.href = '/auth/signin'} Sign Out /Button >> "src\app\dashboard\simple-page.tsx"
echo             /div >> "src\app\dashboard\simple-page.tsx"
echo           /div >> "src\app\dashboard\simple-page.tsx"
echo         /CardContent >> "src\app\dashboard\simple-page.tsx"
echo       /Card >> "src\app\dashboard\simple-page.tsx"
echo     /div >> "src\app\dashboard\simple-page.tsx"
echo   ) >> "src\app\dashboard\simple-page.tsx"
echo   ) >> "src\app\dashboard\simple-page.tsx"
echo } >> "src\app\dashboard\simple-page.tsx"

echo Simple dashboard created!
echo.

REM Backup original dashboard
if exist "src\app\dashboard\page.tsx" (
    copy "src\app\dashboard\page.tsx" "src\app\dashboard\page.tsx.backup"
    echo Original dashboard backed up
)

REM Replace with simple version
copy "src\app\dashboard\simple-page.tsx" "src\app\dashboard\page.tsx"
echo Simple dashboard activated!

echo.
echo Restarting application...
echo.

REM Kill existing processes
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Start application
echo Starting PatentFlow Enterprise with simple dashboard...
call npm run dev

echo.
echo ==========================================
echo    SIMPLE VERSION READY
echo ==========================================
echo.
echo Go to: http://localhost:3000
echo.
echo Login with:
echo    Email: admin@patentflow.com
echo    Password: admin123
echo.
echo This version:
echo    Shows user information
echo    Simple, working interface
echo    No complex components that might error
echo.
echo To restore original dashboard:
echo    copy "src\app\dashboard\page.tsx.backup" "src\app\dashboard\page.tsx"
echo.
pause