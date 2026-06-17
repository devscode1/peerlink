import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from 'js-sha256';
import { FileTransferMessage } from '../../../shared/types';
import { useFileTransferStore, useMessageStore, useConnectionStore } from '../store/connectionStore';
import { DatabaseService } from './databaseService';
import { generateFileId, getChunkSize } from '../../../shared/utils';

const CHUNK_ACK_INTERVAL = 16;
const BUFFER_LOW_THRESHOLD = 1024 * 256;
const MAX_CHUNK_SIZE = 64 * 1024;

interface OutgoingTransfer {
  fileId: string;
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  chunkSize: number;
  totalChunks: number;
  nextChunkIndex: number;
  ackedChunks: number;
  paused: boolean;
  cancelled: boolean;
}

interface IncomingTransfer {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  chunkSize: number;
  totalChunks: number;
  receivedChunks: Map<number, Uint8Array>;
  nextExpectedChunk: number;
  lastAckedChunk: number;
  bytesReceived: number;
  startTime: number;
  tempPath: string;
}

export class FileTransferEngine {
  private outgoing: OutgoingTransfer | null = null;
  private incoming: IncomingTransfer | null = null;
  private sendControlFn: (msg: FileTransferMessage) => void;
  private sendBinaryFn: (data: ArrayBuffer) => void;
  private getBufferedAmountFn: () => number;
  private chunkSendTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(connManager: {
    sendControlMessage: (msg: any) => void;
    sendBinary: (data: ArrayBuffer) => void;
    getBufferedAmount: () => number;
  }) {
    this.sendControlFn = (msg) => connManager.sendControlMessage(msg);
    this.sendBinaryFn = connManager.sendBinary;
    this.getBufferedAmountFn = connManager.getBufferedAmount;
  }

  async startSend(uri: string, fileName: string, fileSize: number, mimeType: string) {
    const fileId = generateFileId();
    const sha256 = await this.computeSha256(uri);
    const chunkSize = getChunkSize(0);
    const totalChunks = Math.ceil(fileSize / chunkSize);

    this.outgoing = {
      fileId,
      uri,
      fileName,
      fileSize,
      mimeType,
      sha256,
      chunkSize,
      totalChunks,
      nextChunkIndex: 0,
      ackedChunks: 0,
      paused: false,
      cancelled: false,
    };

    const store = useFileTransferStore.getState();
    store.setIsTransferring(true);
    store.setTransferFileInfo(fileId, fileName, fileSize);
    store.setTransferProgress(0);

    this.sendControlFn({
      type: 'TRANSFER_INIT',
      fileId,
      fileName,
      fileSize,
      mimeType,
      chunkSize,
      totalChunks,
      sha256,
    });
  }

  handleControlMessage(msg: FileTransferMessage) {
    switch (msg.type) {
      case 'TRANSFER_INIT':
        this.handleTransferInit(msg);
        break;
      case 'TRANSFER_ACCEPT':
        this.handleTransferAccept();
        break;
      case 'TRANSFER_REJECT':
        this.handleTransferReject();
        break;
      case 'CHUNK_ACK':
        this.handleChunkAck(msg);
        break;
      case 'TRANSFER_COMPLETE':
        this.handleTransferComplete();
        break;
      case 'VERIFY_OK':
        this.handleVerifyOk();
        break;
      case 'VERIFY_FAIL':
        this.handleVerifyFail();
        break;
      case 'TRANSFER_PAUSE':
        this.handlePause();
        break;
      case 'TRANSFER_RESUME':
        this.handleResume(msg);
        break;
      case 'TRANSFER_ABORT':
        this.handleAbort();
        break;
    }
  }

