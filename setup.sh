#!/bin/bash
set -euo pipefail

# Claude Master Portal — Standalone Setup
# Run this once to set up everything: dependencies, database, desktop shortcut, and hooks.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$SCRIPT_DIR"
PORTAL_APP="$PORTAL_DIR/portal"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[Setup]${NC} $1"; }
ok()   { echo -e "${GREEN}[Setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[Setup]${NC} $1"; }
err()  { echo -e "${RED}[Setup]${NC} $1" >&2; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Claude Master Portal — Setup       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# --- 1. Check Node.js >= 18 ---
log "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  err "Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js >= 18 required (found v$NODE_VERSION). Please upgrade."
  exit 1
fi

ok "Node.js v$(node -v | sed 's/v//') detected."

# --- 2. Install dependencies ---
log "Installing dependencies..."
cd "$PORTAL_APP"
npm install

# --- 3. Generate Prisma client ---
log "Generating Prisma client..."
npx prisma generate

# --- 4. Create data directory and push schema ---
log "Setting up SQLite database..."
mkdir -p prisma/data
chmod 700 prisma/data
export DATABASE_URL="file:./prisma/data/portal.db"
npx prisma db push

ok "Database ready at prisma/data/portal.db"

# --- 5. Install Desktop Shortcut ---
SHORTCUT_INSTALLED=false
log "Installing desktop shortcut..."
if chmod +x "$PORTAL_DIR/launcher/install.sh" && "$PORTAL_DIR/launcher/install.sh"; then
  SHORTCUT_INSTALLED=true
else
  warn "Desktop shortcut installation failed (non-fatal)."
fi

# --- 6. Register Hooks ---
HOOK_REGISTERED=false
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
HOOK_PATH="$PORTAL_DIR/hooks/session-start-portal.sh"
chmod +x "$HOOK_PATH"

if [ -f "$CLAUDE_SETTINGS" ]; then
  if command -v jq &>/dev/null; then
    # Check if hook is already registered
    if ! grep -q "session-start-portal.sh" "$CLAUDE_SETTINGS" 2>/dev/null; then
      log "Registering SessionStart hook in Claude settings..."

      # Merge the new hook into existing settings
      TMPFILE=$(mktemp) \
        && jq --arg hook "$HOOK_PATH" '
        .hooks.SessionStart = ((.hooks.SessionStart // []) + [{
          "matcher": "",
          "hooks": [{
            "type": "command",
            "command": $hook
          }]
        }])
      ' "$CLAUDE_SETTINGS" > "$TMPFILE" \
        && mv "$TMPFILE" "$CLAUDE_SETTINGS"

      ok "SessionStart hook registered."
      HOOK_REGISTERED=true
    else
      ok "SessionStart hook already registered."
      HOOK_REGISTERED=true
    fi
  else
    warn "jq not installed — please add the SessionStart hook manually."
    warn "See: $PORTAL_DIR/docs/setup.md for instructions."
  fi
else
  warn "Claude settings not found at $CLAUDE_SETTINGS"
  warn "The auto-start hook will need to be registered manually."
fi

# --- Done ---
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
ok "Database: portal/prisma/data/portal.db (SQLite)"
if $SHORTCUT_INSTALLED; then
  ok "Desktop shortcut installed"
else
  warn "Desktop shortcut NOT installed (run launcher/install.sh manually)"
fi
if $HOOK_REGISTERED; then
  ok "Auto-start hook registered"
else
  warn "Auto-start hook NOT registered (install jq or add manually)"
fi
echo ""
echo "Next steps:"
echo "  1. Run: ./launcher/portal-dev.sh   (dev mode)"
echo "  2. Open http://localhost:3000 to access the dashboard"
echo "  3. Every new Claude Code session will auto-start the portal"
echo ""
