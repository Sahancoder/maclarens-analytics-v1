#!/bin/bash
# McLarens Analytics - Development Startup Script

echo "🚀 Starting McLarens Analytics Development Environment..."

# Navigate to docker directory
cd infra/docker

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Seed the database
echo "🌱 Seeding database..."
docker exec maclarens-api python -m src.db.seed

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📋 Services:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:8000"
echo "   GraphQL:   http://localhost:8000/graphql"
echo "   Postgres:  localhost:5432"
echo "   Redis:     localhost:6379"
echo ""
echo "📋 Test Credentials:"
echo "   Data Officer:      sahanhettiarachchi275@gmail.com / 1234"
echo "   Company Director:  sahanviranga18@gmail.com / 5678"
echo "   Admin:             hmsvhettiarachchi@std.foc.sab.ac.lk / 91011"
echo "   CEO:               oxysusl@gmail.com / 121314"
echo ""
echo "📝 Logs: docker-compose -f docker-compose.dev.yml logs -f"
