# ═══════════════════════════════════════════════════════════════════════
#  PRODUCTION DEPLOY (Windows PowerShell)
#  Single server: PostgreSQL + Redis + Backend + Frontend + Nginx
#
#  Usage:
#    .\scripts\deploy-prod.ps1                  # Full deploy
#    .\scripts\deploy-prod.ps1 -Action backend  # Backend only
#    .\scripts\deploy-prod.ps1 -Action frontend # Frontend only
#    .\scripts\deploy-prod.ps1 -Action desktop  # Build desktop installers
#    .\scripts\deploy-prod.ps1 -Action status   # Check service status
#    .\scripts\deploy-prod.ps1 -Action logs     # View logs
#    .\scripts\deploy-prod.ps1 -Action stop     # Stop all
# ═══════════════════════════════════════════════════════════════════════

param(
    [ValidateSet("full", "backend", "frontend", "desktop", "status", "logs", "stop", "restart")]
    [string]$Action = "full"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $ProjectRoot

# ─── Colors ───────────────────────────────────────────────────────────
function Log($msg)  { Write-Host "[deploy] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "[  ok  ] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ warn ] $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "[error ] $msg" -ForegroundColor Red; exit 1 }

# ─── Load env ─────────────────────────────────────────────────────────
function Load-ProdEnv {
    if (-not (Test-Path ".env.production")) {
        Err ".env.production not found. Copy .env.production.template and fill in values."
    }
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
        }
    }
    $script:Domain = $env:DOMAIN
    if (-not $script:Domain) { $script:Domain = "app.atluriin.com" }
    Log "Domain: $script:Domain"
}

# ─── Setup backend .env ──────────────────────────────────────────────
function Setup-BackendEnv {
    Log "Writing backend/.env..."
    @"
OPENAI_API_KEY=$($env:OPENAI_API_KEY)
MODEL_NAME=$($env:MODEL_NAME ?? 'gpt-4.1-mini')
ANTHROPIC_API_KEY=$($env:ANTHROPIC_API_KEY)
GEMINI_API_KEY=$($env:GEMINI_API_KEY)
DEEPGRAM_API_KEY=$($env:DEEPGRAM_API_KEY)
SUPABASE_URL=$($env:SUPABASE_URL)
SUPABASE_ANON_KEY=$($env:SUPABASE_ANON_KEY)
SUPABASE_SERVICE_KEY=$($env:SUPABASE_SERVICE_KEY)
SUPABASE_JWT_SECRET=$($env:SUPABASE_JWT_SECRET)
ALLOW_UNVERIFIED_JWT_DEV=$($env:ALLOW_UNVERIFIED_JWT_DEV ?? 'false')
QA_MODE=false
"@ | Set-Content "backend/.env" -Encoding UTF8
    Ok "Backend .env configured"
}

# ─── Setup frontend .env ─────────────────────────────────────────────
function Setup-FrontendEnv {
    Log "Writing frontend/.env.local..."
    "NEXT_PUBLIC_API_URL=https://$script:Domain" | Set-Content "frontend/.env.local" -Encoding UTF8
    Ok "Frontend .env.local -> https://$script:Domain"
}

# ─── Update Nginx domain ─────────────────────────────────────────────
function Update-NginxDomain {
    Log "Updating Nginx config with domain: $script:Domain"
    $conf = Get-Content "nginx/nginx.prod.conf" -Raw
    $conf = $conf -replace 'YOUR_DOMAIN', $script:Domain
    $conf | Set-Content "nginx/nginx.prod.conf" -Encoding UTF8
    Ok "Nginx config updated"
}

