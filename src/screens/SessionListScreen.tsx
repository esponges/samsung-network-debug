import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {listSessions, type SessionRow} from '../db/database';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionList'>;

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (endedAt == null) {
    return 'In progress';
  }
  const secs = Math.floor((endedAt - startedAt) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function SessionListScreen({navigation}: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions);
    }, []),
  );

  const renderItem = ({item}: {item: SessionRow}) => (
    <TouchableOpacity
      style={[styles.card, item.flagged && styles.cardFlagged]}
      onPress={() => navigation.navigate('SessionDetail', {sessionId: item.id})}>
      <View style={styles.row}>
        <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
        {item.flagged && <Text style={styles.flagBadge}>⚑ Problematic</Text>}
      </View>
      <View style={styles.row}>
        <Text style={styles.meta}>
          Duration: {formatDuration(item.startedAt, item.endedAt)}
        </Text>
        <Text style={styles.meta}>Events: {item.eventCount}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.meta, item.minDbm !== null && item.minDbm < -100 ? styles.warn : null]}>
          Min dBm: {item.minDbm ?? 'n/a'}
        </Text>
        <Text style={styles.meta}>
          Call transitions: {item.callStateChanges}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {sessions.length === 0 ? (
        <Text style={styles.empty}>No sessions yet. Start monitoring and make a call.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: 16, gap: 12}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  cardFlagged: {
    borderLeftWidth: 3,
    borderLeftColor: '#f87171',
  },
  flagBadge: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  date: {color: '#fff', fontSize: 15, fontWeight: '600'},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  meta: {color: '#aaa', fontSize: 13},
  warn: {color: '#f87171'},
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 80,
    fontSize: 15,
    paddingHorizontal: 32,
  },
});
