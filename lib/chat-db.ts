import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import Database from "better-sqlite3";

import type { ChatMessage, ChatSeed } from "@/lib/briefly-tools";
import type { ChatThread } from "@/lib/briefly-workspace";

const DB_PATH =
  process.env.BRIEFLY_CHAT_DB_PATH?.trim() ||
  join(process.cwd(), "data", "briefly.db");

let dbInstance: Database.Database | null = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id TEXT PRIMARY KEY,
      owner_key TEXT,
      tool_id TEXT,
      tool_name TEXT,
      summary TEXT,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      kind TEXT,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at
      ON chat_threads(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id
      ON chat_messages(thread_id, created_at ASC, id ASC);
  `);

  const threadColumns = db
    .prepare(`PRAGMA table_info(chat_threads)`)
    .all() as Array<Record<string, unknown>>;
  const hasOwnerKeyColumn = threadColumns.some((column) => column.name === "owner_key");

  if (!hasOwnerKeyColumn) {
    db.exec(`ALTER TABLE chat_threads ADD COLUMN owner_key TEXT;`);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_threads_owner_updated_at
      ON chat_threads(owner_key, updated_at DESC);
  `);

  dbInstance = db;
  return db;
}

function mapMessageRow(row: Record<string, unknown>): ChatMessage {
  return {
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content || ""),
    ...(row.kind ? { kind: row.kind as ChatMessage["kind"] } : {}),
  };
}

function mapThreadRow(
  row: Record<string, unknown>,
  messages: ChatMessage[],
): ChatThread {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    context:
      row.tool_id && row.tool_name && row.summary
        ? {
            toolId: row.tool_id as ChatSeed["toolId"],
            toolName: String(row.tool_name),
            summary: String(row.summary),
          }
        : null,
    messages,
    updatedAt: Number(row.updated_at || Date.now()),
  };
}

function getMessagesByThreadIds(threadIds: string[]) {
  if (threadIds.length === 0) {
    return new Map<string, ChatMessage[]>();
  }

  const db = getDb();
  const placeholders = threadIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT thread_id, role, kind, content
       FROM chat_messages
       WHERE thread_id IN (${placeholders})
       ORDER BY created_at ASC, id ASC`,
    )
    .all(...threadIds) as Record<string, unknown>[];

  const grouped = new Map<string, ChatMessage[]>();

  for (const row of rows) {
    const threadId = String(row.thread_id);
    const bucket = grouped.get(threadId) ?? [];
    bucket.push(mapMessageRow(row));
    grouped.set(threadId, bucket);
  }

  return grouped;
}

export function listChatThreads() {
  const db = getDb();
  const threadRows = db
    .prepare(
      `SELECT id, tool_id, tool_name, summary, title, updated_at
       FROM chat_threads
       ORDER BY updated_at DESC
       LIMIT 24`,
    )
    .all() as Record<string, unknown>[];

  const groupedMessages = getMessagesByThreadIds(
    threadRows.map((row) => String(row.id)),
  );

  return threadRows.map((row) =>
    mapThreadRow(row, groupedMessages.get(String(row.id)) ?? []),
  );
}

export function listChatThreadPreviews(ownerKey: string) {
  const db = getDb();
  const threadRows = db
    .prepare(
      `SELECT id, owner_key, tool_id, tool_name, summary, title, updated_at
       FROM chat_threads
       WHERE owner_key = ?
       ORDER BY updated_at DESC
       LIMIT 24`,
    )
    .all(ownerKey) as Record<string, unknown>[];

  return threadRows.map((row) => mapThreadRow(row, []));
}

export function getChatThread(threadId: string, ownerKey: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, owner_key, tool_id, tool_name, summary, title, updated_at
       FROM chat_threads
       WHERE id = ? AND owner_key = ?`,
    )
    .get(threadId, ownerKey) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  const messages = db
    .prepare(
      `SELECT role, kind, content
       FROM chat_messages
       WHERE thread_id = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .all(threadId) as Record<string, unknown>[]
    ;
  const normalizedMessages = messages.map(mapMessageRow);

  return mapThreadRow(row, normalizedMessages);
}

export function createChatThread(params: {
  context: ChatSeed | null;
  id: string;
  messages: ChatMessage[];
  ownerKey: string;
  title: string;
}) {
  const { context, id, messages, ownerKey, title } = params;
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `INSERT INTO chat_threads (
      id, owner_key, tool_id, tool_name, summary, title, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    ownerKey,
    context?.toolId ?? null,
    context?.toolName ?? null,
    context?.summary ?? null,
    title,
    now,
    now,
  );

  const insertMessage = db.prepare(
    `INSERT INTO chat_messages (thread_id, role, kind, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );

  for (const message of messages) {
    insertMessage.run(
      id,
      message.role,
      message.kind ?? null,
      message.content,
      now,
    );
  }

  return getChatThread(id, ownerKey);
}

export function appendChatMessage(threadId: string, ownerKey: string, message: ChatMessage) {
  const db = getDb();
  const now = Date.now();

  const threadExists = db
    .prepare(`SELECT 1 FROM chat_threads WHERE id = ? AND owner_key = ?`)
    .get(threadId, ownerKey);

  if (!threadExists) {
    return false;
  }

  db.prepare(
    `INSERT INTO chat_messages (thread_id, role, kind, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(threadId, message.role, message.kind ?? null, message.content, now);

  db.prepare(`UPDATE chat_threads SET updated_at = ? WHERE id = ?`).run(now, threadId);
  return true;
}

export function replaceChatMessages(
  threadId: string,
  ownerKey: string,
  messages: ChatMessage[],
) {
  const db = getDb();
  const now = Date.now();
  const insertMessage = db.prepare(
    `INSERT INTO chat_messages (thread_id, role, kind, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const transaction = db.transaction(() => {
    const threadExists = db
      .prepare(`SELECT 1 FROM chat_threads WHERE id = ? AND owner_key = ?`)
      .get(threadId, ownerKey);

    if (!threadExists) {
      return;
    }

    db.prepare(`DELETE FROM chat_messages WHERE thread_id = ?`).run(threadId);

    for (const [index, message] of messages.entries()) {
      insertMessage.run(
        threadId,
        message.role,
        message.kind ?? null,
        message.content,
        now + index,
      );
    }

    db.prepare(`UPDATE chat_threads SET updated_at = ? WHERE id = ?`).run(now, threadId);
  });

  transaction();
}
