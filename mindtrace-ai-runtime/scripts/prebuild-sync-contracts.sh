#!/usr/bin/env bash
set -euo pipefail

# Run from mindtrace-ai-runtime/
HERE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

"$ROOT/scripts/sync-runtime-contracts.sh"
