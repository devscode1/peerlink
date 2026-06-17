# Requirements Document

## Introduction

PeerLink Mobile is a React Native application for Android that enables two mobile devices to establish a direct, encrypted, peer-to-peer communication channel using WebRTC DataChannels. The application provides real-time text messaging and large file transfer capabilities without routing user data through central servers. A lightweight signaling server is used only for connection bootstrapping, while all user data is transmitted directly between peers with end-to-end encryption via DTLS.

The system supports room-based pairing with 6-character codes, file transfers up to 4 GB with chunking and integrity verification, and automatic NAT traversal using STUN/TURN servers. All messages are stored locally, and the application works across different network topologies including cellular, Wi-Fi, and mixed-carrier environments.

## Glossary

- **PeerLink_App**: The React Native mobile application running on Android devices
- **WebRTC_Engine**: The react-native-webrtc library providing DataChannel, ICE, and DTLS functionality
- **DataChannel**: The WebRTC API for arbitrary binary or text data transfer between peers
- **Signaling_Server**: The Node.js + Socket.IO backend that relays SDP and ICE messages during connection establishment
- **STUN_Server**: Session Traversal Utilities for NAT server that helps devices discover their public IP addresses
- **TURN_Server**: Traversal Using Relays around NAT relay server used when direct P2P is blocked
- **Room_Code**: A unique 6-character alphanumeric identifier used to pair two devices
- **ICE_Agent**: Interactive Connectivity Establishment process that finds the best network path between peers
- **Message_Store**: SQLite database storing chat message history locally on the device
- **File_Transfer_Engine**: Component managing chunked file transmission, progress tracking, and integrity verification
- **Connection_Manager**: Component managing WebRTC peer connection lifecycle and state transitions
- **Chunk**: A binary fragment of a file, sized between 16 KB and 64 KB for transmission
- **SHA256_Hash**: Cryptographic hash function used to verify file integrity after transfer
- **P2P_Connection**: Direct peer-to-peer network path between devices without intermediary servers
- **Relay_Connection**: Connection routed through TURN server when direct P2P is impossible
- **SDP**: Session Description Protocol text format describing peer capabilities
- **Local_Device**: The device running the current instance of PeerLink_App
- **Remote_Device**: The peer device connected via DataChannel

## Requirements

### Requirement 1: Room Creation and Code Generation

**User Story:** As a user, I want to create a room and receive a unique code, so that my peer can join and connect to me.

#### Acceptance Criteria

1. WHEN the user taps "Create Room", THE Connection_Manager SHALL generate a room request to Signaling_Server within 500 milliseconds
2. WHEN Signaling_Server receives a room creation request, THE Signaling_Server SHALL generate a unique 6-character alphanumeric Room_Code
3. THE Room_Code SHALL contain characters from the set [A-Z, a-z, 0-9] with case sensitivity enabled
4. WHEN Room_Code is generated, THE Signaling_Server SHALL create a Socket.IO room and respond to Local_Device within 200 milliseconds
5. WHEN Local_Device receives Room_Code, THE PeerLink_App SHALL display the code prominently on the waiting screen
6. THE Signaling_Server SHALL mark the room as expired after 10 minutes of inactivity

### Requirement 2: Room Joining and Connection Initiation

**User Story:** As a user, I want to enter a room code and connect to the room creator, so that we can establish a peer-to-peer channel.

#### Acceptance Criteria

1. WHEN the user enters a 6-character code and taps "Join Room", THE Connection_Manager SHALL send a join request to Signaling_Server
2. IF the Room_Code does not exist or has expired, THEN THE Signaling_Server SHALL respond with a "room-not-found" error
3. IF the room already contains 2 peers, THEN THE Signaling_Server SHALL respond with a "room-full" error
4. WHEN a valid join occurs, THE Signaling_Server SHALL emit a "peer-joined" event to both Local_Device and Remote_Device
5. WHEN "peer-joined" is received, THE Connection_Manager SHALL update the connection state to NEGOTIATING
6. THE PeerLink_App SHALL display appropriate error messages for "room-not-found" and "room-full" scenarios

### Requirement 3: WebRTC Offer and Answer Exchange

**User Story:** As the room creator, I want to automatically initiate the WebRTC handshake when a peer joins, so that the connection can be established without manual intervention.

#### Acceptance Criteria

