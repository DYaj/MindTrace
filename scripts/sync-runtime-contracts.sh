#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/mindtrace-ai-runtime"
SRC="$ROOT/contracts"
DST="$RUNTIME/contracts"

echo "Root:    $ROOT"
echo "Source:  $SRC"
echo "Dest:    $DST"
echo ""

if [[ ! -d "$SRC" ]]; then
  echo "❌ Missing root contracts folder: $SRC"
  exit 1
fi

mkdir -p "$DST"

# Copy contract tree (schemas/examples/scripts/types) into runtime package
# Using rsync-like behavior via cp (portable enough for macOS)
rm -rf "$DST/schemas" "$DST/examples" "$DST/scripts" "$DST/types" 2>/dev/null || true
cp -R "$SRC/schemas" "$DST/schemas"
cp -R "$SRC/examples" "$DST/examples"
cp -R "$SRC/scripts" "$DST/scripts"
cp -R "$SRC/types" "$DST/types" 2>/dev/null || true

# Copy top-level contract JSON files
cp "$SRC/compliance-definition-of-done.json" "$DST/compliance-definition-of-done.json"

echo "✅ Synced contracts into runtime:"
echo "   $DST"
