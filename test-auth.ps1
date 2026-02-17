#!/usr/bin/env pwsh
# Diagnostic script to test McLarens Analytics authentication setup

Write-Host "`n=== McLarens Analytics Authentication Diagnostics ===" -ForegroundColor Cyan
Write-Host "This script tests each component of the authentication system`n" -ForegroundColor Gray

# 1. Check Backend is running
Write-Host "[1/5] Testing Backend API..." -ForegroundColor Yellow
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "  ✓ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Backend is NOT running on http://localhost:8000" -ForegroundColor Red
    Write-Host "    Run: cd apps\api && .\venv\Scripts\activate && uvicorn src.main:app --reload" -ForegroundColor Gray
    exit 1
}

# 2. Check Frontend is running
Write-Host "`n[2/5] Testing Frontend..." -ForegroundColor Yellow
try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3000" -Method HEAD -TimeoutSec 5
    Write-Host "  ✓ Frontend is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Frontend is NOT running on http://localhost:3000" -ForegroundColor Red
    Write-Host "    Run: cd apps\frontend && npm run dev" -ForegroundColor Gray
    exit 1
}

# 3. Test Database RBAC for your email
Write-Host "`n[3/5] Testing Database RBAC for sahanviranga18@gmail.com..." -ForegroundColor Yellow
$testEmail = "sahanviranga18@gmail.com"
$portals = @("finance-officer", "finance-director", "system-admin", "md")

foreach ($portal in $portals) {
    try {
        $body = @{
            email = $testEmail
            portal = $portal
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "http://localhost:8000/auth/check-access" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 5

        if ($response.has_access) {
            Write-Host "  ✓ $portal : ALLOWED (Role: $($response.role))" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $portal : DENIED" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ $portal : ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Check Azure AD Configuration
Write-Host "`n[4/5] Checking Azure AD Configuration..." -ForegroundColor Yellow
$envFile = "apps\frontend\.env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Check if variables are set
    $hasClientId = $envContent -match "AZURE_AD_CLIENT_ID=(.+)"
    $hasClientSecret = $envContent -match "AZURE_AD_CLIENT_SECRET=(.+)"
    $hasTenantId = $envContent -match "AZURE_AD_TENANT_ID=(.+)"
    $hasAuthMode = $envContent -match "NEXT_PUBLIC_AUTH_MODE=(.+)"
    
    if ($hasClientId) { 
        $clientIdValue = $Matches[1].Trim()
        if ($clientIdValue.Length -eq 36) {
            Write-Host "  ✓ AZURE_AD_CLIENT_ID is set (UUID format)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ AZURE_AD_CLIENT_ID format looks unusual" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ AZURE_AD_CLIENT_ID is NOT set" -ForegroundColor Red
    }
    
    if ($hasClientSecret) {
        $secretValue = $Matches[1].Trim()
        if ($secretValue.Length -gt 40) {
            Write-Host "  ✓ AZURE_AD_CLIENT_SECRET is set (length: $($secretValue.Length))" -ForegroundColor Green
        } elseif ($secretValue.Length -eq 36) {
            Write-Host "  ✗ AZURE_AD_CLIENT_SECRET looks like a UUID (Secret ID), not a secret VALUE" -ForegroundColor Red
            Write-Host "    You need the secret VALUE from Azure Portal (starts with letters/numbers followed by ~)" -ForegroundColor Yellow
        } else {
            Write-Host "  ⚠ AZURE_AD_CLIENT_SECRET is set but length seems short ($($secretValue.Length))" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ AZURE_AD_CLIENT_SECRET is NOT set" -ForegroundColor Red
    }
    
    if ($hasTenantId) {
        Write-Host "  ✓ AZURE_AD_TENANT_ID is set" -ForegroundColor Green
    } else {
        Write-Host "  ✗ AZURE_AD_TENANT_ID is NOT set" -ForegroundColor Red
    }
    
    if ($hasAuthMode) {
        $authModeValue = $Matches[1].Trim()
        Write-Host "  ✓ NEXT_PUBLIC_AUTH_MODE = $authModeValue" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ NEXT_PUBLIC_AUTH_MODE not set (will default to 'dev')" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ .env.local file not found at $envFile" -ForegroundColor Red
}

# 5. Check Azure AD redirect URI configuration
Write-Host "`n[5/5] Azure AD Redirect URI Check..." -ForegroundColor Yellow
Write-Host "  Required redirect URI in Azure Portal:" -ForegroundColor Gray
Write-Host "    http://localhost:3000/api/auth/callback/azure-ad" -ForegroundColor Cyan
Write-Host "`n  To verify:" -ForegroundColor Gray
Write-Host "    1. Go to https://portal.azure.com" -ForegroundColor Gray
Write-Host "    2. App registrations → Your app → Authentication" -ForegroundColor Gray
Write-Host "    3. Check 'Redirect URIs' section" -ForegroundColor Gray

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If all checks above are green, the issue is likely:" -ForegroundColor Yellow
Write-Host "  1. Wrong Azure AD client secret (using Secret ID instead of Value)" -ForegroundColor Yellow
Write-Host "  2. Missing redirect URI in Azure Portal" -ForegroundColor Yellow
Write-Host "  3. Your Gmail account not allowed in the Azure AD app" -ForegroundColor Yellow
Write-Host "`nCheck the Next.js terminal for [NextAuth] debug logs for specific errors.`n" -ForegroundColor Gray
