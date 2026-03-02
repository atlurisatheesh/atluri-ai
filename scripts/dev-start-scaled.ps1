# ═══════════════════════════════════════════════════════════════════════
#  Start backend with multi-worker + optional Redis
#
#  Usage:
#    .\scripts\dev-start-scaled.ps1              # 4 workers, no Redis
#    .\scripts\dev-start-scaled.ps1 -WithRedis   # 4 workers + Redis
#    .\scripts\dev-start-scaled.ps1 -Workers 2   # 2 workers
# ═══════════════════════════════════════════════════════════════════════

param(
    [int]$Workers = 4,
    [switch]$WithRedis,
    [int]$Port = 9010
)

$ErrorActionPreference = "Stop"
$backendDir = Join-Path $PSScriptRoot "..\backend"

Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SCALED BACKEND STARTUP" -ForegroundColor Cyan
Write-Host "  Workers: $Workers  Port: $Port  Redis: $WithRedis" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

# Set environment
$env:ALLOW_UNVERIFIED_JWT_DEV = "true"
$env:HOST = "0.0.0.0"
$env:PORT = $Port
$env:WORKERS = $Workers
$env:WS_MAX_CONCURRENT = "100"
$env:WS_QUEUE_SIZE = "200"
$env:WS_QUEUE_MAX_WAIT = "10"

if ($WithRedis) {
    # Check if Redis is running
    try {
        $redisCheck = & redis-cli ping 2>$null
        if ($redisCheck -ne "PONG") {
            Write-Host "  Starting Redis..." -ForegroundColor Yellow
            Start-Process redis-server -WindowStyle Hidden
            Start-Sleep -Seconds 2
        }
        Write-Host "  Redis: CONNECTED" -ForegroundColor Green
    } catch {
        Write-Host "  Redis not found. Install Redis or use Docker:" -ForegroundColor Red
        Write-Host "    docker run -d -p 6379:6379 redis:7-alpine" -ForegroundColor Yellow
        exit 1
    }

    $env:REDIS_URL = "redis://127.0.0.1:6379/0"
    $env:USE_REDIS_ROOM_STATE = "true"
    $env:ROOM_EVENT_BUS_ENABLED = "true"
} else {
    # Remove Redis env vars to use local fallback
    Remove-Item Env:\REDIS_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\USE_REDIS_ROOM_STATE -ErrorAction SilentlyContinue
    Remove-Item Env:\ROOM_EVENT_BUS_ENABLED -ErrorAction SilentlyContinue
}

Push-Location $backendDir
try {
    Write-Host "  Starting uvicorn with $Workers workers on port $Port..." -ForegroundColor Green
    python uvicorn_config.py
} finally {
    Pop-Location
}
