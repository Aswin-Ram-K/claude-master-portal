#!/bin/bash
set -euo pipefail

# Claude Master Portal — Desktop Shortcut Installer
# Auto-detects OS and installs the appropriate shortcut.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCHER="$SCRIPT_DIR/portal.sh"
ICON="$PORTAL_DIR/portal/public/icon.png"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[Install]${NC} $1"; }
warn() { echo -e "${YELLOW}[Install]${NC} $1"; }
err()  { echo -e "${RED}[Install]${NC} $1" >&2; }

chmod +x "$LAUNCHER"

case "$(uname -s)" in
  Linux)
    DESKTOP_FILE="$HOME/.local/share/applications/claude-portal.desktop"
    mkdir -p "$(dirname "$DESKTOP_FILE")"

    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=Claude Portal
Comment=Claude Code Activity Dashboard
Exec=$LAUNCHER
Icon=$ICON
Terminal=false
Categories=Development;
StartupWMClass=claude-portal
EOF

    chmod +x "$DESKTOP_FILE"

    # Update desktop database if available
    if command -v update-desktop-database &>/dev/null; then
      update-desktop-database "$HOME/.local/share/applications/" 2>/dev/null || true
    fi

    ok "Linux desktop shortcut installed at: $DESKTOP_FILE"
    ok "You should now see 'Claude Portal' in your application menu."
    ;;

  Darwin)
    APP_DIR="$HOME/Applications/Claude Portal.app"
    mkdir -p "$APP_DIR/Contents/MacOS"
    mkdir -p "$APP_DIR/Contents/Resources"

    # Create launch script
    cat > "$APP_DIR/Contents/MacOS/launch.sh" << EOF
#!/bin/bash
exec "$LAUNCHER"
EOF
    chmod +x "$APP_DIR/Contents/MacOS/launch.sh"

    # Create Info.plist
    cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Claude Portal</string>
    <key>CFBundleDisplayName</key>
    <string>Claude Portal</string>
    <key>CFBundleIdentifier</key>
    <string>com.claude.portal</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
</dict>
</plist>
EOF

    # Copy icon if exists
    if [ -f "$ICON" ]; then
      cp "$ICON" "$APP_DIR/Contents/Resources/icon.png"
    fi

    ok "macOS app installed at: $APP_DIR"
    ok "You can find 'Claude Portal' in ~/Applications or via Spotlight."
    ;;

  MINGW*|MSYS*|CYGWIN*)
    # Windows — create a batch launcher and VBS silent wrapper
    SHORTCUT_DIR="$APPDATA/Microsoft/Windows/Start Menu/Programs"

    if [ -d "$SHORTCUT_DIR" ]; then
      # Create batch file
      cat > "$PORTAL_DIR/launcher/windows/claude-portal.bat" << EOF
@echo off
cd /d "$PORTAL_DIR"
docker compose up -d --build
timeout /t 10 /nobreak >nul
start http://localhost
EOF

      # Create VBS silent launcher
      cat > "$PORTAL_DIR/launcher/windows/claude-portal.vbs" << EOF
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "$PORTAL_DIR/launcher/windows/claude-portal.bat" & chr(34), 0
Set WshShell = Nothing
EOF

      # Create shortcut via PowerShell
      powershell.exe -Command "
        \$WScriptShell = New-Object -ComObject WScript.Shell
        \$Shortcut = \$WScriptShell.CreateShortcut('$SHORTCUT_DIR\\Claude Portal.lnk')
        \$Shortcut.TargetPath = wscript.exe
        \$Shortcut.Arguments = '\"$PORTAL_DIR/launcher/windows/claude-portal.vbs\"'
        \$Shortcut.Description = 'Claude Code Activity Dashboard'
        \$Shortcut.Save()
      " 2>/dev/null || warn "Could not create Start Menu shortcut automatically."

      ok "Windows launcher created. Check Start Menu for 'Claude Portal'."
    else
      warn "Could not find Start Menu directory. Run the batch file manually:"
      warn "  $PORTAL_DIR/launcher/windows/claude-portal.bat"
    fi
    ;;

  *)
    err "Unsupported OS: $(uname -s)"
    err "You can run the portal manually: $LAUNCHER"
    exit 1
    ;;
esac

echo ""
ok "Installation complete! You can also run the portal manually:"
echo "  $LAUNCHER"
