#!/bin/bash
# Build script for Claude Portal macOS Widget
# Prerequisites: Xcode 16+, xcodegen (brew install xcodegen)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/ClaudePortal"

cd "$PROJECT_DIR"

# Check prerequisites
if ! command -v xcodegen &>/dev/null; then
    echo "❌ xcodegen not found. Install with: brew install xcodegen"
    exit 1
fi

if ! xcode-select -p 2>/dev/null | grep -q "Xcode.app"; then
    echo "❌ Full Xcode required (not just CommandLineTools)."
    echo "   Install from App Store, then: sudo xcode-select -s /Applications/Xcode.app"
    exit 1
fi

# Generate Xcode project
echo "→ Generating Xcode project..."
xcodegen generate

# Build the app + widget
echo "→ Building ClaudePortal..."
xcodebuild -project ClaudePortal.xcodeproj \
    -scheme ClaudePortal \
    -configuration Release \
    -derivedDataPath "$SCRIPT_DIR/build" \
    build

# Find the built .app
APP_PATH=$(find "$SCRIPT_DIR/build" -name "Claude Portal Widget.app" -type d | head -1)

if [[ -z "$APP_PATH" ]]; then
    echo "❌ Build failed — .app not found"
    exit 1
fi

# Copy to ~/Applications
echo "→ Installing to ~/Applications..."
mkdir -p ~/Applications
rm -rf ~/Applications/"Claude Portal Widget.app"
cp -R "$APP_PATH" ~/Applications/

echo "✅ Widget installed! Open Notification Center → Edit Widgets → search 'Claude Portal'"
echo "   Or right-click desktop → Edit Widgets..."