1. WHEN the room creator receives "peer-joined" event, THE Connection_Manager SHALL create an RTCPeerConnection instance
2. WHEN RTCPeerConnection is created, THE Connection_Manager SHALL create a DataChannel with label "peerlink-data"
3. WHEN DataChannel is created, THE Connection_Manager SHALL call createOffer() on the RTCPeerConnection
4. WHEN the SDP offer is generated, THE Connection_Manager SHALL set it as the local description
5. WHEN local description is set, THE Connection_Manager SHALL send the SDP offer to Signaling_Server with the Room_Code
6. WHEN Signaling_Server receives an SDP offer, THE Signaling_Server SHALL relay it to Remote_Device within 100 milliseconds
7. WHEN the room joiner receives an SDP offer, THE Connection_Manager SHALL create an RTCPeerConnection instance
8. WHEN RTCPeerConnection receives the remote offer, THE Connection_Manager SHALL set it as the remote description
9. WHEN remote description is set, THE Connection_Manager SHALL call createAnswer() and set the resulting SDP as local description
10. WHEN the SDP answer is generated, THE Connection_Manager SHALL send it to Signaling_Server for relay to the room creator

### Requirement 4: ICE Candidate Exchange and NAT Traversal

**User Story:** As a user, I want the application to automatically discover the best network path to my peer, so that I can connect across different network types without configuration.

#### Acceptance Criteria

1. WHEN RTCPeerConnection begins ICE gathering, THE ICE_Agent SHALL generate ICE candidates for host, reflexive, and relay addresses
2. WHEN an ICE candidate is gathered, THE Connection_Manager SHALL emit it to Signaling_Server within 50 milliseconds
3. WHEN Signaling_Server receives an ICE candidate, THE Signaling_Server SHALL relay it to Remote_Device immediately
4. WHEN Connection_Manager receives a remote ICE candidate, THE Connection_Manager SHALL add it to RTCPeerConnection via addIceCandidate()
5. THE ICE_Agent SHALL attempt connection establishment in the order: host candidates, then STUN reflexive candidates, then TURN relay candidates
6. THE Connection_Manager SHALL configure ICE servers with at least one STUN_Server (stun.l.google.com:19302)
7. WHERE TURN_Server credentials are configured, THE Connection_Manager SHALL include TURN_Server in the ICE server configuration
8. WHEN ICE connection state becomes "connected" or "completed", THE Connection_Manager SHALL transition to CONNECTED_P2P or CONNECTED_RELAY state based on the selected candidate pair type

### Requirement 5: DataChannel Establishment and State Management

**User Story:** As a user, I want to know when the peer-to-peer connection is fully established, so that I can begin sending messages and files.

#### Acceptance Criteria

1. WHEN ICE completes successfully, THE DataChannel SHALL fire an "open" event on both Local_Device and Remote_Device
2. WHEN DataChannel "open" event fires, THE Connection_Manager SHALL transition to CONNECTED_P2P state if using direct connection
3. WHEN DataChannel "open" event fires, THE Connection_Manager SHALL transition to CONNECTED_RELAY state if using TURN relay
4. WHEN connection state becomes CONNECTED_P2P or CONNECTED_RELAY, THE PeerLink_App SHALL display "Connected" status to the user
5. WHEN connection state is CONNECTED_P2P, THE PeerLink_App SHALL indicate "Direct Connection" in the status indicator
6. WHEN connection state is CONNECTED_RELAY, THE PeerLink_App SHALL indicate "Relay Connection" in the status indicator
7. WHEN DataChannel fires "error" event, THE Connection_Manager SHALL log the error and transition to FAILED state
8. WHEN DataChannel fires "close" event, THE Connection_Manager SHALL transition to CLOSED state and clean up RTCPeerConnection resources

### Requirement 6: Connection Performance and Timing

**User Story:** As a user, I want the connection to establish quickly, so that I can start communicating without long waits.

#### Acceptance Criteria

1. THE Connection_Manager SHALL establish DataChannel connection within 5 seconds at the 90th percentile on LTE networks
2. THE Connection_Manager SHALL measure connection time from room join acknowledgment to DataChannel "open" event
3. WHEN connection time exceeds 10 seconds, THE PeerLink_App SHALL display a "Connection is taking longer than expected" message
4. THE Connection_Manager SHALL emit telemetry events for connection timing to enable performance monitoring

### Requirement 7: Text Message Transmission

**User Story:** As a user, I want to send text messages that appear instantly on my peer's device, so that we can have real-time conversations.

#### Acceptance Criteria

1. WHEN the user submits a text message, THE PeerLink_App SHALL display the message in the local chat view within 50 milliseconds
2. WHEN a message is displayed locally, THE Connection_Manager SHALL send the message over DataChannel as a JSON payload
3. THE message payload SHALL include fields: messageId (UUID), senderId, type ("text"), content, timestamp (ISO8601)
4. WHEN Remote_Device receives a message, THE PeerLink_App SHALL display it in the chat view within 100 milliseconds of receipt
5. THE Connection_Manager SHALL support text messages up to 100,000 characters in length
6. WHEN a message exceeds the DataChannel send buffer limit, THE Connection_Manager SHALL fragment it into multiple sends and reassemble on receipt
7. WHEN DataChannel message send fails, THE Connection_Manager SHALL mark the message status as "error" and display a retry option

### Requirement 8: Message Persistence and History

