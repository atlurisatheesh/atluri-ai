#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  PRODUCTION DEPLOY SCRIPT — Single Server
#  Deploys: PostgreSQL + Redis + Backend + Frontend + Nginx + Desktop downloads
#
#  Usage:
#    chmod +x scripts/deploy-prod.sh
#    ./scripts/deploy-prod.sh              # Full deploy
#    ./scripts/deploy-prod.sh --backend    # Backend only rebuild
#    ./scripts/deploy-prod.sh --frontend   # Frontend only rebuild
#    ./scripts/deploy-prod.sh --desktop    # Build + upload desktop installers
#    ./scripts/deploy-prod.sh --ssl        # Setup SSL certs with Let's Encrypt
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[  ok  ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ warn ]${NC} $1"; }
err()  { echo -e "${RED}[error ]${NC} $1"; exit 1; }

# ─── Check prerequisites ─────────────────────────────────────────────
check_prereqs() {
    log "Checking prerequisites..."
    command -v docker >/dev/null 2>&1 || err "Docker not installed"
    command -v docker compose >/dev/null 2>&1 || err "Docker Compose not installed"
    
    if [ ! -f ".env.production" ]; then
        err ".env.production not found. Copy .env.production.template and fill in values:\n  cp .env.production.template .env.production"
    fi
    
    ok "Prerequisites OK"
}

# ─── Load env ─────────────────────────────────────────────────────────
load_env() {
    set -a
    source .env.production
    set +a
    DOMAIN="${DOMAIN:-app.atluriin.com}"
    log "Domain: $DOMAIN"
}

# ─── SSL Setup (Let's Encrypt via certbot) ────────────────────────────
setup_ssl() {
    log "Setting up SSL certificates for $DOMAIN..."
    
    # Ensure certbot is available
    if ! command -v certbot >/dev/null 2>&1; then
        log "Installing certbot..."
        apt-get update && apt-get install -y certbot
    fi
    
    # Get certificate
    certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
        warn "certbot standalone failed. Trying webroot method..."
        mkdir -p /var/www/certbot
        certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
    }
    
    # Copy certs to nginx/ssl/
    mkdir -p nginx/ssl
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/ssl/fullchain.pem
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" nginx/ssl/privkey.pem
    chmod 600 nginx/ssl/privkey.pem
    
    ok "SSL certificates installed"
    
    # Setup auto-renewal cron
    if ! crontab -l 2>/dev/null | grep -q certbot; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_ROOT/nginx/ssl/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_ROOT/nginx/ssl/ && docker compose -f docker-compose.prod.yml restart nginx") | crontab -
        ok "SSL auto-renewal cron added (daily 3 AM)"
    fi
}

# ─── Update Nginx config with actual domain ────────────────────────────
update_nginx_domain() {
    log "Updating Nginx config with domain: $DOMAIN"
    sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx.prod.conf
    ok "Nginx config updated"
}

# ─── Copy backend .env ────────────────────────────────────────────────
setup_backend_env() {
    log "Setting up backend .env..."
    
    # Create backend/.env from production template (only secrets that backend reads)
    cat > backend/.env <<EOF
OPENAI_API_KEY=${OPENAI_API_KEY:-}
MODEL_NAME=${MODEL_NAME:-gpt-4.1-mini}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY:-}
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET:-}
ALLOW_UNVERIFIED_JWT_DEV=${ALLOW_UNVERIFIED_JWT_DEV:-false}
QA_MODE=false
EOF
    ok "Backend .env configured"
}

# ─── Setup frontend env ──────────────────────────────────────────────
setup_frontend_env() {
    log "Setting up frontend .env..."
    cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN
EOF
    ok "Frontend .env.local → https://$DOMAIN"
}

