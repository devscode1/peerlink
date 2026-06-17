# Expo Configuration for PeerLink Mobile

## 🚀 Quick Start (Expo Go)

### 1. Install Expo CLI

```bash
npm install -g expo-cli
# or
npm install -g eas-cli
```

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Start the Expo Development Server

```bash
npm start
# or
expo start
```

You'll see a QR code in the terminal.

### 4. Open on Device

**Option A: Expo Go App (Easiest)**
- Download "Expo Go" from App Store (iOS) or Play Store (Android)
- Scan the QR code from step 3
- App loads instantly on your phone!

**Option B: Development Build**
```bash
npm run dev
```

**Option C: Simulator/Emulator**
```bash
# iOS (macOS only)
npm run ios

# Android
npm run android
```

## 📦 Build Standalone App

### iOS (via EAS)

```bash
# Login to Expo
eas login

# Build for App Store
npm run build:ios

# Or for TestFlight
eas build --platform ios --profile preview
```

### Android (via EAS)

```bash
# Build APK
npm run build:android

# Or for Google Play
eas build --platform android --profile preview
```

### Web

```bash
# Build web version
npm run build:web
```

## 🔧 Configuration

### app.json
- App name, icon, splash screen
- Platform-specific settings (iOS/Android)
- Permissions and plugins
- EAS project ID

### eas.json
- Build profiles (development, preview, production)
- Submission settings (App Store, Google Play)
- Platform-specific build configurations

## 📱 Test Flows

### Local Testing (Fastest)
```bash
npm start
# Scan QR with Expo Go
# Changes auto-reload
```

### TestFlight (iOS Friends)
```bash
eas build --platform ios --profile preview
# Share link with iOS users
```

### Google Play Internal (Android Friends)
```bash
eas build --platform android --profile preview
# Upload to Google Play internal testing
```

## 🔑 Setup for Production

### iOS
1. Create Apple Developer account
2. Create App Identifier
3. Set `appleId` and `appleTeamId` in eas.json
4. Get provisioning profiles

### Android
1. Create Google Play account
2. Create upload key
3. Add `serviceAccount` JSON to eas.json

## 🚨 Troubleshooting

### "Expo CLI not found"
```bash
npm install -g expo-cli
```

### "Dependencies not installed"
```bash
cd mobile
npm install
```

### "Port 8081 already in use"
```bash
# Kill the process
lsof -ti:8081 | xargs kill -9
```

### "WebRTC not working"
- WebRTC requires native module: `react-native-webrtc`
- Make sure you're using dev client or building native app
- Expo Go may have limitations

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Expo Go Tutorial](https://docs.expo.dev/get-started/expo-go/)
- [Publishing Guide](https://docs.expo.dev/submit/introduction/)

## ✅ Commands Summary

```bash
# Development
npm start              # Start dev server
npm run dev           # Dev client
npm run ios           # iOS simulator
npm run android       # Android emulator
npm run web           # Web browser

# Building
npm run build:ios     # Build for iOS (EAS)
npm run build:android # Build for Android (EAS)
npm run build:web     # Build for web

# Other
npm run lint          # Check code style
npm run type-check    # TypeScript check
npm test              # Run tests
```

---

**Ready?** Run `npm start` and scan the QR code! 🎉
