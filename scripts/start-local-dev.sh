#!/bin/bash

# ============================================================================
# MacLarens Analytics - Complete Local Development Startup (Linux/macOS)
# ============================================================================
# This script starts all services needed for local development
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

echo -e "${CYAN}======================================"
echo "MacLarens Analytics - Local Dev Setup"
echo -e "======================================${NC}"
echo ""

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ============================================================================
# 1. Check PostgreSQL
# ============================================================================
echo -e "${YELLOW}[1/4] Checking PostgreSQL...${NC}"

if command -v psql &> /dev/null; then
    if psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${RED}✗ PostgreSQL not accessible${NC}"
        echo -e "${YELLOW}Please start PostgreSQL:${NC}"
        echo -e "  ${GRAY}macOS: brew services start postgresql@16${NC}"
        echo -e "  ${GRAY}Linux: sudo systemctl start postgresql${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ PostgreSQL not found${NC}"
    exit 1
fi

# ============================================================================
# 2. Check Mailpit
# ============================================================================
echo ""
echo -e "${YELLOW}[2/4] Checking Mailpit...${NC}"

if command -v mailpit &> /dev/null; then
    echo -e "${GREEN}✓ Mailpit is installed${NC}"
    echo -e "  ${CYAN}Starting Mailpit in background...${NC}"
    
    # Check if already running
    if lsof -Pi :1025 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GRAY}Mailpit already running${NC}"
    else
        mailpit > /dev/null 2>&1 &
        sleep 2
        echo -e "  ${GRAY}→ SMTP: localhost:1025${NC}"
        echo -e "  ${GRAY}→ Web UI: http://localhost:8025${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Mailpit not found (optional)${NC}"
    echo -e "  ${GRAY}Install: brew install mailpit (macOS)${NC}"
    echo -e "  ${GRAY}Or download from: https://github.com/axllent/mailpit/releases${NC}"
fi

# ============================================================================
# 3. Start Backend API
# ============================================================================
echo ""
echo -e "${YELLOW}[3/4] Starting Backend API...${NC}"

# Check if venv exists
VENV_PATH="$PROJECT_ROOT/apps/api/.venv"
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}✗ Virtual environment not found${NC}"
    echo -e "  ${YELLOW}Creating virtual environment...${NC}"
    
    cd "$PROJECT_ROOT/apps/api"
    python3 -m venv .venv
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Virtual environment created${NC}"
        echo -e "  ${YELLOW}Installing dependencies...${NC}"
        
        source .venv/bin/activate
        pip install --upgrade pip > /dev/null 2>&1
        pip install -r requirements.txt
        
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${RED}✗ Failed to create virtual environment${NC}"
        exit 1
    fi
    cd "$PROJECT_ROOT"
fi

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/apps/api/.env" ]; then
    echo -e "${YELLOW}⚠ Backend .env file not found${NC}"
    echo -e "  ${YELLOW}Copying .env.example to .env...${NC}"
    cp "$PROJECT_ROOT/apps/api/.env.example" "$PROJECT_ROOT/apps/api/.env"
    echo -e "${GREEN}✓ .env file created - please review and update${NC}"
fi

# Start backend in new terminal/tab
echo -e "  ${CYAN}Starting backend server...${NC}"

# Detect terminal type and open new window/tab
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/api' && source .venv/bin/activate && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000\""
else
    # Linux - try gnome-terminal, then xterm
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT/apps/api' && source .venv/bin/activate && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$PROJECT_ROOT/apps/api' && source .venv/bin/activate && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000; bash" &
    else
        echo -e "${YELLOW}  Please run this manually in a new terminal:${NC}"
        echo -e "  ${GRAY}cd apps/api && source .venv/bin/activate && uvicorn src.main:app --reload --port 8000${NC}"
    fi
fi

sleep 3
echo -e "${GREEN}✓ Backend starting...${NC}"
echo -e "  ${GRAY}→ API: http://localhost:8000${NC}"
echo -e "  ${GRAY}→ Docs: http://localhost:8000/docs${NC}"
echo -e "  ${GRAY}→ GraphQL: http://localhost:8000/graphql${NC}"

# ============================================================================
# 4. Start Frontend
# ============================================================================
echo ""
echo -e "${YELLOW}[4/4] Starting Frontend...${NC}"

# Check if node_modules exists
if [ ! -d "$PROJECT_ROOT/apps/frontend/node_modules" ]; then
    echo -e "  ${YELLOW}Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/apps/frontend"
    npm install
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Check if .env.local exists
if [ ! -f "$PROJECT_ROOT/apps/frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠ Frontend .env.local file not found${NC}"
    echo -e "  ${YELLOW}Copying .env.local.example to .env.local...${NC}"
    cp "$PROJECT_ROOT/apps/frontend/.env.local.example" "$PROJECT_ROOT/apps/frontend/.env.local"
    echo -e "${GREEN}✓ .env.local file created - please review and update${NC}"
fi

# Start frontend in new terminal/tab
echo -e "  ${CYAN}Starting frontend server...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/frontend' && npm run dev\""
else
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT/apps/frontend' && npm run dev; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$PROJECT_ROOT/apps/frontend' && npm run dev; bash" &
    else
        echo -e "${YELLOW}  Please run this manually in a new terminal:${NC}"
        echo -e "  ${GRAY}cd apps/frontend && npm run dev${NC}"
    fi
fi

sleep 2
echo -e "${GREEN}✓ Frontend starting...${NC}"
echo -e "  ${GRAY}→ App: http://localhost:3000${NC}"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${CYAN}======================================"
echo "✓ All services started!"
echo -e "======================================${NC}"
echo ""
echo -e "${NC}Services running:${NC}"
echo -e "  ${CYAN}• Frontend:  http://localhost:3000${NC}"
echo -e "  ${CYAN}• Backend:   http://localhost:8000/docs${NC}"
echo -e "  ${CYAN}• GraphQL:   http://localhost:8000/graphql${NC}"
echo -e "  ${CYAN}• Mailpit:   http://localhost:8025${NC}"
echo ""
echo -e "${GRAY}Press Ctrl+C in each terminal to stop services${NC}"
echo ""
