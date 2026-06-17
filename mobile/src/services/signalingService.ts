import { io, Socket } from 'socket.io-client';
import { RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';

export interface SignalingConfig {
  serverUrl: string;
  displayName: string;
}

export class SignalingService {
  private socket: Socket | null = null;
  private config: SignalingConfig;
  private onPeerJoined: ((peerId: string, displayName: string) => void) | null = null;
  private onOfferReceived: ((sdp: string) => void) | null = null;
  private onAnswerReceived: ((sdp: string) => void) | null = null;
  private onIceCandidateReceived: ((candidate: any) => void) | null = null;
  private onPeerDisconnected: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private firstConnect = true;

  constructor(config: SignalingConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
      });

      const onConnect = () => {
        console.log('Signaling connected:', this.socket?.id);
        this.setupEventHandlers();
        cleanup();
        resolve();
      };

      const onConnectError = (error: Error) => {
        console.error('Signaling connection error:', error);
        if (this.firstConnect) {
          this.firstConnect = false;
          cleanup();
          reject(error);
        }
      };

      const cleanup = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onConnectError);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onConnectError);
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('peer-joined', (data) => {
      if (this.onPeerJoined) {
        this.onPeerJoined(data.peerId, data.displayName);
      }
    });

    this.socket.on('offer-received', (data) => {
      if (this.onOfferReceived) {
        this.onOfferReceived(data.sdp);
      }
    });

    this.socket.on('answer-received', (data) => {
      if (this.onAnswerReceived) {
        this.onAnswerReceived(data.sdp);
      }
    });

    this.socket.on('ice-candidate-received', (data) => {
      if (this.onIceCandidateReceived) {
        this.onIceCandidateReceived(data.candidate);
      }
    });

    this.socket.on('peer-disconnected', (data) => {
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected();
      }
    });

    this.socket.on('room-full', () => {
      if (this.onError) this.onError('Room is full');
    });

    this.socket.on('room-not-found', () => {
      if (this.onError) this.onError('Room not found');
    });

    this.socket.on('error', (error: any) => {
      if (this.onError) this.onError(error);
    });
  }

  async createRoom(): Promise<string> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'create-room',
        { displayName: this.config.displayName },
        (response: any) => {
          if (response?.success) {
            resolve(response.roomId);
          } else {
            reject(new Error(response?.error || 'Failed to create room'));
          }
        }
      );
    });
  }

  async joinRoom(roomId: string): Promise<{ peerId: string }> {
    if (!this.socket) throw new Error('Socket not connected');

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'join-room',
        { roomId, displayName: this.config.displayName },
        (response: any) => {
          if (response?.success) {
            resolve({ peerId: response.peerId });
          } else {
            reject(new Error(response?.error || 'Failed to join room'));
          }
        }
      );
    });
  }

  sendOffer(roomId: string, sdp: RTCSessionDescription): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('offer', { roomId, sdp: sdp.sdp }, (response: any) => {
      if (!response?.success) {
        console.warn('Failed to send offer:', response?.error);
      }
    });
  }

  sendAnswer(roomId: string, sdp: RTCSessionDescription): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('answer', { roomId, sdp: sdp.sdp }, (response: any) => {
      if (!response?.success) {
        console.warn('Failed to send answer:', response?.error);
      }
    });
  }

  sendIceCandidate(roomId: string, candidate: RTCIceCandidate): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit(
      'ice-candidate',
      { roomId, candidate: candidate.toJSON ? candidate.toJSON() : candidate },
      (response: any) => {
        if (!response?.success) {
          console.warn('Failed to send ICE candidate:', response?.error);
        }
      }
    );
  }

  setOnPeerJoined(cb: (peerId: string, displayName: string) => void): void {
    this.onPeerJoined = cb;
  }

  setOnOfferReceived(cb: (sdp: string) => void): void {
    this.onOfferReceived = cb;
  }

  setOnAnswerReceived(cb: (sdp: string) => void): void {
    this.onAnswerReceived = cb;
  }

  setOnIceCandidateReceived(cb: (candidate: any) => void): void {
    this.onIceCandidateReceived = cb;
  }

  setOnPeerDisconnected(cb: () => void): void {
    this.onPeerDisconnected = cb;
  }

  setOnError(cb: (error: string) => void): void {
    this.onError = cb;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }
}
