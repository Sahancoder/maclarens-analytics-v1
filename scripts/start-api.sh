#!/bin/bash
# =============================================================================
# McLarens Analytics - Start FastAPI Backend (Local Development)
# =============================================================================
# Prerequisites:
#   1. Python 3.11+ installed
#   2. Docker services running: docker compose -f infra/docker/docker-compose.infra.yml up -d
#   3. Virtual environment with dependencies installed
#
# Usage: ./scripts/start-api.sh
# =============================================================================

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

echo "============================================="
echo "  McLarens Analytics - FastAPI Backend"
echo "============================================="
echo ""

# Check if API directory exists
if [ ! -d "$API_DIR" ]; then
    echo "Error: API directory not found at $API_DIR"
    exit 1
fi

cd "$API_DIR"
echo "Working directory: $API_DIR"

# Check for virtual environment
VENV_PATH="$API_DIR/venv"

if [ -f "$VENV_PATH/bin/activate" ]; then
    echo "Activating virtual environment..."
    source "$VENV_PATH/bin/activate"
else
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    source "$VENV_PATH/bin/activate"
    
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Load environment variables from .env.dev
ENV_FILE="$API_DIR/.env.dev"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from .env.dev..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Warning: .env.dev not found. Using system environment variables."
fi

# Check if Docker services are running
echo ""
echo "Checking Docker services..."
if ! docker ps --filter "name=maclarens-postgres" --format "{{.Names}}" | grep -q "maclarens-postgres"; then
    echo "Warning: PostgreSQL container not running!"
    echo "Run: docker compose -f infra/docker/docker-compose.infra.yml up -d"
    echo ""
fi

echo ""
echo "Starting FastAPI with hot reload..."
echo "API URL: http://localhost:8000"
echo "GraphQL: http://localhost:8000/graphql"
echo "Health:  http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start uvicorn with hot reload
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
