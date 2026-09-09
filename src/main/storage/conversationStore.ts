import { AppDatabase } from './database';
import { ChatMessage, AIProviderType, RequestCategory, WebSource } from '../../types/ai';
import { ConversationMeta, AppSettings } from '../../types/settings';
import crypto from 'crypto';

export class ConversationStore {
  private db: AppDatabase;

  constructor() {
    this.db = AppDatabase.getInstance();
  }

  public getConversations(): ConversationMeta[] {
    const database = this.db.getDb();
    const result = database.exec(`
      SELECT c.id, c.title, c.created_at, c.updated_at,
             COUNT(m.id) as message_count,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_content
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `);

    if (!result || result.length === 0) {
      return [];
    }

    const rows = result[0].values;
    return rows.map((row) => ({
      id: String(row[0]),
      title: String(row[1]),
      createdAt: Number(row[2]),
      updatedAt: Number(row[3]),
      messageCount: Number(row[4]),
      preview: row[5] ? String(row[5]).slice(0, 100) : 'Empty conversation',
    }));
  }

  public createConversation(title?: string): string {
    const id = crypto.randomUUID();
    const now = Date.now();
    const resolvedTitle = title || 'New Conversation';
    const database = this.db.getDb();

    database.run(
      `INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [id, resolvedTitle, now, now]
    );

    this.db.persist();
    return id;
  }

  public renameConversation(id: string, newTitle: string): boolean {
    const database = this.db.getDb();
    database.run(
      `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`,
      [newTitle, Date.now(), id]
    );
    this.db.persist();
    return true;
  }

  public deleteConversation(id: string): boolean {
    const database = this.db.getDb();
    database.run(`DELETE FROM messages WHERE conversation_id = ?`, [id]);
    database.run(`DELETE FROM conversations WHERE id = ?`, [id]);
    this.db.persist();
    return true;
  }

  public clearAllConversations(): boolean {
    const database = this.db.getDb();
    database.run(`DELETE FROM messages`);
    database.run(`DELETE FROM conversations`);
    this.db.persist();
    return true;
  }

  public getMessages(conversationId: string): ChatMessage[] {
    const database = this.db.getDb();
    const result = database.exec(`
      SELECT id, conversation_id, role, content, created_at, provider, model, category, web_sources, is_best_answer, best_answer_candidates
      FROM messages
      WHERE conversation_id = '${conversationId.replace(/'/g, "''")}'
      ORDER BY created_at ASC
    `);

    if (!result || result.length === 0) {
      return [];
    }

    return result[0].values.map((row) => {
      let webSources: WebSource[] | undefined;
      if (row[8]) {
        try {
          webSources = JSON.parse(String(row[8]));
        } catch {}
      }

      let bestAnswerCandidates = undefined;
      if (row[10]) {
        try {
          bestAnswerCandidates = JSON.parse(String(row[10]));
        } catch {}
      }

      return {
        id: String(row[0]),
        conversationId: String(row[1]),
        role: row[2] as 'user' | 'assistant' | 'system',
        content: String(row[3]),
        createdAt: Number(row[4]),
        provider: (row[5] as AIProviderType) || undefined,
        model: row[6] ? String(row[6]) : undefined,
        category: (row[7] as RequestCategory) || undefined,
        webSources,
        isBestAnswer: Boolean(row[9]),
        bestAnswerCandidates,
      };
    });
  }

  public addMessage(message: ChatMessage): void {
    const database = this.db.getDb();
    const webSourcesStr = message.webSources ? JSON.stringify(message.webSources) : null;
    const bestCandidatesStr = message.bestAnswerCandidates ? JSON.stringify(message.bestAnswerCandidates) : null;

    // Check if conversation exists, if not create it
    const convCheck = database.exec(`SELECT id FROM conversations WHERE id = '${message.conversationId.replace(/'/g, "''")}'`);
    if (!convCheck || convCheck.length === 0 || convCheck[0].values.length === 0) {
      const initialTitle = message.content.slice(0, 32).trim() || 'New Conversation';
      database.run(
        `INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [message.conversationId, initialTitle, message.createdAt, message.createdAt]
      );
    } else {
      database.run(
        `UPDATE conversations SET updated_at = ? WHERE id = ?`,
        [message.createdAt, message.conversationId]
      );
    }

    database.run(
      `INSERT INTO messages (id, conversation_id, role, content, created_at, provider, model, category, web_sources, is_best_answer, best_answer_candidates)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.createdAt,
        message.provider || null,
        message.model || null,
        message.category || null,
        webSourcesStr,
        message.isBestAnswer ? 1 : 0,
        bestCandidatesStr,
      ]
    );

    this.db.persist();
  }

  public exportConversation(conversationId: string, format: 'json' | 'markdown'): string {
    const messages = this.getMessages(conversationId);
    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    }

    // Markdown export
    let md = `# Astra Copilot Conversation Export\n\n`;
    md += `Export Date: ${new Date().toLocaleString()}\n`;
    md += `Messages: ${messages.length}\n\n---\n\n`;

    for (const msg of messages) {
      const roleName = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '✨ Astra Copilot' : '⚙️ System';
      const time = new Date(msg.createdAt).toLocaleTimeString();
      md += `### ${roleName} (${time})\n\n`;
      if (msg.model) {
        md += `*Model: ${msg.model}${msg.isBestAnswer ? ' (Best Answer Synthesized)' : ''}*\n\n`;
      }
      md += `${msg.content}\n\n`;

      if (msg.webSources && msg.webSources.length > 0) {
        md += `**Sources:**\n`;
        for (const src of msg.webSources) {
          md += `- [${src.title}](${src.url})\n`;
        }
        md += `\n`;
      }
      md += `---\n\n`;
    }

    return md;
  }

  // Settings in SQLite
  public getSetting<T>(key: string, fallback: T): T {
    try {
      const database = this.db.getDb();
      const res = database.exec(`SELECT value FROM settings WHERE key = '${key.replace(/'/g, "''")}'`);
      if (res && res.length > 0 && res[0].values.length > 0) {
        return JSON.parse(String(res[0].values[0][0])) as T;
      }
    } catch {}
    return fallback;
  }

  public saveSetting<T>(key: string, value: T): void {
    try {
      const database = this.db.getDb();
      const valStr = JSON.stringify(value);
      database.run(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [key, valStr]
      );
      this.db.persist();
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
    }
  }
}
