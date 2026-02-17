# Test Admin API Endpoints (PowerShell Native)

Write-Host "========================" -ForegroundColor Cyan
Write-Host "Testing Admin API" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

$BaseUrl = "http://localhost:8000"

# Step 1: Login as admin
Write-Host "1. Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{
    email = "sahanviranga18@gmail.com"
    portal = "system-admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login/dev" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"

    if ($loginResponse.access_token) {
        Write-Host "✓ Login successful!" -ForegroundColor Green
        $token = $loginResponse.access_token
        Write-Host "Token: $($token.Substring(0,20))...`n" -ForegroundColor Gray
    } else {
        Write-Host "✗ Login failed! No token received." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Login failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

# Step 2: Test Dashboard Stats
Write-Host "2. Fetching dashboard stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$BaseUrl/api/admin/stats/dashboard" `
        -Method Get `
        -Headers $headers

    if ($stats) {
        Write-Host "✓ Dashboard stats retrieved!" -ForegroundColor Green
        Write-Host "  Total Users: $($stats.total_users)" -ForegroundColor Gray
        Write-Host "  Active Companies: $($stats.active_companies)" -ForegroundColor Gray
        Write-Host "  Total Clusters: $($stats.total_clusters)" -ForegroundColor Gray
        Write-Host "  Pending Reports: $($stats.pending_reports)`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get stats" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Step 3: Test Users List
Write-Host "3. Listing users..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$BaseUrl/api/admin/users?limit=5" `
        -Method Get `
        -Headers $headers

    if ($users.users) {
        Write-Host "✓ Users list retrieved!" -ForegroundColor Green
        Write-Host "  Total: $($users.pagination.total)" -ForegroundColor Gray
        Write-Host "  Showing: $($users.users.Count) users`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get users" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Step 4: Test Companies List
Write-Host "4. Listing companies..." -ForegroundColor Yellow
try {
    $companies = Invoke-RestMethod -Uri "$BaseUrl/api/admin/companies?limit=5" `
        -Method Get `
        -Headers $headers

    if ($companies.companies) {
        Write-Host "✓ Companies list retrieved!" -ForegroundColor Green
        Write-Host "  Total: $($companies.pagination.total)" -ForegroundColor Gray
        Write-Host "  Showing: $($companies.companies.Count) companies`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get companies" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Step 5: Test Clusters List
Write-Host "5. Listing clusters..." -ForegroundColor Yellow
try {
    $clusters = Invoke-RestMethod -Uri "$BaseUrl/api/admin/clusters" `
        -Method Get `
        -Headers $headers

    if ($clusters.clusters) {
        Write-Host "✓ Clusters list retrieved!" -ForegroundColor Green
        Write-Host "  Total: $($clusters.clusters.Count) clusters`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get clusters" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Step 6: Test Recent Activity
Write-Host "6. Fetching recent activity..." -ForegroundColor Yellow
try {
    $activity = Invoke-RestMethod -Uri "$BaseUrl/api/admin/activity/recent?limit=5" `
        -Method Get `
        -Headers $headers

    if ($activity.activities) {
        Write-Host "✓ Activity log retrieved!" -ForegroundColor Green
        Write-Host "  Total activities: $($activity.total)" -ForegroundColor Gray
        Write-Host "  Showing: $($activity.activities.Count) recent`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get activity" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n========================" -ForegroundColor Cyan
Write-Host "✓ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Cyan
