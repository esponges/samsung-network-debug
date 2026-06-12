import {open, type DB} from '@op-engineering/op-sqlite';
import {CREATE_EVENTS_TABLE, CREATE_SESSIONS_TABLE} from './schema';
import type {TelephonyEventType} from '../native/TelephonyModule';

let db: DB;

export function initDatabase(): void {
  db = open({name: 'samsung_debug.db'});
  db.executeSync(CREATE_SESSIONS_TABLE);
  db.executeSync(CREATE_EVENTS_TABLE);
}

export function getDb(): DB {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function insertSession(id: string, startedAt: number): void {
  getDb().executeSync(
    'INSERT INTO sessions (id, startedAt, endedAt) VALUES (?, ?, NULL)',
    [id, startedAt],
  );
}

export function closeSession(id: string, endedAt: number): void {
  getDb().executeSync('UPDATE sessions SET endedAt = ? WHERE id = ?', [
    endedAt,
    id,
  ]);
}

// ── Events ────────────────────────────────────────────────────────────────────

export function insertEvent(
  id: string,
  sessionId: string | null,
  timestamp: number,
  type: TelephonyEventType,
  payload: object,
): void {
  getDb().executeSync(
    'INSERT INTO events (id, sessionId, timestamp, type, payload) VALUES (?, ?, ?, ?, ?)',
    [id, sessionId, timestamp, type, JSON.stringify(payload)],
  );
}

// ── Queries ───────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  startedAt: number;
  endedAt: number | null;
  eventCount: number;
  minDbm: number | null;
  callStateChanges: number;
}

export function listSessions(): SessionRow[] {
  const result = getDb().executeSync(`
    SELECT
      s.id,
      s.startedAt,
      s.endedAt,
      COUNT(e.id)                                              AS eventCount,
      MIN(CAST(json_extract(e.payload, '$.dBm') AS INTEGER))  AS minDbm,
      SUM(CASE WHEN e.type = 'call_state' THEN 1 ELSE 0 END)  AS callStateChanges
    FROM sessions s
    LEFT JOIN events e ON e.sessionId = s.id
    GROUP BY s.id
    ORDER BY s.startedAt DESC
  `);
  return (result.rows ?? []) as unknown as SessionRow[];
}

export interface EventRow {
  id: string;
  sessionId: string | null;
  timestamp: number;
  type: TelephonyEventType;
  payload: string; // JSON string — parse on use
}

export function getSessionEvents(sessionId: string): EventRow[] {
  const result = getDb().executeSync(
    'SELECT id, sessionId, timestamp, type, payload FROM events WHERE sessionId = ? ORDER BY timestamp ASC',
    [sessionId],
  );
  return (result.rows ?? []) as unknown as EventRow[];
}
