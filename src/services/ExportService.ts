import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {getSessionEvents, listSessions} from '../db/database';
import type {SessionRow, EventRow} from '../db/database';

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

// ── Export all → share ────────────────────────────────────────────────────────

export async function exportAll(): Promise<string> {
  await ensureDir();
  const sessions = await listSessions();

  for (const session of sessions) {
    await exportSessionJson(session);
    await exportSessionCsv(session);
  }

  const date = new Date().toISOString().slice(0, 10);

  const filePaths = sessions.flatMap(s => [
    `${EXPORT_DIR}/${s.id}.json`,
    `${EXPORT_DIR}/${s.id}.csv`,
  ]);

  await Share.open({
    urls: filePaths.map(p => `file://${p}`),
    title: `All sessions export (${date})`,
    failOnCancel: false,
  });

  return `${EXPORT_DIR}/all-sessions-${date}`;
}

// ── Share helper ──────────────────────────────────────────────────────────────

export async function shareFile(filePath: string): Promise<void> {
  await Share.open({
    url: `file://${filePath}`,
    failOnCancel: false,
  });
}
