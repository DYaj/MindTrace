#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Installing root deps"
npm install

echo "==> Installing runtime deps"
cd mindtrace-ai-runtime
npm install
npm run build
cd "$ROOT"

echo "==> Validating contracts"
npm run contracts:validate

echo "==> Running MindTrace"
RUN_NAME="${1:-bootstrap-$(date +%s)}"
node mindtrace-ai-runtime/dist/cli.js run --run-name "$RUN_NAME" --allow-overwrite
