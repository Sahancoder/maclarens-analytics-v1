# McLarens Analytics - Development Startup Script (Windows PowerShell)

Write-Host "🚀 Starting McLarens Analytics Development Environment..." -ForegroundColor Cyan

# Navigate to docker directory
Set-Location -Path "infra/docker"

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down

# Build and start containers
Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Seed the database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
docker exec maclarens-api python -m src.db.seed

Write-Host ""
Write-Host "✅ Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Services:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000"
Write-Host "   API:       http://localhost:8000"
Write-Host "   GraphQL:   http://localhost:8000/graphql"
Write-Host "   Postgres:  localhost:5432"
Write-Host "   Redis:     localhost:6379"
Write-Host ""
Write-Host "📋 Test Credentials:" -ForegroundColor Cyan
Write-Host "   Data Officer:      sahanhettiarachchi275@gmail.com / 1234"
Write-Host "   Company Director:  sahanviranga18@gmail.com / 5678"
Write-Host "   Admin:             hmsvhettiarachchi@std.foc.sab.ac.lk / 91011"
Write-Host "   CEO:               oxysusl@gmail.com / 121314"
Write-Host ""
Write-Host "📝 Logs: docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor Gray

# Return to root
Set-Location -Path "../.."
