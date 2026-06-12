import {NativeModules, NativeEventEmitter, EmitterSubscription} from 'react-native';

export interface SignalStrengthEvent {
  dBm: number;
  asu: number;
  level: number; // 0–4
  networkType: 'NR' | 'LTE' | 'HSPA' | 'WCDMA' | 'GSM' | 'CDMA' | 'UMTS' | 'EDGE' | 'GPRS' | 'UNKNOWN' | string;
  timestamp: number; // epoch ms
}

export interface CallStateEvent {
  state: 'IDLE' | 'RINGING' | 'OFFHOOK' | 'UNKNOWN';
  timestamp: number;
}

export interface AudioFocusEvent {
  focus: 'GAIN' | 'LOSS' | 'LOSS_TRANSIENT' | 'LOSS_TRANSIENT_CAN_DUCK' | 'UNKNOWN';
  timestamp: number;
}

export interface NetworkTypeEvent {
  type: string;
  timestamp: number;
}

export type TelephonyEventType = 'signal_strength' | 'call_state' | 'audio_focus' | 'network_type';

export type TelephonyEventPayloadMap = {
  signal_strength: SignalStrengthEvent;
  call_state: CallStateEvent;
  audio_focus: AudioFocusEvent;
  network_type: NetworkTypeEvent;
};

const {TelephonyModule: NativeTelephonyModule} = NativeModules;
const emitter = new NativeEventEmitter(NativeTelephonyModule);

const TelephonyModule = {
  startMonitoring(): void {
    NativeTelephonyModule.startMonitoring();
  },

  stopMonitoring(): void {
    NativeTelephonyModule.stopMonitoring();
  },

  addListener<T extends TelephonyEventType>(
    eventType: T,
    handler: (event: TelephonyEventPayloadMap[T]) => void,
  ): EmitterSubscription {
    return emitter.addListener(eventType, handler);
  },
};

export default TelephonyModule;
