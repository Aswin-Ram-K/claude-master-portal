#!/bin/bash
# Run this after cloning claudes-little-peephole to set up the fork.
# Renames peephole-specific files into place and cleans up portal-only artifacts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Claude's Little Peephole — Fork Init ==="

# Swap in peephole README and CLAUDE.md
if [[ -f README.peephole.md ]]; then
    mv README.peephole.md README.md
    echo "  -> README.md (peephole edition)"
fi

if [[ -f CLAUDE.peephole.md ]]; then
    mv CLAUDE.peephole.md CLAUDE.md
    echo "  -> CLAUDE.md (peephole edition)"
fi

# Remove portal-only top-level files that aren't relevant to the widget fork
for f in setup.sh docker docs hooks launcher PROJECT_CONTEXT.md; do
    if [[ -e "$f" ]]; then
        rm -rf "$f"
        echo "  removed: $f"
    fi
done

# Remove this init script (one-time use)
rm -f peephole-init.sh

echo ""
echo "Done! The repo is now a standalone widget project."
echo "Key directories:"
echo "  widget/   — Swift WidgetKit source"
echo "  portal/   — API endpoint (kept for /api/widget)"
echo ""
echo "Next steps:"
echo "  1. cd portal && npm install && npx prisma generate"
echo "  2. ./widget/build.sh"
