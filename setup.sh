#!/bin/bash

# ===========================================
# MindTrace for Playwright - Quick Setup
# ===========================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🚀 MindTrace for Playwright Setup                        ║"
echo "║     AI-Governed Test Automation with Self-Healing            ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

echo "🖥️  Detected OS: $OS"
echo ""

# Check Node.js
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "   Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION installed"
echo ""

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found!"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION installed"
echo ""

# Select framework style
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

read -p "Enter choice [1-4]: " STYLE_CHOICE

case $STYLE_CHOICE in
    1)
        SELECTED_STYLE="style1-native"
        STYLE_NAME="Playwright Native"
        ;;
    2)
        SELECTED_STYLE="style2-bdd"
        STYLE_NAME="Playwright + Cucumber BDD"
        ;;
    3)
        SELECTED_STYLE="style3-pom-bdd"
        STYLE_NAME="Playwright + POM + Cucumber"
        ;;
    4)
        SELECTED_STYLE="all"
        STYLE_NAME="All Styles"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Selected: $STYLE_NAME"
echo ""

# Install MCP Server
echo "📦 Installing MCP Server..."
cd mindtrace-runtime
npm install
npm run build
cd ..
echo "✅ MCP Server installed"
echo ""

# Install selected framework(s)
if [ "$SELECTED_STYLE" == "all" ]; then
    for style in style1-native style2-bdd style3-pom-bdd; do
        echo "📦 Installing $style..."
        cd frameworks/$style
        npm install
        cd ../..
        echo "✅ $style installed"
        echo ""
    done
else
    echo "📦 Installing $SELECTED_STYLE..."
    cd frameworks/$SELECTED_STYLE
    npm install
    cd ../..
    echo "✅ $SELECTED_STYLE installed"
    echo ""
fi

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
cd frameworks/${SELECTED_STYLE/all/style1-native}
npx playwright install
cd ../..
echo "✅ Browsers installed"
echo ""

# Setup .env file
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Configure your LLM API keys in .env file"
    echo "   Required: OPENAI_API_KEY or ANTHROPIC_API_KEY or OLLAMA_BASE_URL"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Create runs directory
mkdir -p runs
echo "✅ Created runs directory"
echo ""

# Success message
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     ✅ Setup Complete!                                         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Configure LLM Provider in .env:"
echo "   $ nano .env"
echo "   (Add your OPENAI_API_KEY or ANTHROPIC_API_KEY)"
echo ""

if [ "$SELECTED_STYLE" == "all" ]; then
    echo "2. Run tests (choose one):"
    echo "   $ cd frameworks/style1-native && npm run test:mindtrace"
    echo "   $ cd frameworks/style2-bdd && npm run test:mindtrace"
    echo "   $ cd frameworks/style3-pom-bdd && npm run test:mindtrace"
else
    echo "2. Run tests:"
    echo "   $ cd frameworks/$SELECTED_STYLE"
    echo "   $ npm run test:mindtrace"
fi

echo ""
echo "3. View results:"
echo "   $ npm run report"
echo ""
echo "4. Check MCP artifacts:"
echo "   $ ls mindtrace-artifacts/"
echo ""
echo "📚 Documentation:"
echo "   - Setup Guide: docs/SETUP.md"
echo "   - TeamCity Integration: docs/TEAMCITY.md"
echo "   - Architecture: docs/ARCHITECTURE.md"
echo ""
echo "🎉 Happy Testing!"
echo ""
