import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { v4 as uuidv4 } from 'uuid';
import { SignalingService } from './signalingService';
import { FileTransferMessage, Message } from '../../../shared/types';
import { useConnectionStore, useMessageStore, useFileTransferStore, useSettingsStore } from '../store/connectionStore';
import { DatabaseService } from './databaseService';
import { FileTransferEngine } from './fileTransferEngine';

type DataChannelMessage =
  | { kind: 'text'; id: string; content: string; timestamp: string }
  | { kind: 'delivery'; id: string }
  | FileTransferMessage;

const ICE_SERVERS: any[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 1000;

class ConnectionManager {
  private static instance: ConnectionManager;
  private pc: RTCPeerConnection | null = null;
  private dc: any = null;
  private signaling: SignalingService | null = null;
  private fileEngine: FileTransferEngine;
  private isInitiator = false;
  private roomCode = '';
  private iceCandidatesQueue: any[] = [];
  private remoteDescriptionSet = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private constructor() {
    this.fileEngine = new FileTransferEngine(this);
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async createRoom(displayName?: string): Promise<string> {
    this.disposed = false;
    const settings = useSettingsStore.getState();
    const name = displayName || settings.displayName || 'Anonymous';
    this.signaling = new SignalingService({
      serverUrl: settings.signalingServerUrl,
      displayName: name,
    });
    await this.signaling.connect();
    this.registerSignalingCallbacks();
    const code = await this.signaling.createRoom();
    this.roomCode = code;
    const store = useConnectionStore.getState();
    store.setRoomCode(code);
    store.setLocalPeerId(this.signaling.getSocketId() || '');
    store.setConnectionState('WAITING');
    store.setInitiator(true);
    this.isInitiator = true;
    return code;
  }

  async joinRoom(code: string, displayName?: string): Promise<void> {
    this.disposed = false;
    const settings = useSettingsStore.getState();
    const name = displayName || settings.displayName || 'Anonymous';
    this.signaling = new SignalingService({
      serverUrl: settings.signalingServerUrl,
      displayName: name,
    });
    await this.signaling.connect();
    this.registerSignalingCallbacks();
    await this.signaling.joinRoom(code);
    this.roomCode = code;
    const store = useConnectionStore.getState();
    store.setRoomCode(code);
    store.setLocalPeerId(this.signaling.getSocketId() || '');
    store.setConnectionState('NEGOTIATING');
    store.setInitiator(false);
    this.isInitiator = false;
  }

  private registerSignalingCallbacks() {
    if (!this.signaling) return;

    this.signaling.setOnPeerJoined((_peerId, _displayName) => {
      const store = useConnectionStore.getState();
      store.setPeerInfo(_peerId, _displayName);
      store.setConnectionState('NEGOTIATING');
      if (this.isInitiator) {
        this.initiateWebRTC();
      }
    });

    this.signaling.setOnOfferReceived((sdpString) => {
      this.handleOfferReceived(sdpString);
    });

    this.signaling.setOnAnswerReceived((sdpString) => {
      this.handleAnswerReceived(sdpString);
    });

    this.signaling.setOnIceCandidateReceived((candidateData) => {
      this.handleRemoteIceCandidate(candidateData);
    });

    this.signaling.setOnPeerDisconnected(() => {
      this.handlePeerDisconnected();
    });

    this.signaling.setOnError((error) => {
      useConnectionStore.getState().setErrorMessage(error);
    });
  }

  private async initiateWebRTC() {
    try {
      this.createPeerConnection();

      this.dc = (this.pc as any).createDataChannel('messaging', { ordered: true });
      this.setupDataChannel(this.dc!);

      const offer = await (this.pc as any).createOffer();
      await (this.pc as any).setLocalDescription(offer);

      this.signaling?.sendOffer(this.roomCode, offer);
    } catch (err) {
      console.error('Error initiating WebRTC:', err);
      useConnectionStore.getState().setConnectionState('FAILED');
    }
  }

  private createPeerConnection() {
    const settings = useSettingsStore.getState();
    const iceServers = [...ICE_SERVERS];

    if (settings.customTurnUrl) {
      iceServers.push({
        urls: [settings.customTurnUrl],
        username: settings.customTurnUsername || undefined,
        credential: settings.customTurnCredential || undefined,
      });
    }

    const pc = new RTCPeerConnection({ iceServers }) as any;

    pc.onicecandidate = (event: any) => {
      if (event.candidate && this.signaling) {
        this.signaling.sendIceCandidate(this.roomCode, event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const state = pc.iceConnectionState;
      const store = useConnectionStore.getState();

      if (state === 'connected' || state === 'completed') {
        store.setIceConnectionType('P2P');
        store.setConnectionState('CONNECTED_P2P');
        store.resetReconnectAttempts();
        store.setIsReconnecting(false);
      } else if (state === 'disconnected') {
        this.attemptReconnect();
      } else if (state === 'failed') {
        if (store.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.attemptReconnect();
        } else {
          store.setConnectionState('FAILED');
          store.setErrorMessage('Connection failed. Please try again.');
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = pc.connectionState;
      if (state === 'failed') {
        const store = useConnectionStore.getState();
        if (store.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.attemptReconnect();
        } else {
          store.setConnectionState('FAILED');
        }
      }
    };

    this.pc = pc;
  }

  private async handleOfferReceived(sdpString: string) {
    try {
      this.createPeerConnection();

      (this.pc as any).ondatachannel = (event: any) => {
        this.dc = event.channel;
        this.setupDataChannel(this.dc);
      };

      await (this.pc as any).setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdpString }));
      this.remoteDescriptionSet = true;
      this.drainIceCandidateQueue();

      const answer = await (this.pc as any).createAnswer();
      await (this.pc as any).setLocalDescription(answer);

      this.signaling?.sendAnswer(this.roomCode, answer);
      useConnectionStore.getState().setConnectionState('NEGOTIATING');
    } catch (err) {
      console.error('Error handling offer:', err);
      useConnectionStore.getState().setConnectionState('FAILED');
    }
  }

  private async handleAnswerReceived(sdpString: string) {
    try {
      if (!this.pc) return;
      await (this.pc as any).setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: sdpString })
      );
      this.remoteDescriptionSet = true;
      this.drainIceCandidateQueue();
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }

  private async handleRemoteIceCandidate(candidateData: any) {
    try {
      const candidate = new RTCIceCandidate(candidateData);
      if (this.remoteDescriptionSet && this.pc) {
        await (this.pc as any).addIceCandidate(candidate);
      } else {
        this.iceCandidatesQueue.push(candidateData);
      }
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }

  private drainIceCandidateQueue() {
    if (!this.pc) return;
    for (const cand of this.iceCandidatesQueue) {
      (this.pc as any).addIceCandidate(new RTCIceCandidate(cand)).catch(console.warn);
    }
    this.iceCandidatesQueue = [];
  }

  private setupDataChannel(channel: any) {
    const dc = channel as any;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      const store = useConnectionStore.getState();
      if (store.iceConnectionType === 'TURN') {
        store.setConnectionState('CONNECTED_RELAY');
      } else {
        store.setConnectionState('CONNECTED_P2P');
        store.setIceConnectionType('P2P');
      }
    };

    dc.onclose = () => {
      const store = useConnectionStore.getState();
      if (store.connectionState !== 'CLOSED' && store.connectionState !== 'IDLE') {
        this.attemptReconnect();
      }
    };

    dc.onmessage = (event: any) => {
      this.handleDataChannelMessage(event.data);
    };

    dc.onerror = (err: any) => {
      console.error('DataChannel error:', err);
    };
  }

  private handleDataChannelMessage(data: any) {
    if (typeof data === 'string') {
      try {
        const parsed: DataChannelMessage = JSON.parse(data);

        if ('kind' in parsed) {
          if (parsed.kind === 'text') {
            this.handleIncomingText(parsed);
          } else if (parsed.kind === 'delivery') {
            useMessageStore.getState().updateMessageStatus(parsed.id, 'delivered');
            DatabaseService.getInstance().updateMessageStatus(parsed.id, 'delivered').catch(console.warn);
          }
        } else if ('type' in parsed) {
          this.fileEngine.handleControlMessage(parsed);
        }
      } catch {
        this.handleIncomingTextRaw(data);
      }
    } else if (data instanceof ArrayBuffer) {
      this.fileEngine.handleChunk(data);
    }
  }

  private handleIncomingText(msg: { id: string; content: string; timestamp: string }) {
    const store = useConnectionStore.getState();
    const message: Message = {
      id: msg.id,
      roomId: store.roomCode || '',
      senderId: 'remote',
      type: 'text',
      content: msg.content,
      status: 'delivered',
      timestamp: msg.timestamp,
    };

    useMessageStore.getState().addMessage(message);
    DatabaseService.getInstance().saveMessage(message).catch(console.warn);

    this.sendDeliveryAck(msg.id);
  }

  private handleIncomingTextRaw(raw: string) {
    const store = useConnectionStore.getState();
    const message: Message = {
      id: `recv_${Date.now()}`,
      roomId: store.roomCode || '',
      senderId: 'remote',
      type: 'text',
      content: raw,
      status: 'delivered',
      timestamp: new Date().toISOString(),
    };

    useMessageStore.getState().addMessage(message);
    DatabaseService.getInstance().saveMessage(message).catch(console.warn);
  }

  private sendDeliveryAck(messageId: string) {
    this.sendControlMessage({ kind: 'delivery', id: messageId });
  }

  sendMessage(text: string) {
    if (!this.dc || (this.dc as any).readyState !== 'open') {
      throw new Error('DataChannel not open');
    }

    const store = useConnectionStore.getState();
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const message: Message = {
      id,
      roomId: store.roomCode || '',
      senderId: 'local',
      type: 'text',
      content: text,
      status: 'sent',
      timestamp,
    };

    useMessageStore.getState().addMessage(message);
    DatabaseService.getInstance().saveMessage(message).catch(console.warn);

    this.sendControlMessage({ kind: 'text', id, content: text, timestamp });
  }

  async initiateFileTransfer(uri: string, fileName: string, fileSize: number, mimeType: string) {
    await this.fileEngine.startSend(uri, fileName, fileSize, mimeType);
  }

  respondFileTransfer(accept: boolean) {
    this.fileEngine.respondToTransfer(accept);
  }

  pauseTransfer() {
    this.fileEngine.pause();
  }

  resumeTransfer() {
    this.fileEngine.resume();
  }

  cancelTransfer() {
    this.fileEngine.cancel();
  }

  sendControlMessage(msg: any) {
    if (!this.dc || (this.dc as any).readyState !== 'open') {
      console.warn('DataChannel not open, cannot send');
      return;
    }
    (this.dc as any).send(JSON.stringify(msg));
  }

  sendBinary(data: ArrayBuffer) {
    if (!this.dc || (this.dc as any).readyState !== 'open') {
      console.warn('DataChannel not open, cannot send binary');
      return;
    }
    (this.dc as any).send(data);
  }

  getBufferedAmount(): number {
    return (this.dc as any)?._bufferedAmount ?? (this.dc as any)?.bufferedAmount ?? 0;
  }

  private attemptReconnect() {
    const store = useConnectionStore.getState();
    if (store.isReconnecting || store.connectionState === 'CLOSED') return;

    store.setIsReconnecting(true);
    store.setConnectionState('RECONNECTING');
    store.incrementReconnectAttempts();

    const delay = RECONNECT_BASE_DELAY * Math.pow(2, store.reconnectAttempts - 1);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.restartIce();
    }, delay);
  }

  private restartIce() {
    if (!this.pc || this.disposed) return;

    try {
      (this.pc as any).restartIce();
    } catch (err) {
      console.error('ICE restart failed:', err);
      const store = useConnectionStore.getState();
      if (store.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        store.setConnectionState('FAILED');
        store.setErrorMessage('Could not reconnect. Please try again.');
      }
    }
  }

  private handlePeerDisconnected() {
    const store = useConnectionStore.getState();
    store.setConnectionState('FAILED');
    store.setErrorMessage('Peer disconnected');
  }

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.dc) {
      (this.dc as any).close();
      this.dc = null;
    }

    if (this.pc) {
      (this.pc as any).close();
      this.pc = null;
    }

    if (this.signaling) {
      this.signaling.disconnect();
      this.signaling = null;
    }

    this.iceCandidatesQueue = [];
    this.remoteDescriptionSet = false;
    this.roomCode = '';
    this.isInitiator = false;

    const store = useConnectionStore.getState();
    store.setConnectionState('CLOSED');
    store.reset();
  }

  cancelConnection() {
    this.disconnect();
    useConnectionStore.getState().setConnectionState('IDLE');
  }

  isDataChannelOpen(): boolean {
    return (this.dc as any)?.readyState === 'open';
  }
}

export const ConnectionManagerInstance = ConnectionManager.getInstance();
export { ConnectionManager };
