#!/bin/bash
set -euo pipefail

# Claude Master Portal — Full Auto-Setup Script
# Run this once to set up everything: containers, desktop shortcut, and hooks.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# --- 1. Prerequisites ---
log "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  err "Docker is not installed. Please install Docker first."
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  err "Docker daemon is not running. Please start Docker."
  exit 1
fi

ok "Docker is available and running."

# --- 2. Environment ---
if [ ! -f "$PORTAL_DIR/.env" ]; then
  log "Creating .env from template..."
  cp "$PORTAL_DIR/.env.example" "$PORTAL_DIR/.env"
  warn "Created .env — please edit it with your GitHub token:"
  warn "  $PORTAL_DIR/.env"
else
  ok ".env file exists."
fi

# --- 3. Start Containers ---
log "Building and starting containers..."
docker compose -f "$PORTAL_DIR/docker-compose.yml" up -d --build

log "Waiting for portal to be ready..."
for i in $(seq 1 60); do
  if curl -sf http://localhost/api/health &>/dev/null 2>&1; then
    ok "Portal is running at http://localhost"
    break
  fi
  if [ "$i" -eq 60 ]; then
    warn "Health check timed out — check: docker compose logs -f"
  fi
  sleep 1
done

# --- 4. Install Desktop Shortcut ---
log "Installing desktop shortcut..."
chmod +x "$PORTAL_DIR/launcher/install.sh"
"$PORTAL_DIR/launcher/install.sh"

# --- 5. Register Hooks ---
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
HOOK_PATH="$PORTAL_DIR/hooks/session-start-portal.sh"
chmod +x "$HOOK_PATH"

if [ -f "$CLAUDE_SETTINGS" ]; then
  if command -v jq &>/dev/null; then
    # Check if hook is already registered
    if ! grep -q "session-start-portal.sh" "$CLAUDE_SETTINGS" 2>/dev/null; then
      log "Registering SessionStart hook in Claude settings..."

      # Merge the new hook into existing settings
      jq --arg hook "$HOOK_PATH" '
        .hooks.SessionStart = ((.hooks.SessionStart // []) + [{
          "matcher": "",
          "hooks": [{
            "type": "command",
            "command": $hook
          }]
        }])
      ' "$CLAUDE_SETTINGS" > /tmp/claude-settings-tmp.json \
        && mv /tmp/claude-settings-tmp.json "$CLAUDE_SETTINGS"

      ok "SessionStart hook registered."
    else
      ok "SessionStart hook already registered."
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
ok "Portal: http://localhost"
ok "Desktop shortcut installed"
ok "Auto-start hook registered"
echo ""
echo "Next steps:"
echo "  1. Edit $PORTAL_DIR/.env with your GitHub token"
echo "  2. Open http://localhost to access the dashboard"
echo "  3. Every new Claude Code session will auto-start the portal"
echo ""
