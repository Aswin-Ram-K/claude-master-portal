#!/bin/bash
set -euo pipefail

# Claude Master Portal — Core Launcher
# Starts Docker containers and opens the portal in your browser.
# Works both from terminal and as a macOS .app bundle.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PORTAL_DIR/docker-compose.yml"
LOG_FILE="$PORTAL_DIR/launcher/portal.log"

# --- PATH setup for .app context (macOS .app bundles don't inherit shell PATH) ---
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$PATH"

# Redirect all output to log file when launched from .app (no terminal)
if [ ! -t 0 ] && [ ! -t 1 ]; then
  exec > "$LOG_FILE" 2>&1
fi

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

log "Starting portal.sh ($(date))"

# --- 1. Check Docker ---
if ! command -v docker &>/dev/null; then
  err "Docker is not installed."
  osascript -e 'display dialog "Docker not found. Please install Docker Desktop." buttons {"OK"} with icon caution with title "Claude Portal"' 2>/dev/null || true
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
      osascript -e 'display dialog "Docker failed to start after 30 seconds. Please start Docker Desktop manually." buttons {"OK"} with icon caution with title "Claude Portal"' 2>/dev/null || true
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