**User Story:** As a user, I want my message history to persist after closing the app, so that I can review past conversations.

#### Acceptance Criteria

1. WHEN a message is sent or received, THE Message_Store SHALL save it to the local SQLite database
2. THE Message_Store SHALL store messages with fields: id (UUID), roomId, senderId, type, content, fileName, fileSize, fileMimeType, filePath, status, timestamp
3. WHEN the user opens a chat session, THE PeerLink_App SHALL load message history from Message_Store before establishing a new connection
4. THE Message_Store SHALL support retrieval of messages by roomId in chronological order
5. WHEN the user requests to clear history, THE Message_Store SHALL delete all messages for the specified roomId
6. THE Message_Store SHALL implement an index on roomId and timestamp for efficient query performance

### Requirement 9: Message Timestamps and Formatting

**User Story:** As a user, I want messages to show when they were sent, so that I can understand the conversation timeline.

#### Acceptance Criteria

1. WHEN a message is displayed, THE PeerLink_App SHALL show the time in HH:MM format for messages sent today
2. WHEN a message is displayed, THE PeerLink_App SHALL show the date and time in "MMM DD, HH:MM" format for messages older than today
3. THE PeerLink_App SHALL use the device's local timezone for all timestamp displays
4. WHEN messages are stored, THE Message_Store SHALL store timestamps in UTC ISO8601 format
5. THE PeerLink_App SHALL group messages by date with date separator headers in the chat view

### Requirement 10: File Selection and Metadata Extraction

**User Story:** As a user, I want to select any file from my device to send to my peer, so that I can share documents, photos, videos, and other content.

#### Acceptance Criteria

1. WHEN the user taps the attach button, THE PeerLink_App SHALL open the system file picker
2. THE PeerLink_App SHALL allow selection of any file type without MIME type restrictions
3. WHEN a file is selected, THE File_Transfer_Engine SHALL extract metadata: fileName, fileSize, mimeType, and file path
4. WHEN a file larger than 4 GB is selected, THE PeerLink_App SHALL display an error message "File size exceeds 4 GB limit"
5. WHEN file metadata is extracted, THE PeerLink_App SHALL display a preview screen showing fileName, fileSize, and file type icon
6. THE preview screen SHALL include "Send" and "Cancel" buttons for user confirmation

### Requirement 11: File Hash Computation

**User Story:** As a user, I want sent files to be verified for integrity, so that I can trust the received file is not corrupted.

#### Acceptance Criteria

1. WHEN the user confirms file send, THE File_Transfer_Engine SHALL compute the SHA256_Hash of the entire file
2. THE File_Transfer_Engine SHALL compute the hash by reading the file in 1 MB blocks to avoid loading the entire file into memory
3. WHEN hash computation is complete, THE File_Transfer_Engine SHALL store the hash value for transmission with file metadata
4. THE File_Transfer_Engine SHALL compute the hash on a background thread to prevent UI blocking
5. WHEN hash computation fails due to file read error, THE PeerLink_App SHALL display an error message and cancel the transfer

### Requirement 12: File Transfer Initialization Protocol

**User Story:** As a sender, I want to notify my peer about an incoming file before starting transmission, so that they can accept or reject it.

#### Acceptance Criteria

1. WHEN file send is initiated, THE File_Transfer_Engine SHALL generate a unique fileId (UUID)
2. WHEN fileId is generated, THE File_Transfer_Engine SHALL send a TRANSFER_INIT message over DataChannel
3. THE TRANSFER_INIT message SHALL include: type ("TRANSFER_INIT"), fileId, fileName, fileSize, mimeType, chunkSize, totalChunks, sha256
4. WHEN Remote_Device receives TRANSFER_INIT, THE File_Transfer_Engine SHALL check available storage space
5. IF available storage is less than fileSize, THEN THE File_Transfer_Engine SHALL send TRANSFER_REJECT message with reason "insufficient_storage"
6. IF available storage is sufficient, THEN THE File_Transfer_Engine SHALL send TRANSFER_ACCEPT message and prepare to receive chunks
7. WHEN Local_Device receives TRANSFER_ACCEPT, THE File_Transfer_Engine SHALL begin chunk transmission
8. WHEN Local_Device receives TRANSFER_REJECT, THE PeerLink_App SHALL display the rejection reason and cancel the transfer

### Requirement 13: File Chunking and Transmission

**User Story:** As a sender, I want large files to be sent in manageable pieces, so that the transfer can handle network variability and memory constraints.

#### Acceptance Criteria

