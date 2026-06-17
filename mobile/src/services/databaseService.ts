import * as SQLite from 'expo-sqlite';
import { Message } from '../../../shared/types';
import { useSettingsStore } from '../store/connectionStore';

class DatabaseServiceImpl {
  private db: SQLite.SQLiteDatabase | null = null;
  private static instance: DatabaseServiceImpl;

  static getInstance(): DatabaseServiceImpl {
    if (!DatabaseServiceImpl.instance) {
      DatabaseServiceImpl.instance = new DatabaseServiceImpl();
    }
    return DatabaseServiceImpl.instance;
  }

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('peerlink.db');
    await this.createTables();
    await this.loadSettings();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        fileName TEXT,
        fileSize INTEGER,
        fileMimeType TEXT,
        filePath TEXT,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        transferProgress REAL
      );
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        peerId TEXT,
        peerName TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_messages_roomId ON messages(roomId);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
  }

  async saveMessage(message: Message): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync(
      `INSERT OR REPLACE INTO messages (
        id, roomId, senderId, type, content, fileName, fileSize,
        fileMimeType, filePath, status, timestamp, transferProgress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id, message.roomId, message.senderId, message.type,
        message.content || null, message.fileName || null, message.fileSize ?? null,
        message.fileMimeType || null, message.filePath || null,
        message.status, message.timestamp, message.transferProgress ?? null,
      ]
    );
  }

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'error'): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync('UPDATE messages SET status = ? WHERE id = ?', [status, messageId]);
  }

  async updateMessageProgress(messageId: string, progress: number): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync('UPDATE messages SET transferProgress = ? WHERE id = ?', [progress, messageId]);
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    if (!this.db) throw new Error('DB not initialized');
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM messages WHERE roomId = ? ORDER BY timestamp ASC', [roomId]
    );
    return rows.map((r) => ({
      id: r.id, roomId: r.roomId, senderId: r.senderId, type: r.type,
      content: r.content || '', fileName: r.fileName || undefined,
      fileSize: r.fileSize ?? undefined, fileMimeType: r.fileMimeType || undefined,
      filePath: r.filePath || undefined, status: r.status,
      timestamp: r.timestamp, transferProgress: r.transferProgress ?? undefined,
    }));
  }

  async deleteMessagesForRoom(roomId: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync('DELETE FROM messages WHERE roomId = ?', [roomId]);
  }

  async deleteAllMessages(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync('DELETE FROM messages');
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now'))",
      [key, value]
    );
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('DB not initialized');
    const row = await this.db.getFirstAsync<any>('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  }

  private async loadSettings(): Promise<void> {
    if (!this.db) return;
    const store = useSettingsStore.getState();
    const name = await this.getSetting('displayName');
    if (name) store.setDisplayName(name);
    const serverUrl = await this.getSetting('signalingServerUrl');
    if (serverUrl) store.setSignalingServerUrl(serverUrl);
    const turnUrl = await this.getSetting('customTurnUrl');
    const turnUser = await this.getSetting('customTurnUsername');
    const turnCred = await this.getSetting('customTurnCredential');
    if (turnUrl) store.setCustomTurn(turnUrl, turnUser || '', turnCred || '');
  }

  async saveSettingsToDb(): Promise<void> {
    if (!this.db) return;
    const s = useSettingsStore.getState();
    const ops: Promise<void>[] = [
      this.setSetting('displayName', s.displayName),
      this.setSetting('signalingServerUrl', s.signalingServerUrl),
    ];
    if (s.customTurnUrl) {
      ops.push(
        this.setSetting('customTurnUrl', s.customTurnUrl),
        this.setSetting('customTurnUsername', s.customTurnUsername || ''),
        this.setSetting('customTurnCredential', s.customTurnCredential || ''),
      );
    }
    await Promise.all(ops);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const DatabaseService = DatabaseServiceImpl;
