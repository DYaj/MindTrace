#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🖥️  Detected OS: $(uname | tr '[:upper:]' '[:lower:]')"
echo ""

echo "🔍 Checking Node.js installation..."
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Install Node 18+ first."
  exit 1
fi
echo "✅ Node.js $(node -v) installed"
echo ""

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm not found. Install npm first."
  exit 1
fi
echo "✅ npm $(npm -v) installed"
echo ""

echo "📦 Select Framework Style:"
echo ""
echo "1) Style 1 - Playwright Native"
echo "   Best for: Fast setup, small-mid projects, dev teams"
echo ""
echo "2) Style 2 - Playwright + Cucumber BDD"
echo "   Best for: Business-readable tests, stakeholder alignment"
echo ""
echo "3) Style 3 - Playwright + POM + Cucumber"
echo "   Best for: Enterprise scale, long-term maintainability"
echo ""
echo "4) Install All Styles"
echo ""

read -r -p "Enter choice [1-4]: " CHOICE
echo ""

STYLE="native"
case "${CHOICE}" in
  1) STYLE="native" ;;
  2) STYLE="bdd" ;;
  3) STYLE="pom-bdd" ;;
  4) STYLE="all" ;;
  *) echo "❌ Invalid choice."; exit 1 ;;
esac

echo "✅ Selected: ${STYLE}"
echo ""

echo "📦 Installing MCP Server..."
cd "${ROOT_DIR}/mindtrace-ai-runtime"

# Use npm install (package-lock may not exist yet)
npm install

echo ""
echo "🔧 Building MindTrace runtime..."
npm run build

echo ""
echo "✅ MindTrace runtime installed & built."
echo ""
echo "Next:"
echo "  - Run: npx mindtrace init --style native"
echo "  - Run: npx mindtrace run --style native --run-name local-$(date +%s)"
echo ""
