$ErrorActionPreference = "Stop"

Write-Host "`n1. Checking Container Status..." -ForegroundColor Cyan
try {
    $container = docker inspect maclarens-backend | ConvertFrom-Json
    $status = $container[0].State.Status
    Write-Host "   Status: $status" -ForegroundColor ($status -eq "running" ? "Green" : "Red")
    
    if ($status -ne "running") {
        Write-Host "   ExitCode: $($container[0].State.ExitCode)"
        Write-Host "   Error: $($container[0].State.Error)"
    }
} catch {
    Write-Host "   Container 'maclarens-backend' not found or docker is down." -ForegroundColor Red
}

Write-Host "`n2. fast checking logs (last 20 lines)..." -ForegroundColor Cyan
try {
    docker logs maclarens-backend --tail 20
} catch {
    Write-Host "   Could not read logs." -ForegroundColor Red
}

Write-Host "`n3. Checking Port 8000..." -ForegroundColor Cyan
$tcp = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($tcp) {
    Write-Host "   Port 8000 is LISTENING by Process ID $($tcp.OwningProcess)" -ForegroundColor Green
} else {
    Write-Host "   Port 8000 is NOT LISTENING." -ForegroundColor Red
}

Write-Host "`n4. Testing Health Endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method Head -ErrorAction Stop
    Write-Host "   Health Check: OK ($($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Health Check: FAILED ($($_))" -ForegroundColor Red
}
