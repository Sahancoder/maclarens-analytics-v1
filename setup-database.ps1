# ============================================================================
# MacLarens Analytics - Database Setup Script
# ============================================================================
# This script sets up the PostgreSQL database for local development
# ============================================================================

param(
    [string]$DbName = "maclarens_analytics",
    [string]$DbUser = "finance_user",
    [string]$DbPassword = "finance_pass",
    [string]$PostgresUser = "postgres"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MacLarens Analytics - Database Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Database: $DbName" -ForegroundColor Gray
Write-Host "  User: $DbUser" -ForegroundColor Gray
Write-Host "  Password: $DbPassword" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# 1. Check PostgreSQL
# ============================================================================
Write-Host "[1/5] Checking PostgreSQL..." -ForegroundColor Yellow

try {
    $pgVersion = & psql -U $PostgresUser -c "SELECT version();" -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL is running" -ForegroundColor Green
        Write-Host "  Version: $($pgVersion.Trim())" -ForegroundColor Gray
    }
    else {
        throw "PostgreSQL connection failed"
    }
}
catch {
    Write-Host "✗ PostgreSQL not found or not running" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is installed" -ForegroundColor Gray
    Write-Host "  2. PostgreSQL service is running" -ForegroundColor Gray
    Write-Host "  3. PostgreSQL bin is in PATH" -ForegroundColor Gray
    exit 1
}

# ============================================================================
# 2. Check if database exists
# ============================================================================
Write-Host ""
Write-Host "[2/5] Checking if database exists..." -ForegroundColor Yellow

$dbExists = & psql -U $PostgresUser -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>&1

if ($dbExists -eq "1") {
    Write-Host "⚠ Database '$DbName' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to drop and recreate it? (y/N)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "  Dropping database..." -ForegroundColor Yellow
        & psql -U $PostgresUser -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null
        Write-Host "✓ Database dropped" -ForegroundColor Green
    }
    else {
        Write-Host "  Skipping database creation" -ForegroundColor Gray
        $skipDbCreation = $true
    }
}

# ============================================================================
# 3. Create database user
# ============================================================================
Write-Host ""
Write-Host "[3/5] Creating database user..." -ForegroundColor Yellow

$userExists = & psql -U $PostgresUser -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DbUser'" 2>&1

if ($userExists -eq "1") {
    Write-Host "  User '$DbUser' already exists" -ForegroundColor Gray
    Write-Host "  Updating password..." -ForegroundColor Yellow
    & psql -U $PostgresUser -c "ALTER USER $DbUser WITH PASSWORD '$DbPassword';" 2>&1 | Out-Null
    Write-Host "✓ User password updated" -ForegroundColor Green
}
else {
    & psql -U $PostgresUser -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ User '$DbUser' created" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Failed to create user" -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# 4. Create database
# ============================================================================
Write-Host ""
Write-Host "[4/5] Creating database..." -ForegroundColor Yellow

if (-Not $skipDbCreation) {
    & psql -U $PostgresUser -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database '$DbName' created" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Failed to create database" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "  Skipped (database exists)" -ForegroundColor Gray
}

# ============================================================================
# 5. Grant permissions
# ============================================================================
Write-Host ""
Write-Host "[5/5] Granting permissions..." -ForegroundColor Yellow

$sql = @"
GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;
\c $DbName
GRANT ALL ON SCHEMA public TO $DbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DbUser;
"@

$sql | & psql -U $PostgresUser 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Permissions granted" -ForegroundColor Green
}
else {
    Write-Host "⚠ Some permissions may have failed (this is often OK)" -ForegroundColor Yellow
}

# ============================================================================
# 6. Test connection
# ============================================================================
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow

$testConnection = & psql -U $DbUser -d $DbName -c "SELECT current_database(), current_user;" -t 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Connection test successful" -ForegroundColor Green
    Write-Host "  $($testConnection.Trim())" -ForegroundColor Gray
}
else {
    Write-Host "✗ Connection test failed" -ForegroundColor Red
    Write-Host "  Error: $testConnection" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✓ Database setup complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database connection string:" -ForegroundColor White
Write-Host "  postgresql+asyncpg://${DbUser}:${DbPassword}@localhost:5432/${DbName}" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update apps/api/.env with the connection string above" -ForegroundColor Gray
Write-Host "  2. Run migrations: cd apps/api && alembic upgrade head" -ForegroundColor Gray
Write-Host "  3. (Optional) Seed data: python seed_standalone.py" -ForegroundColor Gray
Write-Host ""