1. THE File_Transfer_Engine SHALL divide files into Chunks with an initial size of 16 KB
2. WHEN network throughput is stable for 5 consecutive chunks, THE File_Transfer_Engine SHALL increase chunk size to 32 KB
3. WHEN network throughput is stable at 32 KB for 10 consecutive chunks, THE File_Transfer_Engine SHALL increase chunk size to 64 KB
4. WHEN DataChannel bufferedAmount exceeds bufferedAmountLowThreshold, THE File_Transfer_Engine SHALL pause chunk transmission until buffer drains
5. THE File_Transfer_Engine SHALL set bufferedAmountLowThreshold to 256 KB
6. WHEN a chunk is sent, THE File_Transfer_Engine SHALL prefix it with an 8-byte header containing fileId (4 bytes) and chunkIndex (4 bytes)
7. THE File_Transfer_Engine SHALL read file chunks from disk using streaming I/O to avoid loading the entire file into memory
8. WHEN chunk transmission fails due to DataChannel error, THE File_Transfer_Engine SHALL pause the transfer and wait for connection recovery

### Requirement 14: File Transfer Progress Tracking

**User Story:** As a user, I want to see real-time progress of file transfers, so that I know how long the transfer will take.

#### Acceptance Criteria

1. WHEN a chunk is successfully sent, THE File_Transfer_Engine SHALL update the transfer progress percentage
2. THE PeerLink_App SHALL display a progress bar updated at least once every 500 milliseconds
3. THE PeerLink_App SHALL display current transfer speed in MB/s
4. THE PeerLink_App SHALL display estimated time remaining (ETA) based on current transfer speed
5. THE File_Transfer_Engine SHALL calculate transfer speed using a rolling average of the last 10 chunks
6. WHEN transfer progress updates, THE Message_Store SHALL persist the current chunk index and transfer state

### Requirement 15: File Transfer Flow Control with Acknowledgments

**User Story:** As a sender, I want the receiver to acknowledge chunks, so that I can confirm successful transmission and manage network congestion.

#### Acceptance Criteria

1. WHEN the receiver successfully writes 16 consecutive chunks to disk, THE File_Transfer_Engine SHALL send a CHUNK_ACK message to the sender
2. THE CHUNK_ACK message SHALL include: type ("CHUNK_ACK"), fileId, lastAckedChunkIndex
3. WHEN the sender receives CHUNK_ACK, THE File_Transfer_Engine SHALL update the confirmed progress marker
4. WHERE transfer is paused or interrupted, THE File_Transfer_Engine SHALL use the lastAckedChunkIndex as the resume point
5. WHEN sender does not receive CHUNK_ACK within 30 seconds of sending a chunk batch, THE File_Transfer_Engine SHALL pause transmission and display "Waiting for peer" status

### Requirement 16: File Transfer Pause and Resume

**User Story:** As a user, I want to pause and resume large file transfers, so that I can manage bandwidth or respond to interruptions without restarting.

#### Acceptance Criteria

1. WHEN the user taps "Pause", THE File_Transfer_Engine SHALL stop reading and sending new chunks
2. WHEN pause is initiated, THE File_Transfer_Engine SHALL send a TRANSFER_PAUSE message with the current chunk index
3. WHEN Remote_Device receives TRANSFER_PAUSE, THE File_Transfer_Engine SHALL stop expecting new chunks and display "Paused by sender" status
4. WHEN the user taps "Resume", THE File_Transfer_Engine SHALL send a TRANSFER_RESUME message with lastAckedChunkIndex
5. WHEN sender receives TRANSFER_RESUME, THE File_Transfer_Engine SHALL restart transmission from lastAckedChunkIndex + 1
6. WHEN connection drops during transfer, THE File_Transfer_Engine SHALL automatically pause and attempt to resume after reconnection
7. WHEN resume after reconnection succeeds, THE File_Transfer_Engine SHALL continue from lastAckedChunkIndex without user intervention

### Requirement 17: File Transfer Cancellation

**User Story:** As a user, I want to cancel an in-progress file transfer, so that I can stop unwanted transfers and free up resources.

#### Acceptance Criteria

1. WHEN the user taps "Cancel", THE File_Transfer_Engine SHALL stop all chunk transmission immediately
2. WHEN cancel is initiated, THE File_Transfer_Engine SHALL send a TRANSFER_ABORT message with fileId and reason
3. WHEN Remote_Device receives TRANSFER_ABORT, THE File_Transfer_Engine SHALL stop receiving chunks
4. WHEN transfer is aborted, THE File_Transfer_Engine SHALL delete the partial file from the receiver's storage
5. WHEN transfer is aborted, THE Message_Store SHALL update the message status to "cancelled"
6. THE PeerLink_App SHALL display "Transfer cancelled" notification to both sender and receiver

### Requirement 18: File Transfer Completion and Verification

**User Story:** As a receiver, I want to verify that received files are complete and uncorrupted, so that I can trust the file integrity.

#### Acceptance Criteria

