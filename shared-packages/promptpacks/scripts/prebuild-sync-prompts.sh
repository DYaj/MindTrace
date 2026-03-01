#!/usr/bin/env bash
set -euo pipefail

# packages/promptpacks
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

SRC="$ROOT/prompts"
DEST="$HERE/prompts"

echo "Root:    $ROOT"
echo "Source:  $SRC"
echo "Dest:    $DEST"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/" "$DEST/"

echo "✅ Synced prompts into @mindtrace/promptpacks:"
echo "   $DEST"
