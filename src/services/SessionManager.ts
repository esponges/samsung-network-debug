import {EmitterSubscription} from 'react-native';
import TelephonyModule from '../native/TelephonyModule';
import type {
  CallStateEvent,
  TelephonyEventType,
  SignalStrengthEvent,
  AudioFocusEvent,
  NetworkTypeEvent,
  ConnectivityEvent,
} from '../native/TelephonyModule';
import {appendConnectivityEntry, closeSession, insertEvent, insertSession} from '../db/database';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type AnyPayload =
  | SignalStrengthEvent
  | CallStateEvent
  | AudioFocusEvent
  | NetworkTypeEvent
  | ConnectivityEvent;

let currentSessionId: string | null = null;
const subscriptions: EmitterSubscription[] = [];

export function startSessionManager(): void {
  if (subscriptions.length > 0) return;
  subscriptions.push(
    TelephonyModule.addListener('signal_strength', e => handleEvent('signal_strength', e)),
    TelephonyModule.addListener('call_state', e => { handleCallState(e); }),
    TelephonyModule.addListener('audio_focus', e => handleEvent('audio_focus', e)),
    TelephonyModule.addListener('network_type', e => handleEvent('network_type', e)),
    TelephonyModule.addListener('connectivity_event', e => handleConnectivityEvent(e)),
  );
}

export function stopSessionManager(): void {
  subscriptions.forEach(s => s.remove());
  subscriptions.length = 0;
  currentSessionId = null;
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

async function handleCallState(event: CallStateEvent): Promise<void> {
  const {state, timestamp} = event;

  if ((state === 'RINGING' || state === 'OFFHOOK') && currentSessionId === null) {
    const newId = uuid();
    currentSessionId = newId;
    await insertSession(newId, timestamp);
  }

  if (state === 'IDLE' && currentSessionId !== null) {
    const sessionId = currentSessionId;
    persistEvent('call_state', event, sessionId);
    await closeSession(sessionId, timestamp);
    currentSessionId = null;
    return;
  }

  persistEvent('call_state', event, currentSessionId);
}

function handleConnectivityEvent(event: ConnectivityEvent): void {
  appendConnectivityEntry({
    id: uuid(),
    timestamp: event.timestamp,
    level: event.level,
    dBm: event.dBm,
    networkType: event.networkType,
  });
}

function handleEvent(type: TelephonyEventType, payload: AnyPayload): void {
  if (currentSessionId === null) return;
  persistEvent(type, payload, currentSessionId);
}

function persistEvent(
  type: TelephonyEventType,
  payload: AnyPayload,
  sessionId: string | null,
): void {
  const timestamp = (payload as {timestamp: number}).timestamp ?? Date.now();
  insertEvent(uuid(), sessionId, timestamp, type, payload);
}
