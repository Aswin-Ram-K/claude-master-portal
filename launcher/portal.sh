#!/bin/bash
set -euo pipefail

# Claude Master Portal — Core Launcher
# Starts Docker containers and opens the portal in your browser.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PORTAL_DIR/docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[Portal]${NC} $1"; }
ok()   { echo -e "${GREEN}[Portal]${NC} $1"; }
warn() { echo -e "${YELLOW}[Portal]${NC} $1"; }
err()  { echo -e "${RED}[Portal]${NC} $1" >&2; }

# --- 1. Check Docker ---
if ! command -v docker &>/dev/null; then
  err "Docker is not installed. Please install Docker Desktop first."
  err "  macOS/Windows: https://www.docker.com/products/docker-desktop"
  err "  Linux: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  warn "Docker daemon is not running. Attempting to start..."

  case "$(uname -s)" in
    Darwin)
      open -a Docker
      ;;
    Linux)
      sudo systemctl start docker 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      powershell.exe -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'" 2>/dev/null || true
      ;;
  esac

  log "Waiting for Docker to start..."
  for i in $(seq 1 30); do
    if docker info &>/dev/null 2>&1; then
      ok "Docker is running."
      break
    fi
    if [ "$i" -eq 30 ]; then
      err "Docker failed to start after 30 seconds. Please start Docker manually."
      exit 1
    fi
    sleep 1
  done
fi

# --- 2. Check if containers are already running ---
if docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q "claude-portal"; then
  ok "Portal is already running."
else
  # --- 3. Create .env if missing ---
  if [ ! -f "$PORTAL_DIR/.env" ]; then
    warn "No .env file found. Copying from .env.example..."
    cp "$PORTAL_DIR/.env.example" "$PORTAL_DIR/.env"
    warn "Please edit $PORTAL_DIR/.env with your credentials."
  fi

  # --- 4. Start containers ---
  log "Starting Claude Master Portal containers..."
  docker compose -f "$COMPOSE_FILE" up -d --build

  # --- 5. Wait for health ---
  log "Waiting for portal to be ready..."
  for i in $(seq 1 60); do
    if curl -sf http://localhost/api/health &>/dev/null 2>&1; then
      ok "Portal is ready!"
      break
    fi
    if [ "$i" -eq 60 ]; then
      warn "Portal health check timed out. It may still be starting up."
      warn "Check logs with: docker compose -f $COMPOSE_FILE logs -f"
    fi
    sleep 1
  done
fi

# --- 6. Open browser ---
PORTAL_URL="http://localhost"
log "Opening $PORTAL_URL ..."

case "$(uname -s)" in
  Darwin)   open "$PORTAL_URL" ;;
  Linux)    xdg-open "$PORTAL_URL" 2>/dev/null || sensible-browser "$PORTAL_URL" 2>/dev/null || true ;;
  MINGW*|MSYS*|CYGWIN*) start "$PORTAL_URL" 2>/dev/null || true ;;
esac

ok "Claude Master Portal is running at $PORTAL_URL"
