#!/usr/bin/env bash
set -euo pipefail

# package root = governance-mcp/
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/.." && pwd)"

SRC="$REPO_ROOT/contracts"
DEST="$PKG_DIR/contracts"

echo "Root:    $REPO_ROOT"
echo "Source:  $SRC"
echo "Dest:    $DEST"

mkdir -p "$DEST"
rm -rf "$DEST"
mkdir -p "$DEST"

# Copy contracts into the package so published npm tarballs contain schemas.
cp -R "$SRC" "$DEST"

echo "✅ Synced contracts into governance-mcp:"
echo "   $DEST"
