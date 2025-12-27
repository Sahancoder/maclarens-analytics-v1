# McLarens Analytics - Development Environment Startup
# This script starts all required services for local development

Write-Host "🚀 Starting McLarens Analytics Development Environment" -ForegroundColor Cyan
Write-Host "=" * 60

# Change to infra/docker directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath
$dockerPath = Join-Path $rootPath "infra\docker"

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Starting Docker services (Postgres, Redis, MailHog)..." -ForegroundColor Yellow

Push-Location $dockerPath
docker-compose -f docker-compose.dev.yml up -d postgres redis mailhog
Pop-Location

# Wait for services to be ready
Write-Host "`n⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Show service status
Write-Host "`n✅ Services Started!" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""
Write-Host "   📊 PostgreSQL:  localhost:5432" -ForegroundColor Cyan
Write-Host "   🔴 Redis:       localhost:6379" -ForegroundColor Cyan
Write-Host "   📧 MailHog:     http://localhost:8025 (Web UI)" -ForegroundColor Cyan
Write-Host "                   localhost:1025 (SMTP)" -ForegroundColor Gray
Write-Host ""
Write-Host "=" * 60

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Start the API:" -ForegroundColor White
Write-Host "      cd apps/api" -ForegroundColor Gray
Write-Host "      pip install -r requirements.txt" -ForegroundColor Gray
Write-Host "      uvicorn src.main:app --reload --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Start the Frontend:" -ForegroundColor White
Write-Host "      cd apps/frontend" -ForegroundColor Gray
Write-Host "      npm install" -ForegroundColor Gray
Write-Host "      npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Open the app:" -ForegroundColor White
Write-Host "      http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "   4. Check system health:" -ForegroundColor White
Write-Host "      http://localhost:8000/health/full" -ForegroundColor Cyan
Write-Host ""
Write-Host "=" * 60
Write-Host "`n💡 Tip: Submit a report and check MailHog at http://localhost:8025" -ForegroundColor Magenta
