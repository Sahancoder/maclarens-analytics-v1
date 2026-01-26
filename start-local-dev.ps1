# ============================================================================
# MacLarens Analytics - Complete Local Development Startup
# ============================================================================
# This script starts all services needed for local development:
#   - PostgreSQL check
#   - Backend API (FastAPI)
#   - Frontend (Next.js)
#   - Mailpit (Email testing)
# ============================================================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MacLarens Analytics - Local Dev Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. Check PostgreSQL
# ============================================================================
Write-Host "[1/4] Checking PostgreSQL..." -ForegroundColor Yellow

try {
    $pgCheck = & psql -U postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL is running" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ PostgreSQL not found or not running" -ForegroundColor Red
    Write-Host "  Please install PostgreSQL and ensure it's running" -ForegroundColor Red
    Write-Host "  Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# 2. Check Mailpit (optional but recommended)
# ============================================================================
Write-Host ""
Write-Host "[2/4] Checking Mailpit..." -ForegroundColor Yellow

try {
    $mailpitCheck = Get-Command mailpit -ErrorAction SilentlyContinue
    if ($mailpitCheck) {
        Write-Host "✓ Mailpit is installed" -ForegroundColor Green
        Write-Host "  Starting Mailpit in background..." -ForegroundColor Cyan
        
        # Start Mailpit in a new window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "mailpit"
        Start-Sleep -Seconds 2
        Write-Host "  → SMTP: localhost:1025" -ForegroundColor Gray
        Write-Host "  → Web UI: http://localhost:8025" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Mailpit not found (optional)" -ForegroundColor Yellow
        Write-Host "  Install: scoop install mailpit" -ForegroundColor Gray
        Write-Host "  Or download: https://github.com/axllent/mailpit/releases" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠ Mailpit check failed (skipping)" -ForegroundColor Yellow
}

# ============================================================================
# 3. Start Backend API
# ============================================================================
Write-Host ""
Write-Host "[3/4] Starting Backend API..." -ForegroundColor Yellow

# Check if venv exists
$venvPath = "apps\api\.venv"
if (-Not (Test-Path $venvPath)) {
    Write-Host "✗ Virtual environment not found at: $venvPath" -ForegroundColor Red
    Write-Host "  Creating virtual environment..." -ForegroundColor Yellow
    
    Push-Location apps\api
    python -m venv .venv
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Virtual environment created" -ForegroundColor Green
        Write-Host "  Installing dependencies..." -ForegroundColor Yellow
        
        & .venv\Scripts\pip.exe install --upgrade pip
        & .venv\Scripts\pip.exe install -r requirements.txt
        
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create virtual environment" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Check if .env exists
if (-Not (Test-Path "apps\api\.env")) {
    Write-Host "⚠ Backend .env file not found" -ForegroundColor Yellow
    Write-Host "  Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item "apps\api\.env.example" "apps\api\.env"
    Write-Host "✓ .env file created - please review and update" -ForegroundColor Green
}

# Start backend in new window
Write-Host "  Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host 'MacLarens Analytics - Backend API' -ForegroundColor Green
Write-Host '=================================' -ForegroundColor Green
Write-Host ''
Set-Location '$PWD\apps\api'
& .venv\Scripts\activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
"@

Start-Sleep -Seconds 3
Write-Host "✓ Backend starting..." -ForegroundColor Green
Write-Host "  → API: http://localhost:8000" -ForegroundColor Gray
Write-Host "  → Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "  → GraphQL: http://localhost:8000/graphql" -ForegroundColor Gray

# ============================================================================
# 4. Start Frontend
# ============================================================================
Write-Host ""
Write-Host "[4/4] Starting Frontend..." -ForegroundColor Yellow

# Check if node_modules exists
if (-Not (Test-Path "apps\frontend\node_modules")) {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location apps\frontend
    npm install
    Pop-Location
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

# Check if .env.local exists
if (-Not (Test-Path "apps\frontend\.env.local")) {
    Write-Host "⚠ Frontend .env.local file not found" -ForegroundColor Yellow
    Write-Host "  Copying .env.local.example to .env.local..." -ForegroundColor Yellow
    Copy-Item "apps\frontend\.env.local.example" "apps\frontend\.env.local"
    Write-Host "✓ .env.local file created - please review and update" -ForegroundColor Green
}

# Start frontend in new window
Write-Host "  Starting frontend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
Write-Host 'MacLarens Analytics - Frontend' -ForegroundColor Green
Write-Host '===============================' -ForegroundColor Green
Write-Host ''
Set-Location '$PWD\apps\frontend'
npm run dev
"@

Start-Sleep -Seconds 2
Write-Host "✓ Frontend starting..." -ForegroundColor Green
Write-Host "  → App: http://localhost:3000" -ForegroundColor Gray

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✓ All services started!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor White
Write-Host "  • Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • Backend:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  • GraphQL:   http://localhost:8000/graphql" -ForegroundColor Cyan
Write-Host "  • Mailpit:   http://localhost:8025" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop services" -ForegroundColor Gray
Write-Host ""
