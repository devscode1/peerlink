#!/bin/bash
# PeerLink Expo Setup Script
# Run this to set up everything in one command!

set -e

echo "🚀 PeerLink Expo Setup Script"
echo "=============================="
echo ""

# Step 1: Check Node.js
echo "✓ Checking Node.js..."
node_version=$(node --version)
echo "  Node.js version: $node_version"

# Step 2: Check npm
echo "✓ Checking npm..."
npm_version=$(npm --version)
echo "  npm version: $npm_version"

# Step 3: Install Expo CLI globally
echo ""
echo "📦 Installing Expo CLI globally..."
npm install -g expo-cli
npm install -g eas-cli

# Step 4: Navigate to mobile folder
echo ""
echo "📂 Setting up mobile app..."
cd mobile

# Step 5: Install dependencies
echo "⬇️  Installing dependencies (this may take 2-5 minutes)..."
npm install

# Step 6: Summary
echo ""
echo "✅ Setup Complete!"
echo ""
echo "🎯 Next steps:"
echo "1. npm start              - Start Expo dev server"
echo "2. Scan QR code with Expo Go app"
echo "3. App loads on your phone!"
echo ""
echo "📚 Documentation:"
echo "- EXPO_INSTALL.md - Detailed installation guide"
echo "- EXPO_SETUP.md   - Expo commands reference"
echo ""
echo "🚀 Ready to go!"