  handleChunk(data: ArrayBuffer) {
    if (!this.incoming) return;

    const view = new DataView(data);
    const chunkIndex = view.getUint32(4, true);
    const chunkData = data.slice(8);

    this.incoming.receivedChunks.set(chunkIndex, new Uint8Array(chunkData));
    this.incoming.bytesReceived += (chunkData as ArrayBuffer).byteLength;

    const progress = (this.incoming.bytesReceived / this.incoming.fileSize) * 100;
    const elapsed = (Date.now() - this.incoming.startTime) / 1000;
    const speed = this.incoming.bytesReceived / Math.max(elapsed, 0.1);
    const remaining = this.incoming.fileSize - this.incoming.bytesReceived;
    const eta = speed > 0 ? remaining / speed : 0;

    useFileTransferStore.getState().setTransferProgress(progress, speed, eta);

    if (
      chunkIndex >= this.incoming.nextExpectedChunk + CHUNK_ACK_INTERVAL - 1 ||
      chunkIndex === this.incoming.totalChunks - 1
    ) {
      this.incoming.lastAckedChunk = chunkIndex;
      this.incoming.nextExpectedChunk = chunkIndex + 1;
      this.sendControlFn({
        type: 'CHUNK_ACK',
        fileId: this.incoming.fileId,
        lastAckedChunk: chunkIndex,
      });
    }

    if (this.incoming.receivedChunks.size === this.incoming.totalChunks) {
      this.sendControlFn({
        type: 'TRANSFER_COMPLETE',
        fileId: this.incoming.fileId,
      });
    }
  }

  private handleTransferInit(msg: FileTransferMessage) {
    const meta = {
      fileId: msg.fileId,
      fileName: msg.fileName || 'unknown',
      fileSize: msg.fileSize || 0,
      mimeType: msg.mimeType || 'application/octet-stream',
      sha256: msg.sha256 || '',
      chunkSize: msg.chunkSize || MAX_CHUNK_SIZE,
      totalChunks: msg.totalChunks || 0,
    };

    useFileTransferStore.getState().setIncomingFileMeta(meta);
  }

  respondToTransfer(accept: boolean) {
    const store = useFileTransferStore.getState();
    const meta = store.incomingFileMeta;
    if (!meta) return;

    if (accept) {
      const tempPath = `${FileSystem.cacheDirectory}transfer_${meta.fileId}`;
      this.incoming = {
        fileId: meta.fileId,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        mimeType: meta.mimeType,
        sha256: meta.sha256,
        chunkSize: meta.chunkSize,
        totalChunks: meta.totalChunks,
        receivedChunks: new Map(),
        nextExpectedChunk: 0,
        lastAckedChunk: 0,
        bytesReceived: 0,
        startTime: Date.now(),
        tempPath,
      };

      store.setIsTransferring(true);
      store.setTransferFileInfo(meta.fileId, meta.fileName, meta.fileSize);

      this.sendControlFn({ type: 'TRANSFER_ACCEPT', fileId: meta.fileId });
    } else {
      this.sendControlFn({ type: 'TRANSFER_REJECT', fileId: meta.fileId });
    }

    store.setIncomingFileMeta(null);
  }

  private async handleTransferAccept() {
    if (!this.outgoing) return;
    this.outgoing.paused = false;
    this.sendNextChunks();
  }

  private handleTransferReject() {
    const store = useFileTransferStore.getState();
    store.setTransferError('Transfer rejected by peer');
    store.reset();
    this.outgoing = null;
  }

