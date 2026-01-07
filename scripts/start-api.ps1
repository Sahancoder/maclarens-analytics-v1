# =============================================================================
# McLarens Analytics - Start FastAPI Backend (Local Development)
# =============================================================================
# Prerequisites:
#   1. Python 3.11+ installed
#   2. Docker services running: docker compose -f infra/docker/docker-compose.infra.yml up -d
#   3. Virtual environment with dependencies installed
#
# Usage: .\scripts\start-api.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# Get script and project directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ApiDir = Join-Path $ProjectRoot "apps\api"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  McLarens Analytics - FastAPI Backend" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path $ApiDir)) {
    Write-Host "Error: API directory not found at $ApiDir" -ForegroundColor Red
    exit 1
}

# Navigate to API directory
Set-Location $ApiDir
Write-Host "Working directory: $ApiDir" -ForegroundColor Gray

# Check for virtual environment
$VenvPath = Join-Path $ApiDir "venv"
$VenvActivate = Join-Path $VenvPath "Scripts\Activate.ps1"

if (Test-Path $VenvActivate) {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & $VenvActivate
} else {
    Write-Host "Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv venv
    & $VenvActivate
    
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Load environment variables from .env.dev
$EnvFile = Join-Path $ApiDir ".env.dev"
if (Test-Path $EnvFile) {
    Write-Host "Loading environment from .env.dev..." -ForegroundColor Yellow
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove surrounding quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "Warning: .env.dev not found. Using system environment variables." -ForegroundColor Yellow
}

# Check if Docker services are running
Write-Host ""
Write-Host "Checking Docker services..." -ForegroundColor Yellow
$PostgresRunning = docker ps --filter "name=maclarens-postgres" --format "{{.Names}}" 2>$null
if (-not $PostgresRunning) {
    Write-Host "Warning: PostgreSQL container not running!" -ForegroundColor Red
    Write-Host "Run: docker compose -f infra/docker/docker-compose.infra.yml up -d" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Starting FastAPI with hot reload..." -ForegroundColor Green
Write-Host "API URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "GraphQL: http://localhost:8000/graphql" -ForegroundColor Cyan
Write-Host "Health:  http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start uvicorn with hot reload
$env:PYTHONPATH = $ApiDir
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
