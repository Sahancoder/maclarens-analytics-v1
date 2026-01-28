#!/usr/bin/env pwsh
# ============================================================
# McLarens Analytics - Docker Development Launcher
# ============================================================
# Usage: .\docker-dev.ps1 [command]
#
# Commands:
#   start     - Start all services (default)
#   stop      - Stop all services
#   restart   - Restart all services
#   logs      - View all logs
#   logs-api  - View backend logs only
#   logs-web  - View frontend logs only
#   reset     - Full reset (wipe database)
#   status    - Check container status
#   health    - Run health checks
#   shell-api - Open shell in backend container
#   shell-web - Open shell in frontend container
# ============================================================

param(
    [Parameter(Position=0)]
    [string]$Command = "start"
)

$ErrorActionPreference = "Stop"
$ComposeFile = "infra/docker/docker-compose.dev.yml"

function Write-Header($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-DockerRunning {
    try {
        docker info 2>$null | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check Docker is running
if (-not (Test-DockerRunning)) {
    Write-Host "Docker is not running! Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

switch ($Command.ToLower()) {
    "start" {
        Write-Header "Starting McLarens Analytics (Docker)"

        Write-Host "Building and starting containers..." -ForegroundColor Yellow
        docker compose -f $ComposeFile up -d --build

        Write-Host ""
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        Write-Host ""
        Write-Host "Services Started!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor White
        Write-Host "  Backend API:  http://localhost:8000" -ForegroundColor White
        Write-Host "  API Docs:     http://localhost:8000/docs" -ForegroundColor White
        Write-Host "  GraphQL:      http://localhost:8000/graphql" -ForegroundColor White
        Write-Host "  Mailpit UI:   http://localhost:8025" -ForegroundColor White
        Write-Host ""
        Write-Host "Run '.\docker-dev.ps1 logs' to view logs" -ForegroundColor Gray
        Write-Host "Run '.\docker-dev.ps1 health' to check service health" -ForegroundColor Gray
    }

    "stop" {
        Write-Header "Stopping McLarens Analytics"
        docker compose -f $ComposeFile down
        Write-Host "All services stopped." -ForegroundColor Green
    }

    "restart" {
        Write-Header "Restarting McLarens Analytics"
        docker compose -f $ComposeFile restart
        Write-Host "All services restarted." -ForegroundColor Green
    }

    "logs" {
        Write-Header "Viewing All Logs (Ctrl+C to exit)"
        docker compose -f $ComposeFile logs -f
    }

    "logs-api" {
        Write-Header "Viewing Backend Logs (Ctrl+C to exit)"
        docker compose -f $ComposeFile logs -f backend
    }

    "logs-web" {
        Write-Header "Viewing Frontend Logs (Ctrl+C to exit)"
        docker compose -f $ComposeFile logs -f frontend
    }

    "reset" {
        Write-Header "Full Reset (Database will be wiped!)"

        $confirm = Read-Host "This will DELETE all data. Continue? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "Cancelled." -ForegroundColor Yellow
            exit 0
        }

        Write-Host "Stopping and removing containers + volumes..." -ForegroundColor Yellow
        docker compose -f $ComposeFile down -v

        Write-Host "Rebuilding..." -ForegroundColor Yellow
        docker compose -f $ComposeFile up -d --build

        Write-Host ""
        Write-Host "Reset complete! Fresh database." -ForegroundColor Green
    }

    "status" {
        Write-Header "Container Status"
        docker compose -f $ComposeFile ps
    }

    "health" {
        Write-Header "Health Checks"

        Write-Host "Checking Backend..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
            Write-Host "  Backend: OK" -ForegroundColor Green
        } catch {
            Write-Host "  Backend: FAILED" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "Checking Database..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8000/health/db" -Method GET -TimeoutSec 5
            Write-Host "  Database: OK" -ForegroundColor Green
        } catch {
            Write-Host "  Database: FAILED or endpoint not available" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "Checking Frontend..." -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 10 -UseBasicParsing
            Write-Host "  Frontend: OK" -ForegroundColor Green
        } catch {
            Write-Host "  Frontend: FAILED (may still be building)" -ForegroundColor Yellow
        }

        Write-Host ""
        Write-Host "Checking Mailpit..." -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8025" -Method GET -TimeoutSec 5 -UseBasicParsing
            Write-Host "  Mailpit: OK" -ForegroundColor Green
        } catch {
            Write-Host "  Mailpit: FAILED" -ForegroundColor Red
        }

        Write-Host ""
        docker compose -f $ComposeFile ps
    }

    "shell-api" {
        Write-Header "Opening Backend Shell"
        docker compose -f $ComposeFile exec backend /bin/bash
    }

    "shell-web" {
        Write-Header "Opening Frontend Shell"
        docker compose -f $ComposeFile exec frontend /bin/sh
    }

    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available commands:" -ForegroundColor Yellow
        Write-Host "  start     - Start all services (default)"
        Write-Host "  stop      - Stop all services"
        Write-Host "  restart   - Restart all services"
        Write-Host "  logs      - View all logs"
        Write-Host "  logs-api  - View backend logs only"
        Write-Host "  logs-web  - View frontend logs only"
        Write-Host "  reset     - Full reset (wipe database)"
        Write-Host "  status    - Check container status"
        Write-Host "  health    - Run health checks"
        Write-Host "  shell-api - Open shell in backend container"
        Write-Host "  shell-web - Open shell in frontend container"
    }
}
