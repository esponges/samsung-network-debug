import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import TelephonyModule from '../native/TelephonyModule';
import {startSessionManager, stopSessionManager} from '../services/SessionManager';
import {exportAll} from '../services/ExportService';
import {listSessions} from '../db/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  ];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(results).every(
    r => r === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export default function HomeScreen({navigation}: Props) {
  const [monitoring, setMonitoring] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    setSessionCount(listSessions().length);
  }, []);

  const handleToggle = async () => {
    if (!monitoring) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions required',
          'READ_PHONE_STATE and storage permissions are needed to monitor calls.',
        );
        return;
      }
      TelephonyModule.startMonitoring();
      startSessionManager();
      setMonitoring(true);
    } else {
      TelephonyModule.stopMonitoring();
      stopSessionManager();
      setMonitoring(false);
      setSessionCount(listSessions().length);
    }
  };

  const handleExportAll = async () => {
    try {
      await exportAll();
    } catch (e: unknown) {
      Alert.alert('Export failed', String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Samsung Network Debug</Text>

      <View style={[styles.status, monitoring ? styles.active : styles.idle]}>
        <Text style={styles.statusText}>
          {monitoring ? 'Monitoring active' : 'Monitoring stopped'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, monitoring ? styles.stopBtn : styles.startBtn]}
        onPress={handleToggle}>
        <Text style={styles.buttonText}>
          {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('SessionList')}>
        <Text style={styles.buttonText}>
          View Sessions ({sessionCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleExportAll}>
        <Text style={styles.buttonText}>Export All Sessions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  status: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  active: {backgroundColor: '#1a3a1a'},
  idle: {backgroundColor: '#2a1a1a'},
  statusText: {color: '#ccc', fontSize: 14},
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
  },
  startBtn: {backgroundColor: '#1a5c1a'},
  stopBtn: {backgroundColor: '#5c1a1a'},
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
});
