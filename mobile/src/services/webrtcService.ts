// @ts-nocheck
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { Message, FileTransferMessage } from '../../../shared/types';

export interface WebRTCConfig {
  stunServers: string[];
  turnServer?: {
    urls: string[];
    username?: string;
    credential?: string;
  };
}

export const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
  ],
};

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private iceServers: RTCIceServer[] = [];
  private onDataChannelOpen: (() => void) | null = null;
  private onDataChannelClose: (() => void) | null = null;
  private onDataChannelMessage: ((message: any) => void) | null = null;
  private onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  private onConnectionStateChange: ((state: string) => void) | null = null;
  private onIceConnectionStateChange: ((state: string) => void) | null = null;

  constructor(config: WebRTCConfig = DEFAULT_WEBRTC_CONFIG) {
    this.setupIceServers(config);
  }

  private setupIceServers(config: WebRTCConfig) {
    this.iceServers = config.stunServers.map((stun) => ({
      urls: stun,
    })) as RTCIceServer[];

    if (config.turnServer) {
      this.iceServers.push({
        urls: config.turnServer.urls,
        username: config.turnServer.username,
        credential: config.turnServer.credential,
      });
    }
  }

  async createPeerConnection(): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerConnection.connectionState);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      if (this.onIceConnectionStateChange) {
        this.onIceConnectionStateChange(peerConnection.iceConnectionState);
      }
    };

    this.peerConnection = peerConnection;
    return peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async setRemoteDescription(sdp: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    await this.peerConnection.setRemoteDescription(sdp);
  }

  async createAnswer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.warn('Failed to add ICE candidate:', error);
    }
  }

  createDataChannel(label: string = 'messaging'): RTCDataChannel {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const dataChannel = this.peerConnection.createDataChannel(label, {
      ordered: true,
    });

    this.setupDataChannelHandlers(dataChannel);
    this.dataChannel = dataChannel;

    return dataChannel;
  }

  onDataChannel(callback: (channel: RTCDataChannel) => void): void {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannelHandlers(channel);
      this.dataChannel = channel;
      callback(channel);
    };
  }

  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('DataChannel opened');
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen();
      }
    };

    channel.onclose = () => {
      console.log('DataChannel closed');
      if (this.onDataChannelClose) {
        this.onDataChannelClose();
      }
    };

    channel.onmessage = (event) => {
      if (this.onDataChannelMessage) {
        this.onDataChannelMessage(event.data);
      }
    };

    channel.onerror = (error) => {
      console.error('DataChannel error:', error);
    };
  }

  sendMessage(message: string | FileTransferMessage): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('DataChannel not open');
    }

    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.dataChannel.send(data);
  }

  sendBinary(data: ArrayBuffer): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('DataChannel not open');
    }

    this.dataChannel.send(data);
  }

  getBufferedAmount(): number {
    if (!this.dataChannel) {
      return 0;
    }

    return this.dataChannel.bufferedAmount;
  }

  setOnDataChannelOpen(callback: () => void): void {
    this.onDataChannelOpen = callback;
  }

  setOnDataChannelClose(callback: () => void): void {
    this.onDataChannelClose = callback;
  }

  setOnDataChannelMessage(callback: (message: any) => void): void {
    this.onDataChannelMessage = callback;
  }

  setOnIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidate = callback;
  }

  setOnConnectionStateChange(callback: (state: string) => void): void {
    this.onConnectionStateChange = callback;
  }

  setOnIceConnectionStateChange(callback: (state: string) => void): void {
    this.onIceConnectionStateChange = callback;
  }

  async close(): Promise<void> {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      await this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  getConnectionState(): string | null {
    return this.peerConnection?.connectionState || null;
  }

  getIceConnectionState(): string | null {
    return this.peerConnection?.iceConnectionState || null;
  }
}
