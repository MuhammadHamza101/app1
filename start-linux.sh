#!/bin/bash

# PatentFlow Enterprise - One-Click Launcher for Ubuntu/Linux
# This script makes it easy for non-technical users to start the application

echo "🚀 Starting PatentFlow Enterprise..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Installing now..."
    echo "This may take a few minutes..."
    
    # Update package list
    sudo apt update
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    echo "✅ Node.js installed successfully!"
else
    echo "✅ Node.js is already installed"
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Installing now..."
    sudo apt install -y python3 python3-pip
    echo "✅ Python 3 installed successfully!"
else
    echo "✅ Python 3 is already installed"
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies for the first time..."
    echo "This may take a few minutes..."
    npm install
    echo "✅ Dependencies installed!"
fi

# Initialize database if needed
echo "🗄️ Setting up database..."
npm run db:push

# Check if collaboration service dependencies are installed
if [ ! -d "mini-services/collaboration-service/node_modules" ]; then
    echo "📦 Installing collaboration service dependencies..."
    cd mini-services/collaboration-service
    npm install
    cd ../..
    echo "✅ Collaboration service ready!"
fi

# Start services in background
echo "🤝 Starting collaboration service..."
cd mini-services/collaboration-service
npm run dev &
COLLAB_PID=$!
cd ../..

# Wait a moment for collaboration service to start
sleep 3

echo "🌐 Starting web application..."
npm run dev &
WEB_PID=$!

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo "🔍 Checking service status..."

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Web application is running!"
else
    echo "⚠️  Web application starting up..."
fi

if curl -s http://localhost:3003 > /dev/null; then
    echo "✅ Collaboration service is running!"
else
    echo "⚠️  Collaboration service starting up..."
fi

echo ""
echo "🎉 PatentFlow Enterprise is starting!"
echo ""
echo "📱 Access the application at:"
echo "   http://localhost:3000"
echo ""
echo "🔑 Default login credentials:"
echo "   Email: admin@patentflow.com"
echo "   Password: admin123"
echo ""
echo "🛑 To stop the application:"
echo "   Close this terminal window"
echo "   Or press Ctrl+C"
echo ""
echo "🌐 Opening browser in 5 seconds..."
sleep 5

# Try to open the default browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v gnome-open &> /dev/null; then
    gnome-open http://localhost:3000
fi

echo "✅ Browser opened! PatentFlow Enterprise is ready to use!"

# Keep the script running
wait