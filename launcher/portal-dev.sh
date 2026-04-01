#!/bin/bash
set -euo pipefail

# Claude Master Portal — Dev Mode Launcher
# Starts postgres/redis via Docker, then runs Next.js dev server on host.
# Works both from terminal and as a macOS .app bundle.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PORTAL_DIR/docker-compose.dev.yml"
PORTAL_APP="$PORTAL_DIR/portal"
LOG_FILE="$PORTAL_DIR/launcher/portal-dev.log"

# --- PATH setup for .app context (macOS .app bundles don't inherit shell PATH) ---
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH"

# Source nvm if available (for node/npm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null

# Redirect all output to log file when launched from .app (no terminal)
if [ ! -t 0 ] && [ ! -t 1 ]; then
  exec > "$LOG_FILE" 2>&1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[Portal]${NC} $1"; }
ok()   { echo -e "${GREEN}[Portal]${NC} $1"; }
warn() { echo -e "${YELLOW}[Portal]${NC} $1"; }
err()  { echo -e "${RED}[Portal]${NC} $1" >&2; }

log "Starting portal-dev.sh ($(date))"
log "PATH: $PATH"

# --- 1. Check Docker ---
if ! command -v docker &>/dev/null; then
  err "Docker is not installed. PATH=$PATH"
  # Show error dialog if launched from .app
  osascript -e 'display dialog "Docker not found. Please install Docker Desktop." buttons {"OK"} with icon caution with title "Claude Portal"' 2>/dev/null || true
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  warn "Docker daemon is not running. Starting Docker Desktop..."
  open /Applications/Docker.app
  for i in $(seq 1 30); do
    if docker info &>/dev/null 2>&1; then
      ok "Docker is running."
      break
    fi
    [ "$i" -eq 30 ] && { err "Docker failed to start."; exit 1; }
    sleep 1
  done
fi

# --- 2. Start postgres + redis ---
if docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q "claude-portal"; then
  ok "Database containers already running."
else
  log "Starting postgres + redis..."
  docker compose -f "$COMPOSE_FILE" up postgres redis -d
  # Wait for postgres to be healthy
  for i in $(seq 1 30); do
    if docker compose -f "$COMPOSE_FILE" ps --status healthy 2>/dev/null | grep -q "claude-portal-db"; then
      ok "Database is healthy."
      break
    fi
    sleep 1
  done
fi

# --- 3. Create .env if missing ---
if [ ! -f "$PORTAL_DIR/.env" ]; then
  cp "$PORTAL_DIR/.env.example" "$PORTAL_DIR/.env"
  warn "Created .env from template. Edit $PORTAL_DIR/.env with your credentials."
fi

# --- 4. Run Prisma migrations if needed ---
cd "$PORTAL_APP"
export DATABASE_URL="postgresql://portal:portal@localhost:5433/claude_portal"
export REDIS_URL="redis://localhost:6380"
export CLAUDE_HOME="$HOME/.claude"

log "Syncing database schema..."
npx prisma db push --skip-generate 2>/dev/null || true

# --- 5. Check if dev server is already running ---
if curl -sf http://localhost:3000/api/health &>/dev/null 2>&1; then
  ok "Dev server already running."
else
  log "Starting Next.js dev server..."
  npm run dev &
  DEV_PID=$!

  # Wait for server to be ready
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/api/health &>/dev/null 2>&1; then
      ok "Portal is ready!"
      break
    fi
    [ "$i" -eq 30 ] && warn "Dev server still starting. Check http://localhost:3000"
    sleep 1
  done
fi

# --- 6. Open browser ---
log "Opening http://localhost:3000 ..."
open "http://localhost:3000"

ok "Claude Master Portal running at http://localhost:3000"
ok "Press Ctrl+C to stop the dev server."

# Keep script alive so the .app doesn't close immediately
wait 2>/dev/null || true
