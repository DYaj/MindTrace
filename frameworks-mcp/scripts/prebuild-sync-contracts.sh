#!/usr/bin/env bash
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$PKG_DIR/.." && pwd)"

SRC="$ROOT/contracts"
DEST="$PKG_DIR/contracts"

echo "Root:    $ROOT"
echo "Source:  $SRC"
echo "Dest:    $DEST"

mkdir -p "$DEST"

if [[ ! -d "$SRC" ]]; then
  echo "⚠️  contracts folder not found at: $SRC"
  exit 0
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"

echo "✅ Synced contracts into frameworks-mcp:"
echo "   $DEST"
