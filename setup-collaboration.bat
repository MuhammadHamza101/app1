@echo off
REM PatentFlow Enterprise - Collaboration Service Fix
REM This script creates the missing collaboration service

echo ==========================================
echo    🔧 PatentFlow Collaboration Fix
echo ==========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Create collaboration service directory
echo Creating collaboration service directory...
if not exist "mini-services\collaboration-service" (
    mkdir "mini-services\collaboration-service"
    echo ✅ Directory created
) else (
    echo ✅ Directory already exists
)

REM Create package.json
echo Creating package.json...
(
    echo {
    echo   "name": "patentflow-collaboration-service",
    echo   "version": "1.0.0",
    echo   "description": "PatentFlow Enterprise Real-time Collaboration Service",
    echo   "main": "index.js",
    echo   "scripts": {
    echo     "dev": "node index.js",
    echo     "start": "node index.js"
    echo   },
    echo   "dependencies": {
    echo     "socket.io": "^4.7.2",
    echo     "cors": "^2.8.5"
    echo   }
    echo }
) > "mini-services\collaboration-service\package.json"

echo ✅ package.json created

REM Create index.js
echo Creating index.js...
(
    echo const { Server } = require^('socket.io'^);
    echo const http = require^('http'^);
    echo const cors = require^('cors'^);
    echo.
    echo const server = http.createServer^(^(req, res^) =^> {
    echo   res.writeHead^(200, {'Content-Type': 'text/plain'}^);
    echo   res.end^('PatentFlow Collaboration Service Running'^);
    echo }^);
    echo.
    echo const io = new Server^(server, {
    echo   cors: { origin: "*" }
    echo }^);
    echo.
    echo const PORT = 3003;
    echo.
    echo io.on^('connection', ^(socket^) =^> {
    echo   console.log^(`User connected: ${socket.id}`^);
    echo   socket.on^('disconnect', ^(^) =^> {
    echo     console.log^(`User disconnected: ${socket.id}`^);
    echo   }^);
    echo }^);
    echo.
    echo server.listen^(PORT, ^(^) =^> {
    echo   console.log^(`Collaboration service running on port ${PORT}`^);
    echo }^);
) > "mini-services\collaboration-service\index.js"

echo ✅ index.js created

REM Install dependencies
echo.
echo 📦 Installing collaboration service dependencies...
cd "mini-services\collaboration-service"
call npm install

if %errorlevel% equ 0 (
    echo ✅ Collaboration service setup completed!
    echo.
    echo You can now run the main launcher:
    echo   start-windows.bat
) else (
    echo ❌ Failed to install dependencies
    echo.
    echo Try running this command manually:
    echo   cd mini-services\collaboration-service
    echo   npm install
)

cd ..\..
pause