  private async sendNextChunks() {
    if (!this.outgoing || this.outgoing.paused || this.outgoing.cancelled) return;

    const batchSize = 8;
    for (let i = 0; i < batchSize; i++) {
      if (this.outgoing.nextChunkIndex >= this.outgoing.totalChunks) break;

      await this.waitForBufferLow();

      if (this.outgoing.paused || this.outgoing.cancelled) return;

      try {
        const offset = this.outgoing.nextChunkIndex * this.outgoing.chunkSize;
        const readLen = Math.min(
          this.outgoing.chunkSize,
          this.outgoing.fileSize - offset
        );

        const base64 = await FileSystem.readAsStringAsync(this.outgoing.uri, {
          encoding: FileSystem.EncodingType.Base64,
          position: offset,
          length: readLen,
        });

        const chunkData = this.base64ToArrayBuffer(base64);
        const header = new ArrayBuffer(8);
        const headerView = new DataView(header);
        headerView.setUint32(0, this.hashFileId(this.outgoing.fileId), true);
        headerView.setUint32(4, this.outgoing.nextChunkIndex, true);

        const combined = new Uint8Array(header.byteLength + chunkData.byteLength);
        combined.set(new Uint8Array(header), 0);
        combined.set(new Uint8Array(chunkData), header.byteLength);

        this.sendBinaryFn(combined.buffer);

        this.outgoing.nextChunkIndex++;
        const progress = (this.outgoing.nextChunkIndex / this.outgoing.totalChunks) * 100;

        const elapsed = (Date.now() - (this.outgoing as any).startTime) / 1000 || 0.01;
        const speed = (this.outgoing.nextChunkIndex * this.outgoing.chunkSize) / Math.max(elapsed, 0.1);
        const remaining = (this.outgoing.totalChunks - this.outgoing.nextChunkIndex) * this.outgoing.chunkSize;
        const eta = speed > 0 ? remaining / speed : 0;

        useFileTransferStore.getState().setTransferProgress(progress, speed, eta);
      } catch (err) {
        console.error('Error sending chunk:', err);
        useFileTransferStore.getState().setTransferError('Failed to send file chunk');
        break;
      }
    }

    if (this.outgoing && this.outgoing.nextChunkIndex >= this.outgoing.totalChunks) {
      this.sendControlFn({
        type: 'TRANSFER_COMPLETE',
        fileId: this.outgoing.fileId,
      });
    } else if (this.outgoing && !this.outgoing.paused && !this.outgoing.cancelled) {
      this.chunkSendTimer = setTimeout(() => this.sendNextChunks(), 10);
    }
  }

  private waitForBufferLow(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.getBufferedAmountFn() < BUFFER_LOW_THRESHOLD) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  private handleChunkAck(msg: FileTransferMessage) {
    if (!this.outgoing) return;
    this.outgoing.ackedChunks = msg.lastAckedChunk ?? this.outgoing.ackedChunks;
  }

  private handleTransferComplete() {
    if (!this.incoming) return;
    this.verifyAndSaveReceivedFile();
  }

  private async verifyAndSaveReceivedFile() {
    if (!this.incoming) return;

    try {
      const totalSize = Array.from(this.incoming.receivedChunks.values()).reduce(
        (sum, c) => sum + c.length,
        0
      );
      const buffer = new Uint8Array(totalSize);
      let offset = 0;
      for (let i = 0; i < this.incoming.totalChunks; i++) {
        const chunk = this.incoming.receivedChunks.get(i);
        if (chunk) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }
      }

      const calculatedHash = sha256(buffer);

      if (calculatedHash === this.incoming.sha256) {
        this.sendControlFn({ type: 'VERIFY_OK', fileId: this.incoming.fileId });

        const base64 = this.arrayBufferToBase64(buffer.buffer);
        const isMedia = this.incoming.mimeType.startsWith('image/') || this.incoming.mimeType.startsWith('video/');

        let savePath: string;
        if (isMedia) {
          const ext = this.incoming.mimeType.split('/')[1] || 'bin';
          savePath = `${FileSystem.documentDirectory}${this.incoming.fileId}_${this.incoming.fileName}`;
        } else {
          savePath = `${FileSystem.documentDirectory}${this.incoming.fileId}_${this.incoming.fileName}`;
        }

        await FileSystem.writeAsStringAsync(savePath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const store = useConnectionStore.getState();
        const msgStore = useMessageStore.getState();
        const fileMessage: any = {
          id: uuidv4(),
          roomId: store.roomCode || '',
          senderId: 'remote',
          type: 'file',
          content: this.incoming.fileName,
          fileName: this.incoming.fileName,
          fileSize: this.incoming.fileSize,
          fileMimeType: this.incoming.mimeType,
          filePath: savePath,
          status: 'delivered',
          timestamp: new Date().toISOString(),
          transferProgress: 100,
        };

        msgStore.addMessage(fileMessage);
        DatabaseService.getInstance().saveMessage(fileMessage).catch(console.warn);

        useFileTransferStore.getState().reset();
        this.incoming = null;
      } else {
        this.sendControlFn({ type: 'VERIFY_FAIL', fileId: this.incoming.fileId, error: 'Hash mismatch' });
        useFileTransferStore.getState().setTransferError('File verification failed');
      }
    } catch (err) {
      console.error('Error saving received file:', err);
      useFileTransferStore.getState().setTransferError('Failed to save file');
    }
  }

