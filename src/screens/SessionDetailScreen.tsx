import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {
  getSessionEvents,
  listSessions,
  flagSession,
  type EventRow,
  type SessionRow,
} from '../db/database';
import {
  exportSessionJson,
  exportSessionCsv,
  shareFile,
} from '../services/ExportService';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

const EVENT_COLORS: Record<string, string> = {
  signal_strength: '#60a5fa',
  call_state: '#34d399',
  audio_focus: '#f59e0b',
  network_type: '#a78bfa',
};

function parsePayload(row: EventRow): Record<string, unknown> {
  try {
    return JSON.parse(row.payload);
  } catch {
    return {};
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function eventSummary(row: EventRow): string {
  const p = parsePayload(row);
  switch (row.type) {
    case 'signal_strength':
      return `${p.dBm} dBm  level ${p.level}  ${p.networkType}`;
    case 'call_state':
      return `→ ${p.state}`;
    case 'audio_focus':
      return `focus: ${p.focus}`;
    case 'network_type':
      return `net: ${p.type}`;
    default:
      return JSON.stringify(p);
  }
}

// Minimal ASCII-style sparkline from dBm values
function Sparkline({events}: {events: EventRow[]}) {
  const signalEvents = events.filter(e => e.type === 'signal_strength');
  if (signalEvents.length === 0) {
    return null;
  }

  const dbmValues = signalEvents.map(e => {
    const p = parsePayload(e);
    return typeof p.dBm === 'number' ? p.dBm : -999;
  });

  const min = Math.min(...dbmValues);
  const max = Math.max(...dbmValues);
  const range = max - min || 1;
  const HEIGHT = 40;
  const BAR_W = 4;

  const bars = dbmValues.map((v, i) => {
    const normalized = (v - min) / range;
    const h = Math.max(2, Math.round(normalized * HEIGHT));
    const color = v < -105 ? '#f87171' : v < -90 ? '#f59e0b' : '#34d399';
    return (
      <View
        key={i}
        style={{
          width: BAR_W,
          height: h,
          backgroundColor: color,
          marginHorizontal: 1,
          alignSelf: 'flex-end',
        }}
      />
    );
  });

  return (
    <View style={styles.sparkContainer}>
      <Text style={styles.sparkLabel}>
        Signal strength: {min} – {max} dBm
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{flexDirection: 'row', height: HEIGHT, alignItems: 'flex-end'}}>
          {bars}
        </View>
      </ScrollView>
    </View>
  );
}

export default function SessionDetailScreen({route}: Props) {
  const {sessionId} = route.params;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [session, setSession] = useState<SessionRow | undefined>();

  useFocusEffect(
    useCallback(() => {
      Promise.all([getSessionEvents(sessionId), listSessions()]).then(
        ([evts, sessions]) => {
          setEvents(evts);
          setSession(sessions.find(s => s.id === sessionId));
        },
      );
    }, [sessionId]),
  );

  const handleExportJson = async () => {
    if (!session) {
      return;
    }
    try {
      const path = await exportSessionJson(session);
      await shareFile(path);
    } catch (e: unknown) {
      Alert.alert('Export failed', String(e));
    }
  };

  const handleExportCsv = async () => {
    if (!session) {
      return;
    }
    try {
      const path = await exportSessionCsv(session);
      await shareFile(path);
    } catch (e: unknown) {
      Alert.alert('Export failed', String(e));
    }
  };

  const handleToggleFlag = async () => {
    if (!session) {
      return;
    }
    const next = !session.flagged;
    await flagSession(session.id, next);
    setSession({...session, flagged: next});
  };

  const renderEvent = ({item}: {item: EventRow}) => (
    <View style={[styles.event, {borderLeftColor: EVENT_COLORS[item.type] ?? '#fff'}]}>
      <Text style={styles.eventTime}>{formatTime(item.timestamp)}</Text>
      <Text style={[styles.eventType, {color: EVENT_COLORS[item.type] ?? '#fff'}]}>
        {item.type}
      </Text>
      <Text style={styles.eventSummary}>{eventSummary(item)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Sparkline events={events} />

      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportJson}>
          <Text style={styles.exportBtnText}>Export JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
          <Text style={styles.exportBtnText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.flagBtn, session?.flagged && styles.flagBtnActive]}
        onPress={handleToggleFlag}>
        <Text style={[styles.flagBtnText, session?.flagged && styles.flagBtnTextActive]}>
          {session?.flagged ? '⚑ Marked as Problematic' : '⚐ Mark as Problematic'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        renderItem={renderEvent}
        contentContainerStyle={{padding: 12, gap: 6}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  sparkContainer: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    gap: 6,
  },
  sparkLabel: {color: '#aaa', fontSize: 12},
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exportBtnText: {color: '#60a5fa', fontSize: 14, fontWeight: '600'},
  flagBtn: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f87171',
    backgroundColor: 'transparent',
  },
  flagBtnActive: {
    backgroundColor: '#7f1d1d',
  },
  flagBtnText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  flagBtnTextActive: {
    color: '#fca5a5',
  },
  event: {
    backgroundColor: '#1e1e2e',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    gap: 2,
  },
  eventTime: {color: '#666', fontSize: 11},
  eventType: {fontSize: 12, fontWeight: '600'},
  eventSummary: {color: '#ddd', fontSize: 13},
});
