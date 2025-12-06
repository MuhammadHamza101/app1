# PatentFlow Enterprise - PowerShell Launcher for Windows
# This PowerShell script handles environment variables better than batch

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   🚀 PatentFlow Enterprise Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Note: Running as Administrator is recommended" -ForegroundColor Yellow
    Write-Host ""
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed" -ForegroundColor Green
    Write-Host "   Version: $nodeVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ Node.js is not installed." -ForegroundColor Red
    Write-Host "Installing Node.js..." -ForegroundColor Yellow
    
    try {
        winget install OpenJS.NodeJS --accept-source-agreements --accept-package-agreements
        Write-Host "✅ Node.js installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Automatic installation failed." -ForegroundColor Red
        Write-Host "Please install Node.js manually from: https://nodejs.org" -ForegroundColor Yellow
        Start-Process "https://nodejs.org/en/download/"
        exit 1
    }
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python is installed" -ForegroundColor Green
    Write-Host "   Version: $pythonVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ Python is not installed." -ForegroundColor Red
    Write-Host "Installing Python..." -ForegroundColor Yellow
    
    try {
        winget install Python.Python.3 --accept-source-agreements --accept-package-agreements
        Write-Host "✅ Python installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Python installation failed, but continuing..." -ForegroundColor Yellow
        Write-Host "Python is optional for basic functionality." -ForegroundColor Gray
    }
}

# Navigate to script directory
Set-Location $PSScriptRoot

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please ensure you're in the correct directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Installing dependencies for the first time..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Gray
    Write-Host ""
    
    try {
        npm cache clean --force
        npm install --verbose
        Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
        Write-Host "Trying alternative installation method..." -ForegroundColor Yellow
        
        try {
            npm install --legacy-peer-deps
            Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Installation failed completely." -ForegroundColor Red
            Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Setup environment variables
Write-Host ""
Write-Host "🔧 Setting up environment..." -ForegroundColor Yellow

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Gray
    
    $envContent = @"
DATABASE_URL=file:./db/custom.db
NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
"@
    
    Set-Content -Path ".env" -Value $envContent
    Write-Host "✅ .env file created" -ForegroundColor Green
}

# Ensure database directory exists
if (-not (Test-Path "db")) {
    New-Item -ItemType Directory -Path "db" | Out-Null
    Write-Host "✅ Database directory created" -ForegroundColor Green
}

# Set environment variables for this session
$env:DATABASE_URL = "file:./db/custom.db"
$env:NEXTAUTH_SECRET = "patentflow-enterprise-secret-key-change-in-production"
$env:NEXTAUTH_URL = "http://localhost:3000"

Write-Host "Environment variables set:" -ForegroundColor Gray
Write-Host "DATABASE_URL=$env:DATABASE_URL" -ForegroundColor Gray
Write-Host ""

# Setup database
Write-Host "🗄️ Setting up database..." -ForegroundColor Yellow

try {
    npm run db:push
    Write-Host "✅ Database setup complete!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to setup database" -ForegroundColor Red
    Write-Host "Trying to fix database issues..." -ForegroundColor Yellow
    
    # Try to reset database
    if (Test-Path "db/custom.db") {
        Write-Host "Removing existing database..." -ForegroundColor Gray
        Remove-Item "db/custom.db" -Force
    }
    
    Write-Host "Retrying database setup..." -ForegroundColor Gray
    try {
        npm run db:push
        Write-Host "✅ Database setup complete!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Database setup failed completely." -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Setup collaboration service
if (-not (Test-Path "mini-services/collaboration-service")) {
    Write-Host "❌ Collaboration service directory not found." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install collaboration service dependencies
if (-not (Test-Path "mini-services/collaboration-service/node_modules")) {
    Write-Host ""
    Write-Host "📦 Installing collaboration service dependencies..." -ForegroundColor Yellow
    
    Set-Location "mini-services/collaboration-service"
    
    try {
        npm install --verbose
        Set-Location "../.."
        Write-Host "✅ Collaboration service dependencies installed!" -ForegroundColor Green
    } catch {
        Set-Location "../.."
        Write-Host "❌ Failed to install collaboration service dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✅ Collaboration service dependencies already installed" -ForegroundColor Green
}

# Kill existing processes on ports 3000 and 3003
Write-Host ""
Write-Host "🔄 Checking for existing services..." -ForegroundColor Yellow

$processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
foreach ($proc in $processes3000) {
    if ($proc.OwningProcess) {
        Write-Host "Stopping process on port 3000 (PID: $($proc.OwningProcess))..." -ForegroundColor Gray
        Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

$processes3003 = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue
foreach ($proc in $processes3003) {
    if ($proc.OwningProcess) {
        Write-Host "Stopping process on port 3003 (PID: $($proc.OwningProcess))..." -ForegroundColor Gray
        Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Start services
Write-Host ""
Write-Host "🤝 Starting collaboration service..." -ForegroundColor Yellow

$collabJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD + "/mini-services/collaboration-service"
    npm run dev
}

# Wait for collaboration service to start
Write-Host "Waiting for collaboration service to start..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "🌐 Starting web application..." -ForegroundColor Yellow

$webJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:DATABASE_URL = "file:./db/custom.db"
    $env:NEXTAUTH_SECRET = "patentflow-enterprise-secret-key-change-in-production"
    $env:NEXTAUTH_URL = "http://localhost:3000"
    npm run dev
}

# Wait for services to start
Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if services are running
Write-Host ""
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Web application is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Web application starting up..." -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Collaboration service is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Collaboration service starting up..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   🎉 PatentFlow Enterprise is Ready!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Access the application at:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔑 Default login credentials:" -ForegroundColor White
Write-Host "   Email: admin@patentflow.com" -ForegroundColor Gray
Write-Host "   Password: admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To stop the application:" -ForegroundColor White
Write-Host "   Close this PowerShell window" -ForegroundColor Gray
Write-Host "   Or press Ctrl+C" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Opening browser in 5 seconds..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

# Open browser
try {
    Start-Process "http://localhost:3000"
    Write-Host "✅ Browser opened! PatentFlow Enterprise is ready to use!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not open browser automatically." -ForegroundColor Yellow
    Write-Host "Please manually open: http://localhost:3000" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press Ctrl+C to stop the services..." -ForegroundColor Gray

# Keep the script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Cleanup jobs when script is stopped
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    Get-Job | Remove-Job -Force
    Write-Host "Services stopped." -ForegroundColor Green
}