1. WHEN all chunks are received, THE File_Transfer_Engine SHALL send a TRANSFER_COMPLETE message to the sender
2. WHEN TRANSFER_COMPLETE is received, THE sender SHALL stop monitoring for acknowledgments
3. WHEN all chunks are written to disk, THE File_Transfer_Engine SHALL compute the SHA256_Hash of the received file
4. WHEN hash computation is complete, THE File_Transfer_Engine SHALL compare it to the hash received in TRANSFER_INIT
5. IF hashes match, THEN THE File_Transfer_Engine SHALL send VERIFY_OK message and mark transfer as successful
6. IF hashes do not match, THEN THE File_Transfer_Engine SHALL send VERIFY_FAIL message and mark transfer as failed
7. WHEN VERIFY_FAIL is received, THE PeerLink_App SHALL display "File verification failed" error and offer a retry option
8. WHEN verification succeeds, THE File_Transfer_Engine SHALL automatically retry the transfer once before surfacing the error to the user

### Requirement 19: File Storage on Device

**User Story:** As a receiver, I want files saved to appropriate locations on my device, so that I can access them after the transfer completes.

#### Acceptance Criteria

1. WHEN a file with mimeType starting with "image/" or "video/" is received, THE PeerLink_App SHALL save it to the device media library
2. WHEN a file with any other mimeType is received, THE PeerLink_App SHALL save it to the app's Documents folder
3. WHEN a file is saved successfully, THE PeerLink_App SHALL display a notification "File saved to [location]"
4. WHEN file save fails due to permission error, THE PeerLink_App SHALL request storage permission and retry
5. WHEN file save fails due to insufficient storage, THE PeerLink_App SHALL display "Insufficient storage space" error
6. THE PeerLink_App SHALL store the saved file path in Message_Store for future reference

### Requirement 20: File Transfer Performance

**User Story:** As a user, I want file transfers to use available bandwidth efficiently, so that transfers complete as quickly as possible.

#### Acceptance Criteria

1. THE File_Transfer_Engine SHALL achieve at least 80% of available link bandwidth during stable transfers
2. THE File_Transfer_Engine SHALL measure bandwidth utilization by comparing actual throughput to device speed test results
3. WHEN bandwidth utilization falls below 60% for 10 consecutive seconds, THE File_Transfer_Engine SHALL log a performance warning
4. THE File_Transfer_Engine SHALL adapt chunk size dynamically based on DataChannel buffer pressure to maximize throughput

### Requirement 21: Connection State Visualization

**User Story:** As a user, I want to see the current connection status, so that I understand whether I'm connected and what type of connection I have.

#### Acceptance Criteria

1. THE PeerLink_App SHALL display connection state using distinct visual indicators for each state: IDLE, WAITING, NEGOTIATING, CONNECTED_P2P, CONNECTED_RELAY, RECONNECTING, FAILED, CLOSED
2. WHEN state is WAITING, THE PeerLink_App SHALL display the Room_Code and "Waiting for peer to join" message
3. WHEN state is NEGOTIATING, THE PeerLink_App SHALL display an animated "Connecting..." indicator
4. WHEN state is CONNECTED_P2P, THE PeerLink_App SHALL display a green indicator with "Connected (Direct)" label
5. WHEN state is CONNECTED_RELAY, THE PeerLink_App SHALL display a yellow indicator with "Connected (Relay)" label
6. WHEN state is RECONNECTING, THE PeerLink_App SHALL display "Reconnecting..." with attempt counter
7. WHEN state is FAILED, THE PeerLink_App SHALL display "Connection Failed" with a "Retry" button
8. WHEN state is CLOSED, THE PeerLink_App SHALL return to the home screen

### Requirement 22: Automatic Reconnection

**User Story:** As a user, I want the application to automatically reconnect if the connection drops briefly, so that I don't have to manually restart the connection.

#### Acceptance Criteria

1. WHEN ICE connection state changes to "disconnected", THE Connection_Manager SHALL transition to RECONNECTING state
2. WHEN in RECONNECTING state, THE Connection_Manager SHALL initiate ICE restart on the existing RTCPeerConnection
3. THE Connection_Manager SHALL attempt ICE restart with exponential backoff: 1 second, 2 seconds, 4 seconds
4. THE Connection_Manager SHALL make a maximum of 3 reconnection attempts before transitioning to FAILED state
5. WHEN ICE restart succeeds and DataChannel reopens, THE Connection_Manager SHALL transition back to CONNECTED_P2P or CONNECTED_RELAY state
6. WHEN all reconnection attempts fail, THE PeerLink_App SHALL display "Connection Lost" with a manual "Reconnect" button

### Requirement 23: Manual Disconnection

**User Story:** As a user, I want to manually disconnect from my peer, so that I can end the session when I'm finished.

#### Acceptance Criteria

1. WHEN the user taps "Disconnect", THE Connection_Manager SHALL close the DataChannel
2. WHEN DataChannel is closed, THE Connection_Manager SHALL close the RTCPeerConnection
3. WHEN RTCPeerConnection is closed, THE Connection_Manager SHALL disconnect from Signaling_Server Socket.IO connection
4. WHEN disconnection is complete, THE Connection_Manager SHALL transition to CLOSED state
5. WHEN CLOSED state is reached, THE PeerLink_App SHALL navigate to the home screen
6. THE Connection_Manager SHALL clean up all connection resources including event listeners and timers

