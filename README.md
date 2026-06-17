# PeerLink Mobile

🚀 **P2P Encrypted Chat & File Transfer for React Native**

PeerLink is a production-ready mobile application that enables direct, encrypted peer-to-peer communication between two mobile devices over the internet. Built with **React Native**, **WebRTC**, and **Socket.IO**, it delivers near-native performance for messaging and large file transfers without any central server in the data path.

## Features

✅ **Direct P2P Connection** - No routing through central servers  
✅ **End-to-End Encrypted** - DTLS 1.2/1.3 encryption by default  
✅ **Fast Messaging** - Sub-100ms latency on good connections  
✅ **Large File Transfers** - Support for files up to 4GB  
✅ **Automatic NAT Traversal** - STUN + TURN for any network  
✅ **Resume Transfers** - Paused transfers can be resumed  
✅ **Local Message History** - SQLite-based persistence  
✅ **Dark Mode Support** - Modern UI with accessibility  

## Project Structure

```
react-chat/
├── server/              # Node.js signaling server
│   ├── src/
│   │   ├── index.ts
│   │   ├── handlers.ts
│   │   └── roomCleanup.ts
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/              # React Native app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── ConnectingScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── components/
│   │   ├── services/
│   │   │   ├── webrtcService.ts
│   │   │   ├── signalingService.ts
│   │   │   ├── fileTransferService.ts
│   │   │   └── databaseService.ts
│   │   ├── store/
│   │   │   └── connectionStore.ts
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/              # Shared types and utilities
│   ├── types.ts
│   ├── utils.ts
│   ├── package.json
│   └── tsconfig.json
│
└── package.json         # Root workspace config
```

## Quick Start

### Prerequisites

- **Node.js** 20+ LTS
- **npm** 10+ or **yarn**
- **Xcode** 14+ (iOS development)
- **Android Studio** (Android development)

### Installation

```bash
# Install dependencies for all workspaces
npm install

# Or using yarn
yarn install
```

### Development

#### Start Signaling Server

```bash
npm run dev:server

# Server runs on http://localhost:3000
```

#### Start Mobile App (iOS)

```bash
npm run dev:mobile

# Or directly:
cd mobile
npm run ios
```

#### Start Mobile App (Android)

```bash
cd mobile
npm run android
```

### Environment Setup

#### Server Configuration

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
REDIS_URL=redis://localhost:6379  # Optional for scaling
```

#### Mobile Configuration

```bash
cp mobile/.env.example mobile/.env
```

Edit `mobile/.env`:

```env
SIGNALING_SERVER_URL=http://localhost:3000
DEFAULT_DISPLAY_NAME=Anonymous
```

## Architecture

### Connection Flow

```
Device A (Initiator)          Device B (Joiner)
       |                             |
       |------- create-room -------->|
       |                             |
       |<----- room code ------------|
       |                             |
       |--- join-room (code) ------->|
       |                             |
       |<----- peer-joined ----------|
       |                             |
       |---- SDP offer ------------->|
       |<----- SDP answer -----------|
       |                             |
       |<-> ICE candidates <-------->|
       |                             |
       |<----- DataChannel open ---->|
       |                             |
       |===== P2P Connected! ========|
       |                             |
       |<---> Messages/Files <------>|
```

### WebRTC DataChannel Protocol

**Text Messages:**
```json
{
  "type": "text",
  "content": "Hello!",
  "timestamp": "2026-06-06T12:00:00Z"
}
```

**File Transfers:**
```json
{
  "type": "TRANSFER_INIT",
  "fileId": "file_12345",
  "fileName": "document.pdf",
  "fileSize": 1048576,
  "mimeType": "application/pdf",
  "chunkSize": 65536,
  "totalChunks": 16,
  "sha256": "abc123..."
}
```

## Performance Targets

| Metric | Target | Priority |
|--------|--------|----------|
| P2P Connection Time | < 5 sec (p90) | P0 |
| Message Latency | < 100 ms (p95) | P0 |
| File Transfer Throughput | > 80% link bandwidth | P1 |
| App Cold Start | < 2 seconds | P0 |
| TURN Fallback Rate | < 20% of sessions | P1 |
| Crash-Free Sessions | > 99.5% | P1 |

## Security

- **End-to-End Encryption:** DTLS 1.2/1.3 (WebRTC standard)
- **File Integrity:** SHA-256 verification on all transfers
- **Room Codes:** 6 alphanumeric characters, 56 billion combinations
- **Room Expiry:** Automatic cleanup after 10 minutes of inactivity
- **TURN Credentials:** Time-limited TTL (24 hours)
- **No Telemetry:** Zero analytics or crash reporting of user data

## Deployment

### Deploy Signaling Server

#### Option 1: Railway

```bash
# Push to Railway
railway link
railway deploy
```

#### Option 2: Fly.io

```bash
flyctl auth login
flyctl launch
flyctl deploy
```

#### Option 3: Docker

```bash
docker build -t peerlink-server ./server
docker run -e PORT=3000 -p 3000:3000 peerlink-server
```

### Deploy Mobile App

#### iOS (TestFlight)

```bash
cd mobile
npm run build:ios
```

#### Android (Play Store)

```bash
cd mobile
npm run build:android
```

## Testing

### Run Tests

```bash
# All workspaces
npm test

# Specific workspace
npm test --workspace=server
npm test --workspace=mobile
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Connection Issues

**Issue:** Cannot connect peers  
**Solution:** 
- Check signaling server is running (`http://localhost:3000/health`)
- Verify CORS settings match your client origin
- Check firewall allows WebSocket connections
- Ensure STUN/TURN servers are accessible

### File Transfer Failing

**Issue:** File transfer aborts mid-transfer  
**Solution:**
- Check available device storage
- Monitor DataChannel bufferedAmount
- Verify SHA-256 hash matches
- Check ICE connection type (TURN may have lower bandwidth)

### Poor Performance

**Issue:** Slow message delivery or file transfer  
**Solution:**
- Check network conditions (latency, jitter)
- Verify using P2P connection (not TURN relay)
- Monitor device CPU/memory usage
- Reduce chunk size if on weak connection

## Development Roadmap

- [ ] Group chat (3+ participants)
- [ ] Push notifications
- [ ] Voice/video calls
- [ ] Message search and filtering
- [ ] Emoji reactions and read receipts
- [ ] QR code pairing
- [ ] Desktop client (Electron)
- [ ] Cloud sync for offline users

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- 📖 [PRD Documentation](./PeerLink_PRD_v1.0.txt)
- 🐛 [Report Issues](https://github.com/yourrepo/issues)
- 💬 [Discussions](https://github.com/yourrepo/discussions)

---

**Built with ❤️ for peer-to-peer communication**
