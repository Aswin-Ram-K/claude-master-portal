# Claude Master Portal — PowerShell Launcher
# Run this script to start the portal containers and open the dashboard.

$ErrorActionPreference = "Stop"
$PortalDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "[Portal] Checking Docker..." -ForegroundColor Cyan

# Check Docker
try {
    docker info | Out-Null
} catch {
    Write-Host "[Portal] Docker is not running. Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue

    $timeout = 30
    for ($i = 0; $i -lt $timeout; $i++) {
        try {
            docker info | Out-Null
            Write-Host "[Portal] Docker is running." -ForegroundColor Green
            break
        } catch {
            if ($i -eq ($timeout - 1)) {
                Write-Host "[Portal] Docker failed to start. Please start it manually." -ForegroundColor Red
                exit 1
            }
            Start-Sleep -Seconds 1
        }
    }
}

# Check if already running
$running = docker compose -f "$PortalDir\docker-compose.yml" ps --status running 2>$null
if ($running -match "claude-portal") {
    Write-Host "[Portal] Portal is already running." -ForegroundColor Green
} else {
    # Create .env if missing
    if (-not (Test-Path "$PortalDir\.env")) {
        Write-Host "[Portal] Creating .env from template..." -ForegroundColor Yellow
        Copy-Item "$PortalDir\.env.example" "$PortalDir\.env"
    }

    Write-Host "[Portal] Starting containers..." -ForegroundColor Cyan
    docker compose -f "$PortalDir\docker-compose.yml" up -d --build

    Write-Host "[Portal] Waiting for portal to be ready..." -ForegroundColor Cyan
    for ($i = 0; $i -lt 60; $i++) {
        try {
            Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
            Write-Host "[Portal] Portal is ready!" -ForegroundColor Green
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
}

# Open browser
Start-Process "http://localhost"
Write-Host "[Portal] Claude Master Portal is running at http://localhost" -ForegroundColor Green