# ─── Build desktop ────────────────────────────────────────────────────
function Build-Desktop {
    Log "Building desktop installers..."
    Push-Location desktop
    try {
        npm ci
        Log "Building Windows installer..."
        npm run dist:win

        Pop-Location

        # Copy to releases dir
        New-Item -ItemType Directory -Path "desktop-releases" -Force | Out-Null
        Copy-Item "desktop/release/*.exe" "desktop-releases/" -ErrorAction SilentlyContinue
        Copy-Item "desktop/release/*.zip" "desktop-releases/" -ErrorAction SilentlyContinue

        # Version manifest
        $version = (Get-Content "desktop/package.json" | ConvertFrom-Json).version
        @{
            version    = $version
            date       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            files      = @{
                windows = "System Service Host-$version-Setup.exe"
            }
            backendUrl = "https://$script:Domain"
        } | ConvertTo-Json | Set-Content "desktop-releases/latest.json" -Encoding UTF8

        Ok "Desktop builds in desktop-releases/"
        Get-ChildItem "desktop-releases/" | Format-Table Name, Length -AutoSize
    } catch {
        Pop-Location
        Warn "Desktop build failed: $_"
    }
}

# ─── Full deploy ──────────────────────────────────────────────────────
function Deploy-Full {
    Load-ProdEnv
    Setup-BackendEnv
    Setup-FrontendEnv
    Update-NginxDomain

    Log "Building and starting all services..."
    docker compose -f docker-compose.prod.yml build --no-cache
    docker compose -f docker-compose.prod.yml up -d

    # Wait for backend health
    Log "Waiting for backend to start..."
    $healthy = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $result = docker compose -f docker-compose.prod.yml exec backend python -c "import httpx; r=httpx.get('http://127.0.0.1:9010/healthz'); print(r.status_code)" 2>&1
            if ($result -match "200") {
                $healthy = $true
                break
            }
        } catch {}
        Start-Sleep -Seconds 2
    }

    if (-not $healthy) {
        Err "Backend failed to start. Run: docker compose -f docker-compose.prod.yml logs backend"
    }
    Ok "Backend healthy"

    # Run migrations
    Log "Running database migrations..."
    docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.database import engine, Base
import asyncio
async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created')
asyncio.run(init())
" 2>&1

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Frontend:    https://$script:Domain"
    Write-Host "  Backend API: https://$script:Domain/api/"
    Write-Host "  WebSocket:   wss://$script:Domain/ws/voice"
    Write-Host "  Downloads:   https://$script:Domain/download/"
    Write-Host "  Health:      https://$script:Domain/healthz"
    Write-Host ""
    Write-Host "  Desktop app config: enter https://$script:Domain" -ForegroundColor Cyan
    Write-Host ""
}

# ─── Partial actions ──────────────────────────────────────────────────
switch ($Action) {
    "full"     { Deploy-Full }
    "backend"  {
        Load-ProdEnv; Setup-BackendEnv
        Log "Rebuilding backend..."
        docker compose -f docker-compose.prod.yml build backend --no-cache
        docker compose -f docker-compose.prod.yml up -d backend
        Ok "Backend redeployed"
    }
    "frontend" {
        Load-ProdEnv; Setup-FrontendEnv
        Log "Rebuilding frontend..."
        docker compose -f docker-compose.prod.yml build frontend --no-cache
        docker compose -f docker-compose.prod.yml up -d frontend
        docker compose -f docker-compose.prod.yml restart nginx
        Ok "Frontend redeployed"
    }
    "desktop"  { Load-ProdEnv; Build-Desktop }
    "status"   {
        docker compose -f docker-compose.prod.yml ps
        Write-Host ""
        try {
            docker compose -f docker-compose.prod.yml exec backend python -c "import httpx; r=httpx.get('http://127.0.0.1:9010/healthz'); print(f'Backend: {r.json()}')"
        } catch {
            Write-Host "Backend: UNREACHABLE" -ForegroundColor Red
        }
    }
    "logs"     { docker compose -f docker-compose.prod.yml logs -f }
    "stop"     { docker compose -f docker-compose.prod.yml down }
    "restart"  { docker compose -f docker-compose.prod.yml restart }
}
