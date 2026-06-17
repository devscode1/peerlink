# Getting Started with PeerLink

Welcome to PeerLink! This guide will help you set up and start developing immediately.

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (server, mobile, shared).

### 2. Setup Environment Files

```bash
# Server
cp server/.env.example server/.env

# Mobile
cp mobile/.env.example mobile/.env
```

No changes needed - defaults work locally!

### 3. Terminal Setup

Open **2-3 terminal windows**:

**Terminal 1: Signaling Server**
```bash
npm run dev:server
```

You should see:
```
🚀 PeerLink Signaling Server Running
   Port: 3000
   Environment: development
```

**Terminal 2: Metro Bundler (JavaScript)**
```bash
cd mobile && npm start
```

Wait for:
```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ✓ Metro started
```

**Terminal 3: Mobile App (Pick one)**

For iOS:
```bash
cd mobile && npm run ios
```

For Android:
```bash
# First start Android emulator from Android Studio, then:
cd mobile && npm run android
```

### 4. Test the App

1. **Create Room**: Click "Create Room" → Enter your name
2. **Share Code**: You'll get a 6-character room code
3. **Join Room**: On another device/simulator, enter the code
4. **Connect**: Once connected, you're in P2P mode!

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Project overview and features |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Detailed setup and troubleshooting |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design and data flow |
| [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) | What's been built |

## 🔍 Project Structure

```
react-chat/
├── server/          # Node.js signaling server
├── mobile/          # React Native app
├── shared/          # Shared types & utilities
├── docs/            # Documentation
└── README.md        # Main documentation
```

## 🛠️ Common Commands

```bash
# Development
npm run dev          # Start everything
npm run dev:server   # Just the server
npm run dev:mobile   # Just the mobile app

# Code quality
npm run lint         # Check code style
npm run type-check   # Check TypeScript
npm test             # Run tests

# Building
npm run build        # Build all packages

# Mobile
cd mobile && npm run ios      # Open iOS simulator
cd mobile && npm run android  # Open Android emulator
```

## 🐛 Troubleshooting

### Metro won't start
```bash
cd mobile
npm start -- --reset-cache
```

### Android emulator won't open
```bash
# Start from Android Studio first, then:
cd mobile && npm run android
```

### TypeScript errors
```bash
npm run type-check  # See what's wrong
```

### Port 3000 already in use
```bash
# On macOS/Linux, kill the process:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## 🎯 What to Test First

1. ✅ Start server (should show health check at http://localhost:3000/health)
2. ✅ Start Metro bundler (should compile successfully)
3. ✅ Start iOS/Android (app should launch without errors)
4. ✅ Create a room (should get a 6-character code)
5. ✅ Join room on another device (connection should establish)

## 📖 Learn the Architecture

The app has 3 main parts:

**Server (Signaling)**
- Handles WebRTC handshaking
- Relays offers, answers, ICE candidates
- No user data passes through

**Mobile App (React Native)**
- Beautiful UI for messaging
- WebRTC peer connection management
- Local message storage

**Shared Types**
- TypeScript types used by both
- Utility functions

**Data Flow:**
```
User creates room
   ↓
Server assigns code
   ↓
Second user joins with code
   ↓
Server exchanges connection info (SDP/ICE)
   ↓
Devices connect directly (P2P)
   ↓
Encrypted messaging over DataChannel
```

## 🚀 Next Steps

1. **Explore the code:**
   - `server/src/` - Signaling server
   - `mobile/src/screens/` - UI screens
   - `mobile/src/services/` - Connection logic

2. **Read documentation:**
   - [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - How everything works
   - [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Advanced setup

3. **Make your first change:**
   - Edit `mobile/src/screens/HomeScreen.tsx`
   - Change button color or text
   - Save - should hot reload!

4. **Run tests:**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

## 💡 Development Tips

- **Hot reload:** Changes to `src/` files auto-reload in simulators
- **Debug mode:** Press `Cmd+D` (iOS) or `Cmd+M` (Android) for dev menu
- **Inspect props:** Use React DevTools in dev menu
- **Check types:** TypeScript catches errors before runtime

## ❓ Need Help?

- 📖 Check [DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- 🔍 See [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- 💬 Read [CONTRIBUTING.md](./CONTRIBUTING.md)
- 🐛 Search GitHub Issues

## 🎓 Learn More

- [WebRTC Guide](https://webrtc.org/getting-started/overview)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Socket.IO Guide](https://socket.io/docs/v4/socket-io-protocol/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🎉 You're Ready!

Your development environment is set up. Now:

1. Run the server
2. Start the metro bundler
3. Open the app on your device/simulator
4. Create a room and have fun!

Happy coding! 🚀

---

Questions? Open a GitHub Issue or check the docs above.