# ─── Build desktop installers ─────────────────────────────────────────
build_desktop() {
    log "Building desktop installers..."
    cd desktop
    
    npm ci
    
    # Build for Windows
    log "Building Windows installer..."
    npm run dist:win 2>&1 || warn "Windows build failed (may need Wine on Linux)"
    
    # Build for macOS (if on macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log "Building macOS installer..."
        npm run dist:mac 2>&1 || warn "macOS build failed"
    fi
    
    # Build for Linux
    log "Building Linux AppImage..."
    npm run dist:linux 2>&1 || warn "Linux build failed"
    
    cd "$PROJECT_ROOT"
    
    # Copy builds to download directory
    mkdir -p desktop-releases
    cp desktop/release/*.exe desktop-releases/ 2>/dev/null || true
    cp desktop/release/*.dmg desktop-releases/ 2>/dev/null || true
    cp desktop/release/*.AppImage desktop-releases/ 2>/dev/null || true
    cp desktop/release/*.zip desktop-releases/ 2>/dev/null || true
    
    # Create a version manifest
    VERSION=$(node -p "require('./desktop/package.json').version")
    cat > desktop-releases/latest.json <<EOF
{
  "version": "$VERSION",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": {
    "windows": "System Service Host-$VERSION-Setup.exe",
    "mac": "System Service Host-$VERSION.dmg",
    "linux": "System Service Host-$VERSION.AppImage"
  },
  "backendUrl": "https://$DOMAIN"
}
EOF
    
    ok "Desktop builds copied to desktop-releases/"
    ls -la desktop-releases/
}

# ─── Database migration ──────────────────────────────────────────────
run_migrations() {
    log "Running database migrations..."
    docker compose -f docker-compose.prod.yml exec backend python -m alembic upgrade head 2>&1 || {
        warn "Alembic migration failed — DB may need initial setup"
        docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.database import engine, Base
import asyncio
async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created')
asyncio.run(init())
" 2>&1 || warn "Table creation also failed — check DB connection"
    }
    ok "Database ready"
}

# ─── Full deploy ──────────────────────────────────────────────────────
full_deploy() {
    check_prereqs
    load_env
    setup_backend_env
    setup_frontend_env
    update_nginx_domain
    
    log "Building and starting all services..."
    docker compose -f docker-compose.prod.yml build --no-cache
    docker compose -f docker-compose.prod.yml up -d
    
    # Wait for backend to be healthy
    log "Waiting for backend health..."
    for i in $(seq 1 30); do
        if docker compose -f docker-compose.prod.yml exec backend python -c "import httpx; r=httpx.get('http://127.0.0.1:9010/healthz'); assert r.status_code==200" 2>/dev/null; then
            ok "Backend healthy"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            err "Backend failed to start. Check: docker compose -f docker-compose.prod.yml logs backend"
        fi
    done
    
    run_migrations
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  DEPLOYMENT COMPLETE${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Frontend:     https://$DOMAIN"
    echo -e "  Backend API:  https://$DOMAIN/api/"
    echo -e "  WebSocket:    wss://$DOMAIN/ws/voice"
    echo -e "  Downloads:    https://$DOMAIN/download/"
    echo -e "  Health:       https://$DOMAIN/healthz"
    echo ""
    echo -e "  Desktop app connects to: ${CYAN}https://$DOMAIN${NC}"
    echo -e "  Users download from:     ${CYAN}https://$DOMAIN/download/${NC}"
    echo ""
}

# ─── Partial rebuilds ────────────────────────────────────────────────
rebuild_backend() {
    load_env
    setup_backend_env
    log "Rebuilding backend only..."
    docker compose -f docker-compose.prod.yml build backend --no-cache
    docker compose -f docker-compose.prod.yml up -d backend
    ok "Backend redeployed"
}

rebuild_frontend() {
    load_env
    setup_frontend_env
    log "Rebuilding frontend only..."
    docker compose -f docker-compose.prod.yml build frontend --no-cache
    docker compose -f docker-compose.prod.yml up -d frontend
    docker compose -f docker-compose.prod.yml restart nginx
    ok "Frontend redeployed"
}

# ─── Argument handling ────────────────────────────────────────────────
case "${1:-}" in
    --ssl)       load_env; setup_ssl ;;
    --backend)   rebuild_backend ;;
    --frontend)  rebuild_frontend ;;
    --desktop)   load_env; build_desktop ;;
    --migrate)   load_env; run_migrations ;;
    --status)
        docker compose -f docker-compose.prod.yml ps
        echo ""
        docker compose -f docker-compose.prod.yml exec backend python -c "
import httpx
r = httpx.get('http://127.0.0.1:9010/healthz')
print(f'Backend: {r.json()}')
" 2>/dev/null || echo "Backend: UNREACHABLE"
        ;;
    --logs)      docker compose -f docker-compose.prod.yml logs -f "${2:-}" ;;
    --stop)      docker compose -f docker-compose.prod.yml down ;;
    --restart)   docker compose -f docker-compose.prod.yml restart ;;
    *)           full_deploy ;;
esac
