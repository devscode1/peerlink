# PeerLink Expo Setup Script (PowerShell)
# Run this to set up everything in one command!

Write-Host "`n🚀 PeerLink Expo Setup Script" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Step 1: Check Node.js
Write-Host "✓ Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version
Write-Host "  Node.js version: $nodeVersion"

# Step 2: Check npm
Write-Host "✓ Checking npm..." -ForegroundColor Cyan
$npmVersion = npm --version
Write-Host "  npm version: $npmVersion"

# Step 3: Install Expo CLI globally
Write-Host "`n📦 Installing Expo CLI globally..." -ForegroundColor Yellow
npm install -g expo-cli
npm install -g eas-cli

# Step 4: Navigate to mobile folder
Write-Host "`n📂 Setting up mobile app..." -ForegroundColor Cyan
Set-Location mobile

# Step 5: Install dependencies
Write-Host "⬇️  Installing dependencies (this may take 2-5 minutes)..." -ForegroundColor Yellow
npm install

# Step 6: Summary
Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. npm start              - Start Expo dev server"
Write-Host "2. Scan QR code with Expo Go app"
Write-Host "3. App loads on your phone!"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "- QUICK_START.md      - 3-minute setup"
Write-Host "- EXPO_INSTALL.md     - Detailed installation"
Write-Host "- EXPO_SETUP.md       - Commands reference"
Write-Host ""
Write-Host "🚀 Ready to go!" -ForegroundColor Green
Write-Host ""
