#!/bin/bash

# Lyrica Startup Script
# This script starts both the backend and frontend services

set -e

echo "🎵 Starting Lyrica Services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}Port $1 is in use, cleaning up...${NC}"
    lsof -ti :$1 | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Clean up any existing processes on common ports
echo "🧹 Cleaning up existing processes..."
for port in 5000 5001 5002 5003; do
    if check_port $port; then
        kill_port $port
    fi
done

# Start backend
echo ""
echo -e "${BLUE}🔧 Starting Backend API...${NC}"
cd backend
PORT=5001 python3 main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "⏳ Waiting for backend to initialize..."
BACKEND_READY=false
for i in {1..15}; do
    # Try health endpoint first (more reliable)
    if curl -s http://localhost:5001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready on port 5001${NC}"
        BACKEND_READY=true
        break
    fi
    # Fallback to auth endpoint
    if curl -s http://localhost:5001/auth/spotify/status >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready on port 5001${NC}"
        BACKEND_READY=true
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${YELLOW}⚠️  Backend may not be ready yet, continuing anyway...${NC}"
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    echo -e "${YELLOW}⚠️  Warning: Backend is not responding. Frontend may show connection errors.${NC}"
    echo "   Check backend logs above for errors."
fi

# Start frontend
echo ""
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd ../frontend
npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""
echo "📊 Service URLs:"
echo "   Backend:  http://localhost:5001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "💡 To stop all services, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📝 Logs will appear below..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for both processes
wait
