import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

async function runDatabaseTests() {
  console.log('=== Running Astra Copilot SQLite Storage Tests ===\n');

  // Load wasm binary
  const wasmPath = path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
  const wasmBuffer = fs.readFileSync(wasmPath);
  const wasmBinary = wasmBuffer.buffer.slice(wasmBuffer.byteOffset, wasmBuffer.byteOffset + wasmBuffer.byteLength);

  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database();

  // Create tables
  db.run(`
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
      best_answer_candidates TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  console.log('[PASS] SQLite Tables initialized successfully');

  // Insert Conversation
  const convId = 'test-conv-001';
  const now = Date.now();
  db.run(`INSERT INTO conversations VALUES (?, ?, ?, ?)`, [convId, 'Test Conversation', now, now]);

  const convs = db.exec(`SELECT * FROM conversations WHERE id = '${convId}'`);
  assert(convs[0].values.length === 1, 'Conversation inserted and retrieved');
  assert(convs[0].values[0][1] === 'Test Conversation', 'Conversation title matches');

  // Insert Messages
  db.run(
    `INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['msg-1', convId, 'user', 'Hello Astra Copilot', now, null, null, null, null, 0, null]
  );
  db.run(
    `INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['msg-2', convId, 'assistant', 'Hello! How can I help you today?', now + 100, 'gemini', 'gemini-2.5-flash', 'general_knowledge', null, 0, null]
  );

  const msgs = db.exec(`SELECT * FROM messages WHERE conversation_id = '${convId}' ORDER BY created_at ASC`);
  assert(msgs[0].values.length === 2, 'Two messages stored and retrieved');
  assert(msgs[0].values[0][2] === 'user', 'User message role matches');
  assert(msgs[0].values[1][2] === 'assistant', 'Assistant message role matches');
  assert(msgs[0].values[1][6] === 'gemini-2.5-flash', 'Model name correctly persisted');

  // Test Settings Storage
  db.run(`INSERT OR REPLACE INTO settings VALUES (?, ?)`, ['alwaysOnTop', JSON.stringify(true)]);
  const settingRes = db.exec(`SELECT value FROM settings WHERE key = 'alwaysOnTop'`);
  assert(JSON.parse(String(settingRes[0].values[0][0])) === true, 'Settings read/write verified');

  // Test SQLite Export & In-Memory Persistence
  const exported = db.export();
  assert(exported.length > 0, `SQLite exported binary size: ${exported.length} bytes`);

  // Reload database from exported binary
  const reloadedDb = new SQL.Database(exported);
  const verifyReload = reloadedDb.exec(`SELECT title FROM conversations WHERE id = '${convId}'`);
  assert(verifyReload[0].values[0][0] === 'Test Conversation', 'Reload from binary buffer successful');

  console.log('\n=== ALL SQLITE STORAGE TESTS PASSED SUCCESSFULLY! ===');
}

runDatabaseTests().catch((err) => {
  console.error('Database tests failed:', err);
  process.exit(1);
});
