import { create } from 'zustand';
import { ICEConnectionType, Message } from '../../../shared/types';

export type AppConnectionState =
  | 'IDLE'
  | 'WAITING'
  | 'NEGOTIATING'
  | 'CONNECTED_P2P'
  | 'CONNECTED_RELAY'
  | 'RECONNECTING'
  | 'FAILED'
  | 'CLOSED';

interface ConnectionStoreState {
  connectionState: AppConnectionState;
  roomCode: string | null;
  roomId: string | null;
  peerId: string | null;
  peerName: string | null;
  localPeerId: string | null;
  iceConnectionType: ICEConnectionType | null;
  errorMessage: string | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
  isInitiator: boolean;

  setConnectionState: (state: AppConnectionState) => void;
  setRoomCode: (code: string) => void;
  setRoomId: (id: string) => void;
  setPeerInfo: (peerId: string, peerName: string) => void;
  setLocalPeerId: (id: string) => void;
  setIceConnectionType: (type: ICEConnectionType | null) => void;
  setErrorMessage: (message: string | null) => void;
  setIsReconnecting: (val: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setInitiator: (val: boolean) => void;
  reset: () => void;
}

interface MessageStoreState {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'sent' | 'delivered' | 'error') => void;
  updateMessageProgress: (messageId: string, progress: number) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
}

interface FileTransferStoreState {
  isTransferring: boolean;
  transferProgress: number;
  transferSpeed: number;
  transferEta: number;
  currentFileId: string | null;
  transferFileName: string | null;
  transferFileSize: number | null;
  transferError: string | null;
  isPaused: boolean;
  incomingFileMeta: {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    sha256: string;
    chunkSize: number;
    totalChunks: number;
  } | null;

  setIsTransferring: (v: boolean) => void;
  setTransferProgress: (progress: number, speed?: number, eta?: number) => void;
  setTransferFileInfo: (fileId: string, fileName: string, fileSize: number) => void;
  setTransferError: (error: string | null) => void;
  setIsPaused: (v: boolean) => void;
  setIncomingFileMeta: (meta: FileTransferStoreState['incomingFileMeta']) => void;
  reset: () => void;
}

interface SettingsStoreState {
  displayName: string;
  signalingServerUrl: string;
  customTurnUrl: string | null;
  customTurnUsername: string | null;
  customTurnCredential: string | null;
  darkMode: boolean;

  setDisplayName: (name: string) => void;
  setSignalingServerUrl: (url: string) => void;
  setCustomTurn: (url: string, username: string, credential: string) => void;
  setDarkMode: (darkMode: boolean) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  connectionState: 'IDLE',
  roomCode: null,
  roomId: null,
  peerId: null,
  peerName: null,
  localPeerId: null,
  iceConnectionType: null,
  errorMessage: null,
  isReconnecting: false,
  reconnectAttempts: 0,
  isInitiator: false,

  setConnectionState: (connectionState) => set({ connectionState }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setRoomId: (roomId) => set({ roomId }),
  setPeerInfo: (peerId, peerName) => set({ peerId, peerName }),
  setLocalPeerId: (localPeerId) => set({ localPeerId }),
  setIceConnectionType: (iceConnectionType) => set({ iceConnectionType }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setIsReconnecting: (isReconnecting) => set({ isReconnecting }),
  incrementReconnectAttempts: () =>
    set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
  setInitiator: (isInitiator) => set({ isInitiator }),
  reset: () =>
    set({
      connectionState: 'IDLE',
      roomCode: null,
      roomId: null,
      peerId: null,
      peerName: null,
      localPeerId: null,
      iceConnectionType: null,
      errorMessage: null,
      isReconnecting: false,
      reconnectAttempts: 0,
      isInitiator: false,
    }),
}));

export const useMessageStore = create<MessageStoreState>((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessageStatus: (messageId, status) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, status } : msg
      ),
    })),

  updateMessageProgress: (messageId, transferProgress) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, transferProgress } : msg
      ),
    })),

  clearMessages: () => set({ messages: [] }),

  setMessages: (messages) => set({ messages }),
}));

export const useFileTransferStore = create<FileTransferStoreState>((set) => ({
  isTransferring: false,
  transferProgress: 0,
  transferSpeed: 0,
  transferEta: 0,
  currentFileId: null,
  transferFileName: null,
  transferFileSize: null,
  transferError: null,
  isPaused: false,
  incomingFileMeta: null,

  setIsTransferring: (isTransferring) => set({ isTransferring }),
  setTransferProgress: (transferProgress, speed, eta) =>
    set((s) => ({
      transferProgress,
      transferSpeed: speed ?? s.transferSpeed,
      transferEta: eta ?? s.transferEta,
    })),
  setTransferFileInfo: (currentFileId, transferFileName, transferFileSize) =>
    set({ currentFileId, transferFileName, transferFileSize }),
  setTransferError: (transferError) => set({ transferError }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setIncomingFileMeta: (incomingFileMeta) => set({ incomingFileMeta }),
  reset: () =>
    set({
      isTransferring: false,
      transferProgress: 0,
      transferSpeed: 0,
      transferEta: 0,
      currentFileId: null,
      transferFileName: null,
      transferFileSize: null,
      transferError: null,
      isPaused: false,
      incomingFileMeta: null,
    }),
}));

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  displayName: '',
  signalingServerUrl: 'http://localhost:3000',
  customTurnUrl: null,
  customTurnUsername: null,
  customTurnCredential: null,
  darkMode: true,

  setDisplayName: (displayName) => set({ displayName }),
  setSignalingServerUrl: (signalingServerUrl) => set({ signalingServerUrl }),
  setCustomTurn: (customTurnUrl, customTurnUsername, customTurnCredential) =>
    set({ customTurnUrl, customTurnUsername, customTurnCredential }),
  setDarkMode: (darkMode) => set({ darkMode }),
}));
