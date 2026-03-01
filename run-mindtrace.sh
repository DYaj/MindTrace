#!/usr/bin/env bash
set -e

echo "🔧 Building MindTrace runtime..."
cd mindtrace-ai-runtime
npm install >/dev/null 2>&1 || true
npm run build
cd ..

echo "🚀 Running MindTrace..."
node mindtrace-ai-runtime/dist/cli.js "$@"
