# PeerLink Architecture

## System Overview

PeerLink is a client-server architecture with a minimal signaling backend. The core innovation is that once peers connect, all data flows directly peer-to-peer without touching the signaling server.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Internet (Public)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐          ┌──────────────┐                    │
│  │   Device A   │          │   Device B   │                    │
│  │  (React     │ ← Sig →  │  (React     │                    │
│  │   Native)   │          │   Native)   │                    │
│  └──────────────┘          └──────────────┘                    │
│         ▲                         ▲                              │
│         │  Signaling (SDP/ICE)   │                              │
│         └───────────────────────┬──────────────┘               │
│                                 │                                │
│                          ┌──────────────┐                       │
│                          │   Signaling  │                       │
│                          │    Server    │                       │
│                          │  (Node.js +  │                       │
│                          │  Socket.IO)  │                       │
│                          └──────────────┘                       │
│                                                                   │
│        ◄─────────────────────────────────────────────────►      │
│                   P2P DataChannel (Encrypted)                    │
│        ◄─────────────────────────────────────────────────►      │
│                    (Via STUN or TURN if needed)                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Signaling Server (Node.js)

**Responsibility:** Handle connection bootstrapping only

**Technology Stack:**
- **Express.js** - HTTP server
- **Socket.IO** - Real-time WebSocket
- **Redis** (optional) - Multi-instance scaling

**Key Features:**
- Room creation and management
- SDP offer/answer relay
- ICE candidate exchange
- Rate limiting
- Automatic room cleanup

**Flow:**
```
Client 1                Server                  Client 2
   │                      │                        │
   │─── create-room ────►│                        │
   │◄─── roomId ────────│                        │
   │                      │                        │
   │                      │◄─── join-room ───────│
   │                      │─── peer-joined ─────►│
   │                      │─ peer-joined ◄─────│
   │                      │                        │
   │─ SDP offer ────────►│─ SDP offer ───────────│
   │◄─ SDP answer ──────│◄── SDP answer ──────│
   │─ ICE candidate ───►│─ ICE candidate ────────│
   │◄─ ICE candidate ───│◄── ICE candidate ────│
   │                      │                        │
   └────── P2P Connection Open ─────────────────►│
```

### 2. Mobile App (React Native)

**Responsibility:** User interface and peer management

**Architecture Layers:**

```
┌─────────────────────────────────────────┐
│         UI Layer (React Components)      │
│  ┌─────────────────────────────────────┤
│  │ HomeScreen  | ChatScreen | Settings │
│  └─────────────────────────────────────┤
├─────────────────────────────────────────┤
│    State Management (Zustand Store)     │
│  ┌─────────────────────────────────────┤
│  │ Connection | Message | FileTransfer │
│  └─────────────────────────────────────┤
├─────────────────────────────────────────┤
│       Service Layer (Business Logic)    │
│  ┌─────────────────────────────────────┤
│  │ WebRTC  | Signaling | FileTransfer  │
│  │ Database | Utils                    │
│  └─────────────────────────────────────┤
├─────────────────────────────────────────┤
│    Native/Platform Layer                │
│  ┌─────────────────────────────────────┤
│  │ React Native API | File System      │
│  │ SQLite | WebRTC Stack               │
│  └─────────────────────────────────────┤
└─────────────────────────────────────────┘
```

**Key Services:**

#### WebRTCService
- Manages RTCPeerConnection lifecycle
- Handles SDP offer/answer
- ICE candidate management
- DataChannel creation and monitoring

```typescript
// Typical flow
const webrtc = new WebRTCService(config);
const pc = await webrtc.createPeerConnection();
const offer = await webrtc.createOffer();
// Send offer via signaling...
await webrtc.setRemoteDescription(answer);
// Connection opens automatically when ICE completes
```

#### SignalingService
- Socket.IO client wrapper
- Event-based architecture
- Automatic reconnection
- Rate limit handling

```typescript
// Typical flow
const signaling = new SignalingService({
  serverUrl: 'https://server.example.com',
  displayName: 'Alice'
});
await signaling.connect();
const roomId = await signaling.createRoom();
// Listen for peer joining...
await signaling.sendOffer(roomId, offer);
```

#### FileTransferService
- Binary chunking with dynamic sizing
- SHA-256 integrity verification
- Progress tracking and ETA calculation
- Pause/resume support

