#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SRC="$ROOT/prompts"
DEST="$ROOT/mindtrace-ai-runtime/prompts"

echo "Root:    $ROOT"
echo "Source:  $SRC"
echo "Dest:    $DEST"

if [[ ! -d "$SRC" ]]; then
  echo "❌ prompts folder not found at: $SRC"
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"

# Copy prompts (directories + md files)
cp -R "$SRC/" "$DEST/"

echo ""
echo "✅ Synced prompts into runtime:"
echo "   $DEST"
