import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getConnectivityLogForDay} from '../db/database';
import type {ConnectivityEntry} from '../db/database';
import {
  exportConnectivityLogCsv,
  exportConnectivityLogJson,
  shareFile,
} from '../services/ExportService';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function levelColor(level: number): string {
  if (level <= 1) return '#f87171';
  if (level <= 3) return '#f59e0b';
  return '#34d399';
}

function levelLabel(level: number): string {
  return ['▂', '▃', '▄', '▅', '▆'][Math.min(level, 4)];
}

// Segment chart: each entry occupies the time span until the next entry.
// The last entry extends to end of day (or now if today).
function SegmentChart({entries, dayStart}: {entries: ConnectivityEntry[]; dayStart: Date}) {
  const {width} = useWindowDimensions();
  const chartWidth = width - 24;
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + DAY_MS;
  const nowMs = Date.now();
  const effectiveEnd = Math.min(dayEndMs, nowMs);

  if (entries.length === 0) {
    return null;
  }

  const segments = entries.map((entry, i) => {
    const segStart = entry.timestamp;
    const segEnd = i + 1 < entries.length ? entries[i + 1].timestamp : effectiveEnd;
    const left = ((segStart - dayStartMs) / DAY_MS) * chartWidth;
    const segWidth = Math.max(2, ((segEnd - segStart) / DAY_MS) * chartWidth);
    return {left, width: segWidth, level: entry.level};
  });

  const hourMarkers = Array.from({length: 5}, (_, i) => i * 6); // 0, 6, 12, 18, 24

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartTrack}>
        {segments.map((seg, i) => (
          <View
            key={i}
            style={[
              styles.chartSegment,
              {
                left: seg.left,
                width: seg.width,
                backgroundColor: levelColor(seg.level),
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.hourRow}>
        {hourMarkers.map(h => (
          <Text key={h} style={styles.hourLabel}>
            {h === 24 ? '' : `${h}:00`}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ConnectivityLogScreen() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [entries, setEntries] = useState<ConnectivityEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getConnectivityLogForDay(day).then(setEntries);
    }, [day]),
  );

  const prevDay = () => setDay(d => startOfDay(new Date(d.getTime() - DAY_MS)));
  const nextDay = () => {
    const next = startOfDay(new Date(day.getTime() + DAY_MS));
    if (next <= startOfDay(new Date())) {
      setDay(next);
    }
  };

  const isToday = day.toDateString() === new Date().toDateString();

  const handleExportJson = async () => {
    try {
      const path = await exportConnectivityLogJson();
      await shareFile(path);
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  const handleExportCsv = async () => {
    try {
      const path = await exportConnectivityLogCsv();
      await shareFile(path);
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  const renderEntry = ({item}: {item: ConnectivityEntry}) => (
    <View style={[styles.entry, {borderLeftColor: levelColor(item.level)}]}>
      <Text style={styles.entryTime}>{formatTime(item.timestamp)}</Text>
      <Text style={[styles.entryLevel, {color: levelColor(item.level)}]}>
        {levelLabel(item.level)} level {item.level}
      </Text>
      <Text style={styles.entryMeta}>
        {item.dBm} dBm · {item.networkType}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Day navigation */}
      <View style={styles.dayNav}>
        <TouchableOpacity onPress={prevDay} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dayLabel}>{formatDate(day)}</Text>
        <TouchableOpacity onPress={nextDay} style={[styles.navBtn, isToday && styles.navBtnDisabled]} disabled={isToday}>
          <Text style={[styles.navBtnText, isToday && styles.navBtnTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {(['0–1 weak', '2–3 fair', '4 strong'] as const).map((label, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: [levelColor(0), levelColor(2), levelColor(4)][i]}]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Chart */}
      {entries.length > 0 ? (
        <SegmentChart entries={entries} dayStart={day} />
      ) : null}

      {/* Export row */}
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportJson}>
          <Text style={styles.exportBtnText}>Export JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
          <Text style={styles.exportBtnText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Entry list */}
      {entries.length === 0 ? (
        <Text style={styles.empty}>No signal data for this day.</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderEntry}
          contentContainerStyle={{padding: 12, gap: 6}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  navBtn: {padding: 8},
  navBtnDisabled: {opacity: 0.3},
  navBtnText: {color: '#fff', fontSize: 24, lineHeight: 26},
  navBtnTextDisabled: {color: '#666'},
  dayLabel: {color: '#fff', fontSize: 16, fontWeight: '600'},
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendText: {color: '#aaa', fontSize: 11},
  chartContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  chartTrack: {
    height: 24,
    backgroundColor: '#1e1e2e',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  chartSegment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  hourLabel: {color: '#444', fontSize: 10},
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exportBtnText: {color: '#60a5fa', fontSize: 14, fontWeight: '600'},
  entry: {
    backgroundColor: '#1e1e2e',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    gap: 2,
  },
  entryTime: {color: '#666', fontSize: 11},
  entryLevel: {fontSize: 13, fontWeight: '600'},
  entryMeta: {color: '#aaa', fontSize: 12},
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
    paddingHorizontal: 32,
  },
});
