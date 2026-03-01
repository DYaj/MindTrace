#!/usr/bin/env bash
set -euo pipefail

# Resolve monorepo root = parent of this package
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$PKG_DIR/.." && pwd)"

SRC="$ROOT/prompts"
DEST="$PKG_DIR/prompts"

echo "Root:    $ROOT"
echo "Source:  $SRC"
echo "Dest:    $DEST"

mkdir -p "$DEST"

if [[ ! -d "$SRC" ]]; then
  echo "⚠️  prompts folder not found at: $SRC"
  exit 0
fi

# Copy prompts (clean sync)
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"

echo "✅ Synced prompts into frameworks-mcp:"
echo "   $DEST"
