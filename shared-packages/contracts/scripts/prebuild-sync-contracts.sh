#!/usr/bin/env bash
set -euo pipefail

# packages/contracts
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

SRC="$ROOT/contracts"
DEST="$HERE/contracts"

echo "Root:    $ROOT"
echo "Source:  $SRC"
echo "Dest:    $DEST"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/" "$DEST/"

echo "✅ Synced contracts into @mindtrace/contracts:"
echo "   $DEST"
