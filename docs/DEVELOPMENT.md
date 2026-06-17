# Development Setup Guide

This guide covers the complete setup for developing PeerLink on your local machine.

## Prerequisites

### System Requirements

- **macOS 12.0+** (M1/M2/Intel)
- **Windows 10+** or **Linux** (Ubuntu 20.04+)
- **8GB+ RAM** recommended
- **SSD** with at least 10GB free space

### Required Software

#### Node.js & npm

```bash
# Install Node.js 20+ LTS
# Download from https://nodejs.org/

# Verify installation
node --version  # v20.x.x
npm --version   # 10.x.x
```

#### Git

```bash
# Install Git
# https://git-scm.com/downloads

git --version
```

#### For iOS Development (macOS only)

```bash
# Install Xcode
# Download from App Store or https://developer.apple.com/download/

# Install Xcode command line tools
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods
```

#### For Android Development

```bash
# Install Android Studio
# https://developer.android.com/studio

# Set up Android SDK
# Tools > SDK Manager > SDK Platforms
# - Android API 31+
# - Build Tools 34.0.0+

# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/Sdk  # macOS/Linux
set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk  # Windows
```

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourorg/peerlink-mobile.git
cd react-chat
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
npm install --workspace=server

# Install mobile dependencies
npm install --workspace=mobile

# Install pod dependencies (iOS)
cd mobile/ios
pod install
cd ../..
```

### 3. Configure Environment

#### Server Setup

```bash
# Copy and customize environment file
cp server/.env.example server/.env

# Edit server/.env with your settings:
# - PORT (default: 3000)
# - NODE_ENV (development/production)
# - REDIS_URL (optional)
```

#### Mobile Setup

```bash
# Copy and customize environment file
cp mobile/.env.example mobile/.env

# Edit mobile/.env:
# - SIGNALING_SERVER_URL=http://localhost:3000
```

## Development Workflow

### Terminal Setup

Open **4 terminal windows/tabs**:

#### Terminal 1: Signaling Server

```bash
npm run dev:server

# Expected output:
# 🚀 PeerLink Signaling Server Running
#    Port: 3000
#    Environment: development
#    Ready to handle WebRTC signaling
```

#### Terminal 2: Metro Bundler (iOS/Android)

```bash
cd mobile
npm start

# Wait for Metro to start:
# ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ✓ Metro started
```

#### Terminal 3: iOS Simulator

```bash
cd mobile
npm run ios

# App will open in simulator
# Command+D for dev menu
# Command+R to reload
```

#### Terminal 4: Android Emulator

```bash
# First, start Android emulator from Android Studio
# Or via command line:
emulator -avd Pixel_4_API_31

# Then in another terminal:
cd mobile
npm run android

# App will install and launch on emulator
```

### Code Structure Overview

#### Server Services

- **handlers.ts** - Socket.IO event handlers for signaling
- **roomCleanup.ts** - Room lifecycle and cleanup
- **index.ts** - Express server initialization

#### Mobile Services

- **webrtcService.ts** - WebRTC peer connection management
- **signalingService.ts** - Socket.IO client for signaling
- **fileTransferService.ts** - Binary file transfer with chunking
- **databaseService.ts** - SQLite message persistence

#### Mobile Screens

- **HomeScreen** - Create/join room interface
- **ConnectingScreen** - Connection status and room code display
- **ChatScreen** - Main messaging interface
- **SettingsScreen** - User preferences and configuration

## Testing & Debugging

### Type Checking

```bash
# Check all workspaces
npm run type-check

# Check specific workspace
npm run type-check --workspace=server
```

### Linting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific workspace
npm test --workspace=mobile
```

### Debugging

#### Browser DevTools (Server)

The signaling server can be debugged in Chrome:

```bash
# Start server with debugging enabled
node --inspect=9229 dist/index.js

# Open in Chrome: chrome://inspect
```

#### React Native Debugger (Mobile)

```bash
# Install React Native Debugger
# https://github.com/jhen0409/react-native-debugger

# On simulator dev menu:
# - iOS: Command+D
# - Android: Command+M or Ctrl+M

# Select "Debug Remote JS"
```

#### Android Studio Debugger

```bash
# In Android Studio:
# Run > Debug 'app'
# Set breakpoints in Kotlin/Java code
```

## Common Issues & Solutions

### Issue: Metro bundler won't start

```bash
# Clear cache and restart
npm start -- --reset-cache
```

### Issue: Pod install fails

```bash
# Update CocoaPods and retry
pod repo update
cd mobile/ios && pod install && cd ../..
```

### Issue: Android build fails

```bash
# Clean and rebuild
cd mobile/android
./gradlew clean
./gradlew build
cd ../..
```

### Issue: Can't connect between simulator and signaling server

```bash
# iOS Simulator: Use localhost:3000
# Android Emulator: Use 10.0.2.2:3000 to reach host machine
# Update SIGNALING_SERVER_URL in .env accordingly
```

## Code Style

We follow strict TypeScript and code style guidelines:

- **TypeScript** - Strict mode enabled
- **ESLint** - Enforce code quality
- **Prettier** - Automatic code formatting
- **Husky** - Pre-commit hooks (coming soon)

Format code before committing:

```bash
npm run lint -- --fix
```

## Performance Profiling

### Profile React Components

```javascript
// In React Native DevTools:
// Menu > Profiler > Start recording
// Interact with app
// Stop recording and analyze
```

### Profile Network

```bash
# View WebRTC stats in browser console
// Chrome DevTools > chrome://webrtc-internals
```

### Monitor Memory

```bash
# iOS: Xcode > Debug > Memory Graph
# Android: Android Studio > Profiler > Memory
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All console errors resolved
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Code reviewed and approved

## Getting Help

- 📖 Check [README.md](./README.md)
- 🔍 Search existing [GitHub Issues](https://github.com/yourorg/issues)
- 💬 Join [Discussions](https://github.com/yourorg/discussions)
- 📧 Contact maintainers

## Next Steps

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
- Review [Architecture Guide](./docs/ARCHITECTURE.md)
- Check [API Documentation](./docs/API.md)

---

Happy coding! 🚀
