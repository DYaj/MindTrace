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

# Helpers
escape_sed_replacement() {
    # Escape characters that can break sed replacement: \, &, and the delimiter |
    # Note: URLs commonly contain / and ? and = — those are safe with '|' delimiter.
    printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

ensure_env_var() {
    local key="$1"
    local value="$2"
    local file="$3"

    # Create file if missing
    touch "$file"

    local escaped
    escaped="$(escape_sed_replacement "$value")"

    if grep -qE "^${key}=" "$file"; then
        if [[ "$OS" == "macos" ]]; then
            sed -i '' -E "s|^${key}=.*|${key}=${escaped}|" "$file"
        else
            sed -i -E "s|^${key}=.*|${key}=${escaped}|" "$file"
        fi
    else
        echo "${key}=${value}" >> "$file"
    fi
}

prompt_base_url() {
    echo "🌐 BASE_URL configuration"
    echo "This is the target your tests run against."
    echo "Examples:"
    echo "  - http://localhost:3000"
    echo "  - https://staging.yourapp.com"
    echo "  - https://practicetestautomation.com/practice-test-login/"
    echo ""

    local base_url=""
    while [[ -z "$base_url" ]]; do
        read -r -p "Enter BASE_URL: " base_url
        base_url="$(echo "$base_url" | xargs)"
        if [[ -z "$base_url" ]]; then
            echo "❌ BASE_URL cannot be empty."
        fi
    done

    echo "$base_url"
}

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

read -r -p "Enter choice [1-4]: " STYLE_CHOICE

case $STYLE_CHOICE in
    1) SELECTED_STYLE="style1-native"; STYLE_NAME="Playwright Native" ;;
    2) SELECTED_STYLE="style2-bdd"; STYLE_NAME="Playwright + Cucumber BDD" ;;
    3) SELECTED_STYLE="style3-pom-bdd"; STYLE_NAME="Playwright + POM + Cucumber" ;;
    4) SELECTED_STYLE="all"; STYLE_NAME="All Styles" ;;
    *) echo "❌ Invalid choice"; exit 1 ;;
esac

echo ""
echo "✅ Selected: $STYLE_NAME"
echo ""

# Setup .env file (repo root)
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Prompt BASE_URL and write it into root .env
BASE_URL="$(prompt_base_url)"
ensure_env_var "BASE_URL" "$BASE_URL" ".env"
echo "✅ Saved BASE_URL into .env"
echo ""

# Install MindTrace runtime
echo "📦 Installing MindTrace runtime..."
cd mindtrace-ai-runtime
npm install
npm run build
cd ..
echo "✅ MindTrace runtime installed"
echo ""

# Install selected framework(s)
if [ "$SELECTED_STYLE" == "all" ]; then
    for style in style1-native style2-bdd style3-pom-bdd; do
        echo "📦 Installing $style..."
        cd "frameworks/$style"
        npm install
        cd ../..
        echo "✅ $style installed"
        echo ""
    done
else
    echo "📦 Installing $SELECTED_STYLE..."
    cd "frameworks/$SELECTED_STYLE"
    npm install
    cd ../..
    echo "✅ $SELECTED_STYLE installed"
    echo ""
fi

# Install Playwright browsers (install once is enough)
echo "🎭 Installing Playwright browsers..."
cd frameworks/style1-native
npx playwright install
cd ../..
echo "✅ Browsers installed"
echo ""

mkdir -p runs
echo "✅ Created runs directory"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     ✅ Setup Complete!                                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1) Run tests:"
if [ "$SELECTED_STYLE" == "all" ]; then
    echo "   cd frameworks/style1-native && npm run test:mindtrace"
    echo "   cd frameworks/style2-bdd && npm run test:mindtrace"
    echo "   cd frameworks/style3-pom-bdd && npm run test:mindtrace"
else
    echo "   cd frameworks/$SELECTED_STYLE && npm run test:mindtrace"
fi
echo ""