  private handleVerifyOk() {
    useFileTransferStore.getState().reset();
    this.outgoing = null;
    if (this.chunkSendTimer) {
      clearTimeout(this.chunkSendTimer);
      this.chunkSendTimer = null;
    }
  }

  private handleVerifyFail() {
    useFileTransferStore.getState().setTransferError('Peer reported file verification failed');
    this.outgoing = null;
    if (this.chunkSendTimer) {
      clearTimeout(this.chunkSendTimer);
      this.chunkSendTimer = null;
    }
  }

  pause() {
    if (this.outgoing) {
      this.outgoing.paused = true;
      this.sendControlFn({
        type: 'TRANSFER_PAUSE',
        fileId: this.outgoing.fileId,
      });
    }
    useFileTransferStore.getState().setIsPaused(true);
  }

  private handlePause() {
    if (this.outgoing) {
      this.outgoing.paused = true;
    }
    useFileTransferStore.getState().setIsPaused(true);
  }

  resume() {
    if (this.outgoing) {
      this.outgoing.paused = false;
      const lastAcked = this.outgoing.ackedChunks;
      this.sendControlFn({
        type: 'TRANSFER_RESUME',
        fileId: this.outgoing.fileId,
        lastAckedChunk: lastAcked,
      });
      this.sendNextChunks();
    }
    useFileTransferStore.getState().setIsPaused(false);
  }

  private handleResume(msg: FileTransferMessage) {
    if (this.outgoing) {
      if (msg.lastAckedChunk !== undefined) {
        this.outgoing.nextChunkIndex = msg.lastAckedChunk + 1;
      }
      this.outgoing.paused = false;
      this.sendNextChunks();
    }
    useFileTransferStore.getState().setIsPaused(false);
  }

  cancel() {
    const fileId = this.outgoing?.fileId || this.incoming?.fileId;
    if (fileId) {
      this.sendControlFn({ type: 'TRANSFER_ABORT', fileId });
    }

    if (this.outgoing) {
      this.outgoing.cancelled = true;
      this.outgoing = null;
    }
    if (this.incoming) {
      if (this.incoming.tempPath) {
        FileSystem.deleteAsync(this.incoming.tempPath).catch(console.warn);
      }
      this.incoming = null;
    }
    if (this.chunkSendTimer) {
      clearTimeout(this.chunkSendTimer);
      this.chunkSendTimer = null;
    }

    useFileTransferStore.getState().reset();
  }

  private handleAbort() {
    if (this.incoming) {
      if (this.incoming.tempPath) {
        FileSystem.deleteAsync(this.incoming.tempPath).catch(console.warn);
      }
      this.incoming = null;
    }
    if (this.outgoing) {
      this.outgoing.cancelled = true;
      this.outgoing = null;
    }
    if (this.chunkSendTimer) {
      clearTimeout(this.chunkSendTimer);
      this.chunkSendTimer = null;
    }
    useFileTransferStore.getState().reset();
  }

  private async computeSha256(uri: string): Promise<string> {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) throw new Error('File not found');

    const CHUNK_READ = 4 * 1024 * 1024;
    const fileSize = info.size || 0;
    const hash = sha256.create();

    for (let offset = 0; offset < fileSize; offset += CHUNK_READ) {
      const readLen = Math.min(CHUNK_READ, fileSize - offset);
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length: readLen,
      });
      const bytes = this.base64ToArrayBuffer(b64);
      hash.update(new Uint8Array(bytes));
    }

    return hash.hex();
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
    }
    return btoa(binary);
  }

  private hashFileId(fileId: string): number {
    let hash = 0;
    for (let i = 0; i < fileId.length; i++) {
      const char = fileId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