### Requirement 24: Signaling Server Room Management

**User Story:** As the signaling infrastructure, I want to manage room lifecycle efficiently, so that resources are not leaked and rooms are available for new connections.

#### Acceptance Criteria

1. WHEN a room is created, THE Signaling_Server SHALL store it in memory with a timestamp
2. WHEN both peers disconnect from a room, THE Signaling_Server SHALL delete the room immediately
3. WHEN a room has no activity for 10 minutes, THE Signaling_Server SHALL delete the room automatically
4. THE Signaling_Server SHALL run a cleanup job every 60 seconds to remove expired rooms
5. WHEN a peer disconnects, THE Signaling_Server SHALL emit "peer-disconnected" event to the remaining peer
6. THE Signaling_Server SHALL limit room creation to 10 requests per IP address per minute to prevent abuse

### Requirement 25: Signaling Message Relay

**User Story:** As the signaling infrastructure, I want to relay SDP and ICE messages between peers, so that they can establish a direct connection.

#### Acceptance Criteria

1. WHEN Signaling_Server receives an "offer" event, THE Signaling_Server SHALL relay it to the other peer in the room within 100 milliseconds
2. WHEN Signaling_Server receives an "answer" event, THE Signaling_Server SHALL relay it to the room creator within 100 milliseconds
3. WHEN Signaling_Server receives an "ice-candidate" event, THE Signaling_Server SHALL relay it to the other peer immediately
4. THE Signaling_Server SHALL limit ICE candidate relay to 30 candidates per second per room to prevent flooding
5. THE Signaling_Server SHALL not log, store, or inspect the content of SDP payloads beyond routing them
6. WHEN relay fails because the target peer is not connected, THE Signaling_Server SHALL emit a "peer-disconnected" event to the sender

### Requirement 26: Signaling Server Scalability

**User Story:** As the signaling infrastructure, I want to scale horizontally, so that I can handle many concurrent rooms.

#### Acceptance Criteria

1. THE Signaling_Server SHALL use Socket.IO with Redis adapter for multi-instance deployment
2. WHEN using Redis adapter, THE Signaling_Server SHALL store room membership in Redis for cross-instance visibility
3. THE Signaling_Server SHALL provide a health check endpoint at GET /health returning JSON with status, active rooms count, and connections count
4. WHEN the server starts, THE Signaling_Server SHALL log the Node.js version, Socket.IO version, and listening port
5. THE Signaling_Server SHALL handle at least 1000 concurrent Socket.IO connections per instance

### Requirement 27: TURN Server Integration

**User Story:** As a user behind a symmetric NAT or restrictive firewall, I want connections to fall back to a relay server, so that I can still connect when direct P2P is impossible.

#### Acceptance Criteria

1. WHERE TURN_Server is configured in settings, THE Connection_Manager SHALL include TURN server URLs in ICE server configuration
2. THE Connection_Manager SHALL support TURN server authentication using username and credential fields
3. WHEN ICE gathering includes TURN candidates, THE ICE_Agent SHALL attempt relay connection after direct and reflexive candidates fail
4. WHEN connection is established via TURN relay, THE Connection_Manager SHALL detect this by inspecting the selected ICE candidate pair type
5. THE PeerLink_App SHALL allow users to configure custom TURN server URL, username, and credential in settings
6. WHERE no TURN_Server is configured, THE Connection_Manager SHALL still attempt connection using STUN and host candidates only

### Requirement 28: End-to-End Encryption

**User Story:** As a user, I want all my messages and files to be encrypted, so that my communications are private.

#### Acceptance Criteria

1. THE WebRTC_Engine SHALL use DTLS 1.2 or DTLS 1.3 for all DataChannel communications as per WebRTC specification
2. THE Connection_Manager SHALL verify that DTLS is active by checking the dtlsState of RTCPeerConnection
3. IF DTLS fails to establish, THEN THE Connection_Manager SHALL not allow DataChannel communication and SHALL display "Secure connection failed" error
4. THE PeerLink_App SHALL not provide any option to disable encryption
5. THE Signaling_Server SHALL use WSS (WebSocket Secure) protocol for all signaling communication in production deployments

### Requirement 29: Privacy and Data Handling

**User Story:** As a privacy-conscious user, I want assurance that my data is never stored on servers, so that I maintain control over my communications.

#### Acceptance Criteria

