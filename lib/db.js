import { createClient } from "@libsql/client";

/* Single libsql client: Turso in production (env vars), local file in dev. */
let client = null;
function getClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // Force hrana-over-HTTPS: the default libsql:// transport is WebSocket,
    // which hangs behind HTTP egress proxies. Turso serves HTTP on the same host.
    const httpUrl = url.startsWith("libsql://") ? "https://" + url.slice("libsql://".length) : url;
    client = createClient({ url: httpUrl, authToken: process.env.TURSO_AUTH_TOKEN || "" });
  } else {
    client = createClient({ url: "file:local-dev.db" });
  }
  return client;
}

let schemaReady = null;
export function ensureSchema() {
  if (!schemaReady) {
    const db = getClient();
    schemaReady = (async () => {
      await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE COLLATE NOCASE,
          pass_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS states (
          user_id INTEGER PRIMARY KEY REFERENCES users(id),
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export function emptyState() {
  return { custom: [], days: {} };
}

export async function createUser(username, passHash, salt) {
  await ensureSchema();
  const db = getClient();
  const now = new Date().toISOString();
  const res = await db.execute({
    sql: "INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)",
    args: [username, passHash, salt, now],
  });
  const userId = Number(res.lastInsertRowid);
  await db.execute({
    sql: "INSERT INTO states (user_id, state_json, updated_at) VALUES (?, ?, ?)",
    args: [userId, JSON.stringify(emptyState()), now],
  });
  return userId;
}

export async function getUserByUsername(username) {
  await ensureSchema();
  const db = getClient();
  const rs = await db.execute({
    sql: "SELECT id, username, pass_hash, salt FROM users WHERE username = ?",
    args: [username],
  });
  return rs.rows.length ? rs.rows[0] : null;
}

export async function getUserById(id) {
  await ensureSchema();
  const db = getClient();
  const rs = await db.execute({
    sql: "SELECT id, username FROM users WHERE id = ?",
    args: [id],
  });
  return rs.rows.length ? rs.rows[0] : null;
}

export async function getState(userId) {
  await ensureSchema();
  const db = getClient();
  const rs = await db.execute({
    sql: "SELECT state_json FROM states WHERE user_id = ?",
    args: [userId],
  });
  if (!rs.rows.length) return null;
  try {
    return JSON.parse(rs.rows[0].state_json);
  } catch {
    return null;
  }
}

export async function putState(userId, state) {
  await ensureSchema();
  const db = getClient();
  await db.execute({
    sql: `INSERT INTO states (user_id, state_json, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
    args: [userId, JSON.stringify(state), new Date().toISOString()],
  });
}
