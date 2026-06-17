// @ts-nocheck
import RNFS from 'react-native-fs';
import sha256 from 'js-sha256';
import { FileTransferMessage } from '../../../shared/types';

export interface FileTransferOptions {
  chunkSize?: number;
  onProgress?: (progress: number, speed: number, eta: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export class FileTransferService {
  private activeTransfers = new Map<
    string,
    {
      fileId: string;
      fileName: string;
      totalSize: number;
      bytesTransferred: number;
      startTime: number;
      paused: boolean;
      cancelled: boolean;
    }
  >();

  private chunkBuffer = new Map<string, Uint8Array[]>();

  async readFileAsBuffer(filePath: string): Promise<ArrayBuffer> {
    const base64Data = await RNFS.readFile(filePath, 'base64');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async computeSha256(filePath: string): Promise<string> {
    const buffer = await this.readFileAsBuffer(filePath);
    const uint8Array = new Uint8Array(buffer);
    return sha256(uint8Array);
  }

  async saveFile(fileId: string, fileName: string, buffer: ArrayBuffer): Promise<string> {
    const documentsDir = RNFS.DocumentDirectoryPath;
    const savePath = `${documentsDir}/${fileId}_${fileName}`;

    const uint8Array = new Uint8Array(buffer);
    const binaryString = String.fromCharCode.apply(null, Array.from(uint8Array) as any);
    const base64Data = btoa(binaryString);

    await RNFS.writeFile(savePath, base64Data, 'base64');
    return savePath;
  }

  createTransferChunks(
    buffer: ArrayBuffer,
    chunkSize: number = 64 * 1024
  ): ArrayBuffer[] {
    const chunks: ArrayBuffer[] = [];
    const uint8Array = new Uint8Array(buffer);

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
      chunks.push(chunk.buffer);
    }

    return chunks;
  }

  createChunkWithHeader(
    fileId: string,
    chunkIndex: number,
    chunkData: ArrayBuffer
  ): ArrayBuffer {
    const header = new ArrayBuffer(8);
    const headerView = new DataView(header);

    // Write fileId hash (4 bytes) - simplified
    const fileIdHash = this.hashFileId(fileId);
    headerView.setUint32(0, fileIdHash, true);

    // Write chunk index (4 bytes)
    headerView.setUint32(4, chunkIndex, true);

    // Concatenate header + chunk data
    const combined = new Uint8Array(header.byteLength + chunkData.byteLength);
    combined.set(new Uint8Array(header), 0);
    combined.set(new Uint8Array(chunkData), header.byteLength);

    return combined.buffer;
  }

  parseChunkWithHeader(buffer: ArrayBuffer): {
    fileId: number;
    chunkIndex: number;
    data: ArrayBuffer;
  } {
    const view = new DataView(buffer);
    const fileId = view.getUint32(0, true);
    const chunkIndex = view.getUint32(4, true);
    const data = buffer.slice(8);

    return { fileId, chunkIndex, data };
  }

  private hashFileId(fileId: string): number {
    let hash = 0;
    for (let i = 0; i < fileId.length; i++) {
      const char = fileId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  startTransfer(
    fileId: string,
    fileName: string,
    totalSize: number
  ): void {
    this.activeTransfers.set(fileId, {
      fileId,
      fileName,
      totalSize,
      bytesTransferred: 0,
      startTime: Date.now(),
      paused: false,
      cancelled: false,
    });

    this.chunkBuffer.set(fileId, []);
  }

  updateTransferProgress(fileId: string, bytesAdded: number): void {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer && !transfer.cancelled) {
      transfer.bytesTransferred += bytesAdded;
    }
  }

  getTransferStats(fileId: string): {
    progress: number;
    speed: number;
    eta: number;
  } {
    const transfer = this.activeTransfers.get(fileId);
    if (!transfer) {
      return { progress: 0, speed: 0, eta: 0 };
    }

    const elapsedMs = Date.now() - transfer.startTime;
    const elapsedSecs = Math.max(elapsedMs / 1000, 0.1);
    const speedBytesPerSec = transfer.bytesTransferred / elapsedSecs;
    const remainingBytes = transfer.totalSize - transfer.bytesTransferred;
    const etaSecs = speedBytesPerSec > 0 ? remainingBytes / speedBytesPerSec : 0;

    return {
      progress: (transfer.bytesTransferred / transfer.totalSize) * 100,
      speed: speedBytesPerSec,
      eta: etaSecs,
    };
  }

  pauseTransfer(fileId: string): void {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.paused = true;
    }
  }

  resumeTransfer(fileId: string): void {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.paused = false;
    }
  }

  cancelTransfer(fileId: string): void {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.cancelled = true;
    }

    this.activeTransfers.delete(fileId);
    this.chunkBuffer.delete(fileId);
  }

  addReceivedChunk(fileId: string, chunk: Uint8Array): void {
    const chunks = this.chunkBuffer.get(fileId);
    if (chunks) {
      chunks.push(chunk);
    }
  }

  getReceivedBuffer(fileId: string): ArrayBuffer {
    const chunks = this.chunkBuffer.get(fileId) || [];
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const buffer = new Uint8Array(totalSize);

    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    return buffer.buffer;
  }

  async verifyFileIntegrity(
    fileId: string,
    expectedSha256: string
  ): Promise<boolean> {
    const buffer = this.getReceivedBuffer(fileId);
    const uint8Array = new Uint8Array(buffer);
    const calculatedSha256 = sha256(uint8Array);

    return calculatedSha256 === expectedSha256;
  }

  completeTransfer(fileId: string): void {
    this.activeTransfers.delete(fileId);
    this.chunkBuffer.delete(fileId);
  }

  getActiveTransfers(): string[] {
    return Array.from(this.activeTransfers.keys());
  }

  isTransferActive(fileId: string): boolean {
    const transfer = this.activeTransfers.get(fileId);
    return transfer ? !transfer.cancelled && !transfer.paused : false;
  }
}
