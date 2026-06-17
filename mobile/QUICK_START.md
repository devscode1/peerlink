# 🎯 Expo Quick Start - 3 Minutes to Live App

## 1️⃣ **Install CLI Tools (1 minute)**

```bash
npm install -g expo-cli
npm install -g eas-cli
```

## 2️⃣ **Install Project Dependencies (2-3 minutes)**

```bash
cd mobile
npm install
```

## 3️⃣ **Start Development Server**

```bash
npm start
```

**Output:**
```
✓ Expo development server is ready
✓ Scan QR code to open app
```

## 📱 **Open on Phone (Pick One)**

### Option A: Expo Go (Instant - No Build)
1. Download "Expo Go" from App Store or Play Store
2. Scan the QR code shown in terminal
3. App opens instantly!

**Pros:**
- ✅ Instant loading
- ✅ Hot reload (changes appear immediately)
- ✅ No native build needed
- ✅ Works on any device

**Cons:**
- ⚠️ Some native modules may not work

### Option B: Native Dev App (Full Power)
```bash
# iOS (macOS only)
npm run ios

# Android
npm run android
```

### Option C: Web Browser (Testing)
```bash
npm start -- --web
```

## 🏗️ **Build Standalone App**

### Android APK (to install on phone or share)
```bash
npm run build:android
# Download APK from https://expo.dev/
# Install on phone via: adb install app.apk
```

### iOS TestFlight (for iPhone users)
```bash
npm run build:ios
# Requires Apple Developer account
# Share TestFlight link with testers
```

## 📱 **What You Can Do**

| Task | Command | Time |
|------|---------|------|
| Test with Expo Go | `npm start` | 10 sec |
| Edit & reload | Save file | Auto-reload |
| Build APK | `npm run build:android` | 5-10 min |
| Build iOS | `npm run build:ios` | 10-15 min |
| Run on simulator | `npm run ios` / `npm run android` | 1-2 min |
| Deploy web | `npm run build:web` | 2-3 min |

## ✅ **Check Setup**

```bash
# Are dependencies installed?
ls mobile/node_modules

# Is Expo CLI working?
expo --version

# Is app structure OK?
ls mobile/app.json mobile/src/App.tsx
```

## 🚨 **Troubleshooting**

| Problem | Solution |
|---------|----------|
| `expo: command not found` | `npm install -g expo-cli` |
| `npm install stuck` | `npm install --prefer-offline` |
| `QR code won't scan` | Use same WiFi network |
| `Port 8081 in use` | Kill: `lsof -ti:8081 \| xargs kill -9` |
| `Module not found` | Delete node_modules & `npm install` |

## 🎉 **Success Indicators**

✅ Terminal shows: `Expo development server is ready`  
✅ QR code displays in terminal  
✅ `npm start` doesn't error  
✅ Scanning QR code opens app on phone  
✅ Editing files shows live reload  

## 📚 **Learn More**

- **[EXPO_INSTALL.md](./EXPO_INSTALL.md)** - Detailed step-by-step guide
- **[EXPO_SETUP.md](./EXPO_SETUP.md)** - All available commands
- **[Expo Docs](https://docs.expo.dev/)** - Official documentation

## 🚀 **Right Now**

```bash
# Copy & paste this:
cd mobile && npm install && npm start

# Then scan the QR code with Expo Go app
```

**Done!** Your app is live on your phone. 🎊

---

### Next Steps (Optional)

1. **Share with friends:** Run `npm start` and send them QR code
2. **Build APK:** `npm run build:android` (shareable installer)
3. **TestFlight:** `npm run build:ios` (for iPhone users)
4. **Deploy:** Push changes and they auto-update

### Development Tips

- Changes auto-reload when you save
- Use phone's dev menu: shake device or press Cmd+M (Android) / Cmd+D (iOS)
- Install Expo DevTools for better debugging
- Check logs in terminal

---

**Questions?** See [EXPO_INSTALL.md](./EXPO_INSTALL.md) for detailed help.
