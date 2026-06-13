import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {getSessionEvents, getConnectivityLog, listSessions} from '../db/database';
import type {SessionRow, EventRow, ConnectivityEntry} from '../db/database';

const EXPORT_DIR = `${RNFS.DownloadDirectoryPath}/samsung-debug`;

async function ensureDir(): Promise<void> {
  const exists = await RNFS.exists(EXPORT_DIR);
  if (!exists) {
    await RNFS.mkdir(EXPORT_DIR);
  }
}

function parsePayload(row: EventRow): Record<string, unknown> {
  try {
    return JSON.parse(row.payload);
  } catch {
    return {};
  }
}

// ── JSON export ───────────────────────────────────────────────────────────────

export async function exportSessionJson(session: SessionRow): Promise<string> {
  await ensureDir();
  const events = (await getSessionEvents(session.id)).map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    type: row.type,
    payload: parsePayload(row),
  }));

  const data = {
    session: {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    },
    events,
  };

  const path = `${EXPORT_DIR}/${session.id}.json`;
  await RNFS.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  return path;
}

// ── CSV export ────────────────────────────────────────────────────────────────

const CSV_HEADERS =
  'timestamp,type,dBm,asu,level,networkType,callState,audioFocus\n';

function rowToCsv(row: EventRow): string {
  const p = parsePayload(row) as Record<string, unknown>;
  const cols = [
    row.timestamp,
    row.type,
    p.dBm ?? '',
    p.asu ?? '',
    p.level ?? '',
    p.networkType ?? p.type ?? '',
    p.state ?? '',
    p.focus ?? '',
  ];
  return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
}

export async function exportSessionCsv(session: SessionRow): Promise<string> {
  await ensureDir();
  const events = await getSessionEvents(session.id);
  const csv = CSV_HEADERS + events.map(rowToCsv).join('');

  const path = `${EXPORT_DIR}/${session.id}.csv`;
  await RNFS.writeFile(path, csv, 'utf8');
  return path;
}

// ── All-sessions consolidated export ─────────────────────────────────────────

export async function exportAllSessionsJson(): Promise<string> {
  await ensureDir();
  const sessions = await listSessions();
  const data = await Promise.all(
    sessions.map(async session => ({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      flagged: session.flagged ?? false,
      events: (await getSessionEvents(session.id)).map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type,
        payload: parsePayload(row),
      })),
    })),
  );
  const path = `${EXPORT_DIR}/all-sessions.json`;
  await RNFS.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  return path;
}

const ALL_CSV_HEADERS =
  'session_id,timestamp,type,dBm,asu,level,networkType,callState,audioFocus\n';

function rowToAllCsv(sessionId: string, row: EventRow): string {
  const p = parsePayload(row) as Record<string, unknown>;
  const cols = [
    sessionId,
    row.timestamp,
    row.type,
    p.dBm ?? '',
    p.asu ?? '',
    p.level ?? '',
    p.networkType ?? p.type ?? '',
    p.state ?? '',
    p.focus ?? '',
  ];
  return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
}

export async function exportAllSessionsCsv(): Promise<string> {
  await ensureDir();
  const sessions = await listSessions();
  const rows = await Promise.all(
    sessions.map(async session => {
      const events = await getSessionEvents(session.id);
      return events.map(row => rowToAllCsv(session.id, row)).join('');
    }),
  );
  const path = `${EXPORT_DIR}/all-sessions.csv`;
  await RNFS.writeFile(path, ALL_CSV_HEADERS + rows.join(''), 'utf8');
  return path;
}

// ── Connectivity log exports ──────────────────────────────────────────────────

export async function exportConnectivityLogJson(): Promise<string> {
  await ensureDir();
  const entries = await getConnectivityLog();
  const path = `${EXPORT_DIR}/connectivity-log.json`;
  await RNFS.writeFile(path, JSON.stringify(entries, null, 2), 'utf8');
  return path;
}

const CONNECTIVITY_CSV_HEADERS = 'id,timestamp,level,dBm,networkType\n';

function connectivityEntryToCsv(entry: ConnectivityEntry): string {
  const cols = [entry.id, entry.timestamp, entry.level, entry.dBm, entry.networkType];
  return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
}

export async function exportConnectivityLogCsv(): Promise<string> {
  await ensureDir();
  const entries = await getConnectivityLog();
  const csv = CONNECTIVITY_CSV_HEADERS + entries.map(connectivityEntryToCsv).join('');
  const path = `${EXPORT_DIR}/connectivity-log.csv`;
  await RNFS.writeFile(path, csv, 'utf8');
  return path;
}

// ── Share helper ──────────────────────────────────────────────────────────────

export async function shareFile(filePath: string): Promise<void> {
  await Share.open({
    url: `file://${filePath}`,
    failOnCancel: false,
  });
}
