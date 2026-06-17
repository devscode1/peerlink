@echo off
REM PeerLink Expo Setup Script (Windows)
REM Run this to set up everything in one command!

echo.
echo 🚀 PeerLink Expo Setup Script (Windows)
echo ========================================
echo.

REM Step 1: Check Node.js
echo ✓ Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)

REM Step 2: Check npm
echo ✓ Checking npm...
npm --version

REM Step 3: Install Expo CLI globally
echo.
echo 📦 Installing Expo CLI globally...
call npm install -g expo-cli
call npm install -g eas-cli

REM Step 4: Navigate to mobile folder
echo.
echo 📂 Setting up mobile app...
cd mobile

REM Step 5: Install dependencies
echo ⬇️  Installing dependencies (this may take 2-5 minutes)...
call npm install

REM Step 6: Summary
echo.
echo ✅ Setup Complete!
echo.
echo 🎯 Next steps:
echo 1. npm start              - Start Expo dev server
echo 2. Scan QR code with Expo Go app
echo 3. App loads on your phone!
echo.
echo 📚 Documentation:
echo - EXPO_INSTALL.md - Detailed installation guide
echo - EXPO_SETUP.md   - Expo commands reference
echo.
echo 🚀 Ready to go!
echo.
pause
