import AsyncStorage from '@react-native-async-storage/async-storage';
import type {TelephonyEventType} from '../native/TelephonyModule';

export interface SessionRow {
  id: string;
  startedAt: number;
  endedAt: number | null;
  eventCount: number;
  minDbm: number | null;
  callStateChanges: number;
}

export interface EventRow {
  id: string;
  sessionId: string | null;
  timestamp: number;
  type: TelephonyEventType;
  payload: string;
}

interface ActiveSession {
  row: SessionRow;
  events: EventRow[];
}

const SESSIONS_KEY = '@snd/sessions';
const eventsKey = (sid: string) => `@snd/events:${sid}`;

const active = new Map<string, ActiveSession>();

export function initDatabase(): void {}

async function loadSessions(): Promise<SessionRow[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? (JSON.parse(raw) as SessionRow[]) : [];
}

async function saveSessions(sessions: SessionRow[]): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function insertSession(id: string, startedAt: number): Promise<void> {
  const row: SessionRow = {
    id,
    startedAt,
    endedAt: null,
    eventCount: 0,
    minDbm: null,
    callStateChanges: 0,
  };
  active.set(id, {row, events: []});
  const sessions = await loadSessions();
  sessions.unshift(row);
  await saveSessions(sessions);
}

export async function closeSession(id: string, endedAt: number): Promise<void> {
  const session = active.get(id);
  if (!session) {
    return;
  }
  active.delete(id);
  session.row.endedAt = endedAt;

  await AsyncStorage.setItem(eventsKey(id), JSON.stringify(session.events));

  const sessions = await loadSessions();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx >= 0) {
    sessions[idx] = session.row;
  }
  await saveSessions(sessions);
}

// Synchronous — events are buffered in memory until closeSession flushes them
export function insertEvent(
  id: string,
  sessionId: string | null,
  timestamp: number,
  type: TelephonyEventType,
  payload: object,
): void {
  if (!sessionId) {
    return;
  }
  const session = active.get(sessionId);
  if (!session) {
    return;
  }

  session.events.push({id, sessionId, timestamp, type, payload: JSON.stringify(payload)});
  session.row.eventCount++;

  if (type === 'signal_strength') {
    const p = payload as {dBm?: number};
    if (typeof p.dBm === 'number') {
      session.row.minDbm =
        session.row.minDbm === null
          ? p.dBm
          : Math.min(session.row.minDbm, p.dBm);
    }
  }
  if (type === 'call_state') {
    session.row.callStateChanges++;
  }
}

export async function listSessions(): Promise<SessionRow[]> {
  return loadSessions();
}

export async function getSessionEvents(sessionId: string): Promise<EventRow[]> {
  const session = active.get(sessionId);
  if (session) {
    return session.events;
  }
  const raw = await AsyncStorage.getItem(eventsKey(sessionId));
  return raw ? (JSON.parse(raw) as EventRow[]) : [];
}
