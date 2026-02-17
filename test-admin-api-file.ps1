# Test Admin API Endpoints (File Output)
$LogFile = "api_test_results.log"
"Starting API Tests..." | Out-File $LogFile

$BaseUrl = "http://localhost:8000"

# Step 1: Login
"1. Logging in..." | Add-Content $LogFile
$loginBody = @{
    email = "sahanviranga18@gmail.com"
    portal = "system-admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login/dev" -Method Post -Body $loginBody -ContentType "application/json"
    if ($loginResponse.access_token) {
        "✓ Login successful!" | Add-Content $LogFile
        $token = $loginResponse.access_token
    } else {
        "✗ Login failed!" | Add-Content $LogFile
        exit
    }
} catch {
    "✗ Login error: $($_.Exception.Message)" | Add-Content $LogFile
    exit
}

$headers = @{ Authorization = "Bearer $token" }

# Step 2: Stats
"2. Fetching dashboard stats..." | Add-Content $LogFile
try {
    $stats = Invoke-RestMethod -Uri "$BaseUrl/api/admin/stats/dashboard" -Method Get -Headers $headers
    "✓ Stats: Users=$($stats.total_users), Clusters=$($stats.total_clusters)" | Add-Content $LogFile
} catch {
    "✗ Stats error: $($_.Exception.Message)" | Add-Content $LogFile
}

# Step 3: Users
"3. Listing users..." | Add-Content $LogFile
try {
    $users = Invoke-RestMethod -Uri "$BaseUrl/api/admin/users?limit=5" -Method Get -Headers $headers
    "✓ Users found: $($users.pagination.total)" | Add-Content $LogFile
} catch {
    "✗ Users error: $($_.Exception.Message)" | Add-Content $LogFile
}

# Step 4: Companies
"4. Listing companies..." | Add-Content $LogFile
try {
    $companies = Invoke-RestMethod -Uri "$BaseUrl/api/admin/companies?limit=5" -Method Get -Headers $headers
    "✓ Companies found: $($companies.pagination.total)" | Add-Content $LogFile
} catch {
    "✗ Companies error: $($_.Exception.Message)" | Add-Content $LogFile
}

"Tests Complete" | Add-Content $LogFile
