export interface SignalingEvents {
  'create-room': { displayName: string };
  'join-room': { roomId: string; displayName: string };
  'offer': { roomId: string; sdp: string };
  'answer': { roomId: string; sdp: string };
  'ice-candidate': { roomId: string; candidate: any };
}

export interface SignalingResponses {
  'room-created': { roomId: string; peerId: string };
  'peer-joined': { peerId: string; displayName: string };
  'peer-disconnected': { peerId: string };
  'room-full': { roomId: string };
  'room-not-found': { roomId: string };
  'offer-received': { sdp: string; peerId?: string };
  'answer-received': { sdp: string; peerId?: string };
  'ice-candidate-received': { candidate: any; peerId?: string };
}

export type AppConnectionState =
  | 'IDLE'
  | 'WAITING'
  | 'NEGOTIATING'
  | 'CONNECTED_P2P'
  | 'CONNECTED_RELAY'
  | 'RECONNECTING'
  | 'FAILED'
  | 'CLOSED';

export type MessageType = 'text' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'error';

export interface Message {
  id: string;
  roomId: string;
  senderId: 'local' | 'remote';
  type: MessageType;
  content: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  filePath?: string;
  status: MessageStatus;
  timestamp: string;
  transferProgress?: number;
}

export type FileTransferMessageType =
  | 'TRANSFER_INIT'
  | 'TRANSFER_ACCEPT'
  | 'TRANSFER_REJECT'
  | 'CHUNK'
  | 'CHUNK_ACK'
  | 'TRANSFER_COMPLETE'
  | 'VERIFY_OK'
  | 'VERIFY_FAIL'
  | 'TRANSFER_PAUSE'
  | 'TRANSFER_RESUME'
  | 'TRANSFER_ABORT';

export interface FileTransferMessage {
  type: FileTransferMessageType;
  fileId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  chunkSize?: number;
  totalChunks?: number;
  sha256?: string;
  chunkIndex?: number;
  lastAckedChunk?: number;
  error?: string;
}

export type ICEConnectionType = 'P2P' | 'TURN' | 'FAILED';

export interface ConnectionInfo {
  state: AppConnectionState;
  iceConnectionType?: ICEConnectionType;
  peerId?: string;
  peerDisplayName?: string;
  timestamp: string;
}

export type RoomCode = string & { readonly __brand: 'RoomCode' };

export function createRoomCode(code: string): RoomCode {
  if (!/^[A-Z0-9]{6}$/.test(code.toUpperCase())) {
    throw new Error('Room code must be 6 alphanumeric characters');
  }
  return code.toUpperCase() as RoomCode;
}