1. THE Signaling_Server SHALL not log, store, or persist any user message content or file data
2. THE Signaling_Server SHALL not log SDP offer/answer payloads beyond basic routing metadata
3. THE Signaling_Server SHALL store room codes in memory only and SHALL delete them when rooms are closed or expired
4. THE PeerLink_App SHALL not transmit message content or file data to any server other than the connected peer
5. THE PeerLink_App SHALL not include analytics or telemetry that transmits message content or file metadata to third parties
6. THE Message_Store SHALL store all data locally on the device with no cloud synchronization

### Requirement 30: Android Platform Requirements

**User Story:** As an Android user, I want the application to work properly on my device, so that I can use all features without compatibility issues.

#### Acceptance Criteria

1. THE PeerLink_App SHALL support Android 10 (API level 29) and higher
2. THE PeerLink_App SHALL request and handle the READ_EXTERNAL_STORAGE permission for file selection on Android 10-12
3. THE PeerLink_App SHALL use the Storage Access Framework for file selection on Android 13+ without requiring storage permissions
4. THE PeerLink_App SHALL request WRITE_EXTERNAL_STORAGE permission for saving files to media library on Android 10-12
5. WHEN the app is backgrounded during file transfer, THE PeerLink_App SHALL maintain the DataChannel connection using a foreground service
6. THE PeerLink_App SHALL display a persistent notification while a file transfer is in progress when in background
7. THE PeerLink_App SHALL target Android 14 (API level 34) as the target SDK version

### Requirement 31: User Interface and Navigation

**User Story:** As a user, I want a clear and intuitive interface, so that I can easily navigate and use the application.

#### Acceptance Criteria

1. THE PeerLink_App SHALL provide a home screen with "Create Room" and "Join Room" buttons prominently displayed
2. WHEN the user taps "Create Room", THE PeerLink_App SHALL navigate to a waiting screen showing the Room_Code
3. WHEN the user taps "Join Room", THE PeerLink_App SHALL display a 6-character input field and "Connect" button
4. WHEN DataChannel opens, THE PeerLink_App SHALL navigate to the chat screen automatically
5. THE chat screen SHALL include: scrollable message list, text input field, send button, attach file button, connection status indicator, and disconnect button
6. WHEN file transfer is in progress, THE PeerLink_App SHALL show a transfer progress modal or bottom sheet
7. THE PeerLink_App SHALL provide a settings screen accessible from the home screen with TURN configuration and history management
8. THE PeerLink_App SHALL use React Navigation for screen routing with proper back button handling

### Requirement 32: Dark Mode Support

**User Story:** As a user, I want the app to support dark mode, so that I can use it comfortably in low-light conditions.

#### Acceptance Criteria

1. THE PeerLink_App SHALL detect the system dark mode preference on Android
2. WHEN system dark mode is enabled, THE PeerLink_App SHALL apply a dark color scheme to all screens
3. THE dark color scheme SHALL use appropriate contrast ratios meeting WCAG AA standards for text and interactive elements
4. THE PeerLink_App SHALL update the theme dynamically when the system preference changes without requiring app restart
5. THE PeerLink_App SHALL persist the theme preference in local storage for consistency across app launches

### Requirement 33: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what I can do about it.

#### Acceptance Criteria

1. WHEN an error occurs, THE PeerLink_App SHALL display a user-friendly error message describing the problem
2. WHEN connection fails during negotiation, THE PeerLink_App SHALL display "Connection failed. Please check your internet connection and try again."
3. WHEN file transfer fails due to network error, THE PeerLink_App SHALL display "Transfer interrupted. Tap Resume to continue."
4. WHEN hash verification fails, THE PeerLink_App SHALL display "File verification failed. The file may be corrupted. Retry transfer?"
5. WHEN signaling server is unreachable, THE PeerLink_App SHALL display "Unable to reach signaling server. Please check your connection."
6. THE PeerLink_App SHALL log errors to the console in development mode for debugging
7. THE PeerLink_App SHALL display toast notifications for non-critical events like "Message sent", "File saved", "Peer disconnected"

### Requirement 34: Performance and Resource Management

**User Story:** As a user, I want the app to run smoothly without draining my battery or using excessive resources.

#### Acceptance Criteria

1. THE PeerLink_App SHALL achieve cold start time of less than 2 seconds to the home screen on mid-range Android devices
2. THE PeerLink_App SHALL maintain at least 55 FPS in the chat screen during active file transfers
3. WHILE idle with connection established, THE PeerLink_App SHALL consume less than 2% battery per hour
4. THE PeerLink_App SHALL limit memory usage to less than 150 MB RSS during chat screen operation
5. THE File_Transfer_Engine SHALL release file handles and memory buffers immediately after transfer completion or cancellation
6. THE Connection_Manager SHALL remove all event listeners and timers when transitioning to CLOSED state

### Requirement 35: Configuration and Settings Management

**User Story:** As a user, I want to configure connection settings, so that I can optimize the application for my network environment.

#### Acceptance Criteria

