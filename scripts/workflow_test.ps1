# McLarens Analytics - GraphQL Workflow Test Script (PowerShell)
# Version: 1.0
# Usage: .\workflow_test.ps1

param(
    [string]$ApiUrl = "http://localhost:8000/graphql",
    [string]$Email = "",
    [string]$Password = ""
)

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Step { param($msg) Write-Host "`n▶️  $msg" -ForegroundColor Yellow }

# GraphQL Request Helper
function Invoke-GraphQL {
    param(
        [string]$Query,
        [hashtable]$Variables = @{},
        [string]$Token = ""
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $body = @{
        query = $Query
        variables = $Variables
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headers -Body $body
        return $response
    }
    catch {
        Write-Error "Request failed: $_"
        return $null
    }
}

# ===================== TESTS =====================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   McLarens Analytics - Workflow Test   " -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# 1. Health Check
Write-Step "1. Health Check"
$health = Invoke-GraphQL -Query "query { health }"
if ($health.data.health -eq "GraphQL API is healthy") {
    Write-Success "API is healthy"
} else {
    Write-Error "API health check failed"
    exit 1
}

# 2. Login
Write-Step "2. Login"
if (-not $Email -or -not $Password) {
    $Email = Read-Host "Enter email"
    $Password = Read-Host "Enter password" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
}

$loginQuery = @"
mutation Login(`$input: LoginInput!) {
    login(input: `$input) {
        token
        user { id email name role companyId }
    }
}
"@

$loginResult = Invoke-GraphQL -Query $loginQuery -Variables @{
    input = @{
        email = $Email
        password = $Password
    }
}

if ($loginResult.data.login.token) {
    $token = $loginResult.data.login.token
    $user = $loginResult.data.login.user
    Write-Success "Logged in as: $($user.email) (Role: $($user.role))"
} else {
    Write-Error "Login failed"
    exit 1
}

# 3. Verify Session
Write-Step "3. Verify Session (me query)"
$meResult = Invoke-GraphQL -Query "query { me { id email name role companyId } }" -Token $token
if ($meResult.data.me.email) {
    Write-Success "Session verified: $($meResult.data.me.email)"
} else {
    Write-Error "Session verification failed"
}

# 4. Create Report (if Data Officer)
if ($user.role -eq "DATA_OFFICER" -and $user.companyId) {
    Write-Step "4. Create Report"
    
    $createQuery = @"
mutation CreateReport(`$companyId: String!, `$year: Int!, `$month: Int!) {
    createReport(companyId: `$companyId, year: `$year, month: `$month) {
        id companyId year month status
    }
}
"@
    
    $createResult = Invoke-GraphQL -Query $createQuery -Token $token -Variables @{
        companyId = $user.companyId
        year = 2025
        month = 11
    }
    
    if ($createResult.data.createReport.id) {
        $reportId = $createResult.data.createReport.id
        Write-Success "Report created: $reportId (Status: $($createResult.data.createReport.status))"
        
        # 5. Submit Report
        Write-Step "5. Submit Report"
        $submitQuery = @"
mutation SubmitReport(`$id: String!) {
    submitReport(id: `$id) { id status submittedAt }
}
"@
        
        $submitResult = Invoke-GraphQL -Query $submitQuery -Token $token -Variables @{
            id = $reportId
        }
        
        if ($submitResult.data.submitReport.status -eq "SUBMITTED") {
            Write-Success "Report submitted at: $($submitResult.data.submitReport.submittedAt)"
        } else {
            Write-Error "Submit failed"
        }
    } else {
        Write-Error "Create report failed"
    }
}

# 6. View Pending Reports (for Directors)
if ($user.role -in @("COMPANY_DIRECTOR", "ADMIN", "CEO")) {
    Write-Step "6. View Pending Reports"
    $pendingResult = Invoke-GraphQL -Query "query { pendingReports { id companyName year month status submittedAt } }" -Token $token
    
    $count = $pendingResult.data.pendingReports.Count
    Write-Success "Found $count pending reports"
    
    foreach ($report in $pendingResult.data.pendingReports | Select-Object -First 3) {
        Write-Info "  - $($report.companyName) | $($report.year)-$($report.month) | $($report.status)"
    }
}

# 7. CEO Dashboard (for CEO)
if ($user.role -eq "CEO") {
    Write-Step "7. CEO Dashboard"
    
    $dashboardQuery = @"
query CEODashboard(`$year: Int!, `$month: Int!) {
    ceoDashboard(year: `$year, month: `$month) {
        groupKpis { totalActual totalBudget variancePercent groupHealthIndex }
        topPerformers { name achievementPercent }
        bottomPerformers { name achievementPercent }
    }
}
"@
    
    $dashResult = Invoke-GraphQL -Query $dashboardQuery -Token $token -Variables @{
        year = 2025
        month = 10
    }
    
    if ($dashResult.data.ceoDashboard) {
        $kpis = $dashResult.data.ceoDashboard.groupKpis
        Write-Success "Group KPIs loaded"
        Write-Info "  Total Actual: $($kpis.totalActual)"
        Write-Info "  Total Budget: $($kpis.totalBudget)"
        Write-Info "  Variance: $($kpis.variancePercent)%"
        Write-Info "  Health Index: $($kpis.groupHealthIndex)"
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "          Test Complete!                " -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Magenta
