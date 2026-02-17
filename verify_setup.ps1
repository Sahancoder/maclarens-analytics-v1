# Verification Script for Docker Setup
Write-Host "=== Docker Containers Verification ===" -ForegroundColor Cyan
Write-Host ""

# 1. Container Status
Write-Host "1. Container Status:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String

# 2. Backend Health
Write-Host "`n2. Backend API Health:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "  Status: $($response.StatusCode) - OK" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)"
} catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
}

# 3. Frontend Health
Write-Host "`n3. Frontend Health:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    Write-Host "  Status: $($response.StatusCode) - OK" -ForegroundColor Green
} catch {
    Write-Host "  Status: FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
}

# 4. Database Connection
Write-Host "`n4. Database Content:" -ForegroundColor Yellow
$dbCheck = docker exec maclarens-db psql -U postgres -d maclarens_analytics -t -c "SELECT COUNT(*) FROM analytics.company_master;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Companies in DB: $($dbCheck.Trim())" -ForegroundColor Green
} else {
    Write-Host "  Database check failed" -ForegroundColor Red
}

# 5. Redis Connection  
Write-Host "`n5. Redis Status:" -ForegroundColor Yellow
$redisCheck = docker exec maclarens-redis redis-cli ping 2>&1
if ($redisCheck -eq "PONG") {
    Write-Host "  Redis: OK ($redisCheck)" -ForegroundColor Green
} else {
    Write-Host "  Redis: FAILED" -ForegroundColor Red
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
