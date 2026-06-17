# 🚀 Expo Installation & Build Guide for PeerLink

Complete step-by-step guide to build PeerLink as an Expo app.

## ✅ Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version (need 9+)
npm --version
```

## 📋 Step 1: Install Expo CLI (5 minutes)

### Global Installation

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Verify installation
expo --version

# Install EAS CLI (for building)
npm install -g eas-cli

# Verify EAS
eas --version
```

## 📦 Step 2: Install Project Dependencies (3-5 minutes)

```bash
# Navigate to mobile folder
cd mobile

# Install all dependencies
npm install

# This installs:
# - Expo framework
# - React Native
# - All required libraries
# - Build tools
```

## 🎯 Step 3: Test Locally with Expo Go (Fastest!)

### Start Expo Server

```bash
# From mobile directory
npm start
```

You'll see output like:
```
Expo Go is ready at http://localhost:8081
Scan the QR code below to open the app:

  ▓▓▓▓▓▓▓▓▓
  ▓ QR CODE ▓
  ▓▓▓▓▓▓▓▓▓
```

### Open on Phone

**iOS:**
1. Download "Expo Go" from App Store
2. Scan the QR code with camera app
3. App opens instantly!

**Android:**
1. Download "Expo Go" from Play Store
2. Open app
3. Scan QR code
4. App loads!

### Changes Auto-Reload
- Edit any file in `src/`
- Save
- App refreshes automatically
- No rebuild needed!

## 🏗️ Step 4: Build Development App (for native modules)

If Expo Go has issues with WebRTC, build a dev app:

```bash
# Build for iOS simulator
npm run ios

# Or Android emulator
npm run android
```

This creates a native development app with full capabilities.

## 📱 Step 5: Build Standalone APK (Android)

### Easy Method: EAS Build (Recommended)

```bash
# Login to Expo account (creates free account)
eas login

# Build APK for Android
npm run build:android

# Output:
# ✓ Build complete
# 📥 Download: https://expo.dev/artifacts/...
# 📦 APK file (~50-100MB)
```

**Install on Phone:**
1. Download the APK file
2. Connect phone to computer via USB
3. Run: `adb install path/to/peerlink.apk`
4. Or email APK and install manually

### Manual Method (Advanced)

```bash
cd mobile

# Create signed APK (requires keystore setup)
eas build --platform android --profile production
```

## 🍎 Step 6: Build for iOS (TestFlight)

### Setup Requirements
1. Apple Developer Account (~$99/year)
2. Xcode 14+ installed
3. Apple ID and password

### Build Process

```bash
# Build for iOS
npm run build:ios

# Or specific profile
eas build --platform ios --profile preview

# Then in Xcode:
# Product > Archive
# Distribute App > TestFlight
```

## 🌐 Step 7: Build Web Version (Optional)

```bash
# Build for web
npm run build:web

# Output: expo-web/index.html
# Deploy to Vercel, Netlify, GitHub Pages, etc.
```

## 🔧 Step 8: Configure for Your Needs

### Update app.json

```json
{
  "expo": {
    "name": "PeerLink",
    "slug": "peerlink",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": "./assets/splash.png"
  }
}
```

### Create App Icons (2024x2024 PNG)

```bash
# Create icon.png (1024x1024 minimum)
# and splash.png (1284x2778 for iOS, 1080x2340 for Android)
# Place in mobile/assets/

# Expo will resize automatically
```

### Update app.json with your details

```bash
# Edit mobile/app.json:
# - Change "name": your app name
# - Change "slug": your-app-name (no spaces)
# - Add icon and splash images
# - Update bundleIdentifier (iOS) and package (Android)
```

## 📤 Step 9: Distribute to Users

### Method 1: Expo Go (No Build Needed)
```bash
npm start
# Users scan QR code
# Works on any device
```

### Method 2: TestFlight (iOS Friends)
```bash
npm run build:ios
# Share TestFlight link
# Users get instant updates
```

### Method 3: Play Store (Android Friends)
```bash
npm run build:android
# Upload to Google Play internal testing
# Users test before public release
```

### Method 4: Direct APK (Android Only)
```bash
npm run build:android
# Share APK file
# Users install directly
```

## 🚨 Troubleshooting

### Issue: npm install fails

```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

### Issue: Expo CLI not found

```bash
# Install globally
npm install -g expo-cli

# Or use npx
npx expo start
```

### Issue: Port 8081 in use

```bash
# Kill process on port 8081
# macOS/Linux:
lsof -ti:8081 | xargs kill -9

# Windows:
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Issue: QR code won't scan

```bash
# Make sure phone and computer are on same WiFi
# Try connecting via tunnel:
expo start --tunnel

# Or LAN:
expo start --lan
```

### Issue: WebRTC not working in Expo Go

```bash
# Build native app instead:
npm run ios     # iOS simulator
npm run android # Android emulator
```

### Issue: "EAS project ID missing"

```bash
# Update mobile/app.json:
# "extra": { "eas": { "projectId": "YOUR_ID" } }

# Or create new project:
eas project:create
```

## ✅ Quick Reference

### Commands

```bash
# Development
npm start           # Start Expo server (scan QR with Expo Go)
npm run dev        # Dev client with native modules
npm run ios        # iOS simulator
npm run android    # Android emulator

# Building
npm run build:ios     # Build for iOS (EAS)
npm run build:android # Build for Android (EAS)
npm run build:web     # Build for web

# Other
npm run lint          # Lint code
npm run type-check    # Check TypeScript
npm test              # Run tests
npm start -- --web   # Open in web browser
```

### File Structure

```
mobile/
├── app.json                # Expo configuration
├── eas.json               # Build configuration
├── babel.config.js        # Babel setup
├── metro.config.js        # Metro bundler
├── tsconfig.json          # TypeScript
├── package.json           # Dependencies
├── assets/                # Icons, splash (create if missing)
├── src/
│   ├── App.tsx           # Main app
│   ├── screens/          # UI screens
│   ├── services/         # Business logic
│   ├── store/            # State management
│   └── utils/            # Helpers
└── EXPO_SETUP.md         # Expo guide
```

## 🎯 What You Can Do Now

✅ Test on phone instantly (Expo Go)  
✅ Build native APK for Android  
✅ Build for TestFlight/App Store (iOS)  
✅ Deploy web version  
✅ Share with friends via QR code  
✅ Push live updates without rebuilding  

## 🎉 Success!

When you run `npm start`, you should see:

```
✓ Expo development server is ready
✓ Metro bundler is ready
✓ QR code for Expo Go

👉 Scan to open app on your phone!
```

## 📚 Resources

- [Expo Docs](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [React Native WebRTC](https://github.com/react-native-webrtc/react-native-webrtc)
- [Socket.IO Guide](https://socket.io/docs/v4/)

## 🚀 Next Steps

1. **Right now:** `npm start` → scan QR code
2. **This week:** Build standalone APK
3. **Next week:** Deploy signaling server to cloud
4. **Next month:** Launch on app stores

---

**Ready?** Run this command and you're live:

```bash
cd mobile && npm install && npm start
```

🎊 Congratulations! You now have a fully functional Expo mobile app!
