#!/bin/bash
# McLarens Analytics - Development Environment Startup
# This script starts all required services for local development

echo "🚀 Starting McLarens Analytics Development Environment"
echo "============================================================"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/infra/docker"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo ""
echo "📦 Starting Docker services (Postgres, Redis, MailHog)..."

cd "$DOCKER_DIR"
docker-compose -f docker-compose.dev.yml up -d postgres redis mailhog

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Show service status
echo ""
echo "✅ Services Started!"
echo "============================================================"
echo ""
echo "   📊 PostgreSQL:  localhost:5432"
echo "   🔴 Redis:       localhost:6379"
echo "   📧 MailHog:     http://localhost:8025 (Web UI)"
echo "                   localhost:1025 (SMTP)"
echo ""
echo "============================================================"

echo ""
echo "📋 Next Steps:"
echo ""
echo "   1. Start the API:"
echo "      cd apps/api"
echo "      pip install -r requirements.txt"
echo "      uvicorn src.main:app --reload --port 8000"
echo ""
echo "   2. Start the Frontend:"
echo "      cd apps/frontend"
echo "      npm install"
echo "      npm run dev"
echo ""
echo "   3. Open the app:"
echo "      http://localhost:3000"
echo ""
echo "   4. Check system health:"
echo "      http://localhost:8000/health/full"
echo ""
echo "============================================================"
echo ""
echo "💡 Tip: Submit a report and check MailHog at http://localhost:8025"