```typescript
// Typical flow
const fileTransfer = new FileTransferService();
fileTransfer.startTransfer(fileId, fileName, fileSize);

// Send init message
const hash = await fileTransfer.computeSha256(filePath);
const buffer = await fileTransfer.readFileAsBuffer(filePath);
const chunks = fileTransfer.createTransferChunks(buffer, chunkSize);

// Send chunks with progress tracking
for (const chunk of chunks) {
  const framed = fileTransfer.createChunkWithHeader(fileId, index, chunk);
  webrtc.sendBinary(framed);
  fileTransfer.updateTransferProgress(fileId, chunk.byteLength);
}
```

#### DatabaseService
- SQLite local storage
- Message persistence
- Settings management
- Room metadata

```typescript
// Typical flow
const db = new DatabaseService();
await db.init();
const messages = await db.getMessagesByRoom(roomId);
await db.saveMessage(message);
await db.updateMessageStatus(messageId, 'delivered');
```

### 3. Shared Types

**Purpose:** Single source of truth for TypeScript types

```typescript
// Connection lifecycle
type ConnectionState = 
  | 'IDLE'           // No active session
  | 'WAITING'        // Room created, awaiting peer
  | 'NEGOTIATING'    // SDP/ICE exchange in progress
  | 'CONNECTED_P2P'  // P2P connection established
  | 'CONNECTED_RELAY'// Using TURN relay
  | 'RECONNECTING'   // Connection dropped, retrying
  | 'FAILED'         // All retries exhausted
  | 'CLOSED';        // User closed

// Message format
interface Message {
  id: string;
  roomId: string;
  senderId: 'local' | 'remote';
  type: 'text' | 'file';
  content: string;
  status: 'sent' | 'delivered' | 'error';
  timestamp: string; // ISO8601
  transferProgress?: number;
}

// File transfer protocol
type FileTransferMessageType =
  | 'TRANSFER_INIT'       // Initiate file transfer
  | 'TRANSFER_ACCEPT'     // Accept incoming file
  | 'TRANSFER_REJECT'     // Reject incoming file
  | 'CHUNK'               // Binary chunk with header
  | 'CHUNK_ACK'           // Acknowledge chunk receipt
  | 'TRANSFER_COMPLETE'   // All chunks sent
  | 'VERIFY_OK'           // SHA-256 verified
  | 'VERIFY_FAIL'         // Hash mismatch
  | 'TRANSFER_PAUSE'      // Pause transfer
  | 'TRANSFER_RESUME'     // Resume from checkpoint
  | 'TRANSFER_ABORT';     // Cancel transfer
```

## Data Flow Diagrams

### Message Send Flow

```
User types message
         ↓
Message input validation
         ↓
Create Message object (sent status)
         ↓
Store in local database
         ↓
Display in chat UI
         ↓
Send via WebRTC DataChannel
         ↓
Receive on peer device
         ↓
Store in peer's database
         ↓
Display in peer's chat UI
         ↓
Send DELIVERED ack
         ↓
Update message status to 'delivered'
```

### File Transfer Flow

```
User selects file
         ↓
Read file + compute SHA-256
         ↓
Create chunks (16KB → 64KB)
         ↓
Send TRANSFER_INIT with metadata
         ↓
Await TRANSFER_ACCEPT
         ↓
Stream chunks with headers
         ↓
Wait for CHUNK_ACKs
         ↓
Adjusting chunk size based on performance
         ↓
Send TRANSFER_COMPLETE
         ↓
Receiver verifies SHA-256
         ↓
Send VERIFY_OK/VERIFY_FAIL
         ↓
Sender updates transfer status
```

### Connection Establishment Flow

```
┌─ Device A (Initiator)      ┌─ Device B (Joiner)
│                             │
├─ User creates room ────────►├─ User joins with code
│                             │
├─ Get room code             ├─ Sends join-room
│                             │
├─ Share code with peer ◄─────├─ Receives peer-joined
│                             │
├─ Create PeerConnection      ├─ Create PeerConnection
│                             │
├─ createOffer() ────────────►├─ setRemoteDescription
│  setLocalDescription        │
│                             ├─ createAnswer()
│                             │  setLocalDescription
│                             │
├◄─────── Answer ────────────┤
│  setRemoteDescription       │
│                             │
├─ Gather ICE candidates ────►├─ Gather ICE candidates
│  Send as discovered        │  Send as discovered
│  addIceCandidate()         │  addIceCandidate()
│                             │
├─────────────────────────────┤
│  ICE Agent attempts:        │
│  1. Host candidates (local) │
│  2. Reflexive (STUN)        │
│  3. Relay (TURN)            │
├─────────────────────────────┤
│                             │
├─ connectionstatechange ────►├─ connectionstatechange
│  'connected'                │  'connected'
│                             │
├─ ondatachannel fired ◄─────┤
│                             │
├─ User can now message ────►├─ Ready for messaging
│                             │
```

