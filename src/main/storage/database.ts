import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';

export class AppDatabase {
  private static instance: AppDatabase | null = null;
  private db: SqlJsDatabase | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbPath: string;
  private isMemoryOnly: boolean = false;

  private constructor() {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'astra_copilot.sqlite');
  }

  public static getInstance(): AppDatabase {
    if (!AppDatabase.instance) {
      AppDatabase.instance = new AppDatabase();
    }
    return AppDatabase.instance;
  }

  public async initialize(rememberConversations: boolean = true): Promise<void> {
    this.isMemoryOnly = !rememberConversations;

    // Locate sql-wasm.wasm
    // In dev: node_modules/sql.js/dist/sql-wasm.wasm
    // In pack: process.resourcesPath/sql-wasm.wasm or app path
    const wasmPaths = [
      path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
      path.join(process.resourcesPath || '', 'sql-wasm.wasm'),
      path.join(app.getAppPath(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
    ];

    let wasmBinary: ArrayBuffer | undefined;
    for (const p of wasmPaths) {
      if (fs.existsSync(p)) {
        const fileBuf = fs.readFileSync(p);
        wasmBinary = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength) as ArrayBuffer;
        break;
      }
    }

    this.SQL = await initSqlJs({
      wasmBinary,
      locateFile: (file) => {
        for (const p of wasmPaths) {
          if (fs.existsSync(p)) return p;
        }
        return file;
      },
    });

    let buffer: Buffer | null = null;
    if (!this.isMemoryOnly && fs.existsSync(this.dbPath)) {
      try {
        buffer = fs.readFileSync(this.dbPath);
      } catch (err) {
        console.warn('Could not read existing SQLite database, creating new one', err);
      }
    }

    if (buffer) {
      this.db = new this.SQL.Database(new Uint8Array(buffer));
    } else {
      this.db = new this.SQL.Database();
    }

    this.initTables();
  }

  private initTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        provider TEXT,
        model TEXT,
        category TEXT,
        web_sources TEXT,
        is_best_answer INTEGER DEFAULT 0,
        best_answer_candidates TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    `);

    this.persist();
  }

  public persist(): void {
    if (this.isMemoryOnly || !this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('Failed to persist SQLite database to disk:', err);
    }
  }

  public setMemoryOnly(memoryOnly: boolean): void {
    this.isMemoryOnly = memoryOnly;
    if (memoryOnly && fs.existsSync(this.dbPath)) {
      try {
        fs.unlinkSync(this.dbPath);
      } catch {}
    }
  }

  public getDb(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }
    return this.db;
  }
}