1. THE PeerLink_App SHALL provide a settings screen with configurable TURN server URL, username, and credential fields
2. WHEN TURN settings are updated, THE PeerLink_App SHALL validate the URL format before saving
3. WHEN TURN settings are saved, THE PeerLink_App SHALL persist them to local storage
4. THE PeerLink_App SHALL load TURN settings from storage on app launch and apply them to new connections
5. THE settings screen SHALL include a "Clear Message History" button that deletes all stored messages
6. THE settings screen SHALL include an "About" section displaying app version, WebRTC version, and open source licenses
7. THE settings screen SHALL include a "Test TURN Connection" button that verifies TURN server reachability

### Requirement 36: Message Latency Performance

**User Story:** As a user, I want messages to be delivered almost instantly, so that conversations feel natural and real-time.

#### Acceptance Criteria

1. THE Connection_Manager SHALL deliver text messages with less than 100 milliseconds latency at the 95th percentile for peers in the same geographic region
2. THE Connection_Manager SHALL measure message latency from send invocation to receipt on Remote_Device
3. WHEN message latency exceeds 500 milliseconds for 3 consecutive messages, THE PeerLink_App SHALL display a "Poor connection" indicator
4. THE Connection_Manager SHALL prioritize text messages over file transfer chunks when both are queued for transmission

### Requirement 37: WebRTC Library Configuration

**User Story:** As a developer, I want the WebRTC library properly configured, so that the application has reliable peer-to-peer connectivity.

#### Acceptance Criteria

1. THE PeerLink_App SHALL use react-native-webrtc version 118.0.0 or higher for Android 10+ compatibility
2. THE Connection_Manager SHALL configure RTCPeerConnection with iceServers array containing at least one STUN server
3. THE Connection_Manager SHALL set iceCandidatePoolSize to 10 for faster ICE gathering
4. THE Connection_Manager SHALL enable unified plan SDP semantics (default in modern WebRTC)
5. THE DataChannel SHALL be created with ordered: true and maxRetransmits: undefined for reliable in-order delivery
6. THE Connection_Manager SHALL configure DataChannel with bufferedAmountLowThreshold of 256 KB
7. THE Connection_Manager SHALL set RTCPeerConnection iceTransportPolicy to "all" to allow both STUN and TURN candidates

### Requirement 38: State Management Architecture

**User Story:** As a developer, I want clear state management, so that the application behavior is predictable and maintainable.

#### Acceptance Criteria

1. THE PeerLink_App SHALL use Zustand for managing connection state, message list, and transfer queue
2. THE connection store SHALL maintain state fields: connectionState, roomId, peerId, peerDisplayName, localDisplayName, iceConnectionState
3. THE message store SHALL maintain state fields: messages array, unreadCount, isLoading
4. THE transfer store SHALL maintain state fields: activeTransfers map, transferProgress map, transferSpeed map
5. THE PeerLink_App SHALL persist connection state to AsyncStorage to handle app backgrounding on Android
6. STATE transitions SHALL be atomic and logged for debugging in development mode

### Requirement 39: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive test coverage, so that I can ensure reliability and catch regressions.

#### Acceptance Criteria

1. THE File_Transfer_Engine SHALL have unit tests verifying chunk size adaptation logic
2. THE Connection_Manager SHALL have unit tests verifying state transition logic for all connection states
3. THE Message_Store SHALL have integration tests verifying message persistence and retrieval
4. THE SHA256 hash computation SHALL have tests verifying correctness against known test vectors
5. THE file transfer protocol SHALL have integration tests verifying pause/resume/cancel scenarios
6. THE reconnection logic SHALL have tests simulating network interruption and recovery
7. THE PeerLink_App SHALL achieve at least 80% code coverage for core modules (Connection_Manager, File_Transfer_Engine, Message_Store)

### Requirement 40: SHA-256 Hash Computation Parser and Round-Trip Verification

**User Story:** As a developer, I want to ensure the SHA-256 implementation is correct and reliable, so that file integrity verification is trustworthy.

#### Acceptance Criteria

1. THE File_Transfer_Engine SHALL implement SHA-256 hash computation using a standard cryptographic library (crypto-js or native crypto)
2. THE File_Transfer_Engine SHALL provide a hash computation function that accepts a file path and returns a hex-encoded SHA-256 digest
3. THE File_Transfer_Engine SHALL include a hash verification function that accepts computed hash and expected hash and returns a boolean match result
4. FOR ALL successfully transferred files, THE File_Transfer_Engine SHALL compute the hash on both sender and receiver
5. THE File_Transfer_Engine SHALL verify that hash(file_sender) transmitted to receiver equals hash(file_receiver) computed after reassembly (round-trip property)
6. THE File_Transfer_Engine SHALL include unit tests verifying hash computation against known SHA-256 test vectors from RFC 6234
7. THE File_Transfer_Engine SHALL include integration tests verifying round-trip property: for any file, hash(original) SHALL equal hash(transferred) when transfer completes successfully