## Performance Considerations

### Memory Management

**Target:** < 150 MB RSS on chat screen

**Strategies:**
- Limit message list in memory (virtualization)
- Cleanup file transfer buffers immediately
- Use weak references where possible
- Monitor with Xcode/Android Studio profiler

### Network Optimization

**Target:** > 80% of available bandwidth

**Strategies:**
- Dynamic chunk sizing (16KB → 64KB)
- Batch ACK every 16 chunks for efficiency
- Flow control via DataChannel.bufferedAmount
- Automatic quality adjustment (BOFF)

### Connection Performance

**Target:** < 5 sec p90 connection time

**Optimization:**
- Parallel ICE gathering
- STUN server prioritization
- Aggressive TURN fallback threshold
- Pre-warm DNS for servers

## Security Architecture

### End-to-End Encryption

```
Message from A to B:

A's device ──DTLS 1.2/1.3──► B's device
            (automatic)
            
- Handled by WebRTC spec
- Certificate pinning optional
- No application-level encryption needed
- Perfect forward secrecy included
```

### Room Code Security

```
Room Code: 6 alphanumeric (case-sensitive)

Entropy: 56 billion combinations (2^35.7)

Collision probability:
- 1 hour: ~1 in 10 trillion
- Sufficient for casual use

Defense against:
- Brute force: Rate limiting (10 rooms/min)
- Guessing: 6-char randomness sufficient
- Timing attacks: N/A (codes not used auth)
```

### Data Security

```
In Transit:
├─ Signaling: TLS 1.2+
├─ P2P Data: DTLS 1.2/1.3
└─ File Hashes: SHA-256 verification

At Rest:
├─ Messages: SQLite (device-only)
├─ Credentials: Keychain/Keystore
└─ Keys: Handled by OS + WebRTC

Never:
├─ Messages logged on server
├─ File hashes transmitted insecurely
├─ Credentials stored in plaintext
└─ Analytics of user data
```

## Deployment Architecture

### Single Instance

```
                    ┌──────────────┐
                    │ Mobile App   │
                    │ (iOS/Android)│
                    └────────┬─────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Signaling       │
                    │  Server          │
                    │  (Node.js)       │
                    │  - 1 instance    │
                    │  - No Redis      │
                    │  - In-memory     │
                    └──────────────────┘
```

### Multi-Instance (Scaled)

```
┌─ Mobile Apps (iOS/Android)
│
├─ Load Balancer
│  ├─ Sticky sessions (Socket.IO)
│  └─ Health checks
│
├─ Signaling Server Cluster
│  ├─ Instance 1
│  ├─ Instance 2
│  └─ Instance N
│
└─ Redis Cluster
   ├─ Socket.IO adapter
   ├─ Room state sync
   └─ Session store
```

## Monitoring & Observability

### Key Metrics

```typescript
interface MetricsEvent {
  // Connection
  connectionTime: number;          // ms
  iceType: 'P2P' | 'TURN' | 'FAILED';
  iceRestarts: number;
  
  // Messages
  messageLatency: number;          // ms
  messageDeliveryRate: number;     // %
  
  // Files
  transferThroughput: number;      // bytes/sec
  transferSuccessRate: number;     // %
  
  // System
  cpuUsage: number;                // %
  memoryUsage: number;             // MB
  batteryDrain: number;            // %/hour
}
```

### Observability Stack

**Server:**
- Structured logging (Winston/Pino)
- Error tracking (Sentry optional)
- Metrics (Prometheus optional)

**Client:**
- Console logs (dev only)
- Analytics (optional, no content)
- Performance monitoring (React Profiler)

## Future Enhancements

### Phase 2 (v1.1)
- [ ] Message search
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Custom emojis

### Phase 3 (v2.0)
- [ ] Group chat (mesh)
- [ ] Voice calls
- [ ] Video calls
- [ ] Screen sharing

### Phase 4 (v3.0)
- [ ] Desktop clients
- [ ] Cloud message backup
- [ ] E2E encryption (additional layer)
- [ ] Token-based auth

---

For questions about architecture, see [CONTRIBUTING.md](../CONTRIBUTING.md) or open a GitHub Discussion.
