#!/bin/bash
set -euo pipefail

# Claude Master Portal — Dev Mode Launcher
# Standalone launcher — no Docker needed.
# Works both from terminal and as a macOS .app bundle.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
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

# --- 1. Check Node.js ---
if ! command -v node &>/dev/null; then
  err "Node.js is not installed. PATH=$PATH"
  osascript -e 'display dialog "Node.js not found. Please install Node.js 18+." buttons {"OK"} with icon caution with title "Claude Portal"' 2>/dev/null || true
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js >= 18 required (found v$NODE_VERSION)."
  osascript -e 'display dialog "Node.js 18+ required. Please upgrade Node.js." buttons {"OK"} with icon caution with title "Claude Portal"' 2>/dev/null || true
  exit 1
fi

ok "Node.js v$(node -v | sed 's/v//') detected."

# --- 2. Set environment ---
cd "$PORTAL_APP"
export DATABASE_URL="file:./prisma/data/portal.db"
export CLAUDE_HOME="$HOME/.claude"

# --- 3. Ensure data directory exists ---
mkdir -p prisma/data
chmod 700 prisma/data

# --- 4. Sync database schema ---
log "Syncing database schema..."
if ! npx prisma db push --skip-generate 2>&1; then
  err "Database schema sync failed. Check logs for details."
  osascript -e 'display dialog "Database schema sync failed. Check portal-dev.log for details." buttons {"OK"} with icon stop with title "Claude Portal"' 2>/dev/null || true
  exit 1
fi

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
