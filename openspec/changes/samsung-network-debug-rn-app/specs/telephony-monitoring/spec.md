## ADDED Requirements

### Requirement: Continuous signal strength monitoring
The system SHALL continuously monitor and emit cellular signal strength events (dBm, ASU, level 0–4, network type) while a foreground service is active. Events SHALL be emitted to React Native via `RCTDeviceEventEmitter` on every change reported by `PhoneStateListener.LISTEN_SIGNAL_STRENGTHS`.

#### Scenario: Signal strength change is captured
- **WHEN** the device's cellular signal strength changes
- **THEN** the native module emits a `signal_strength` event with `{ dBm, asu, level, networkType, timestamp }`

#### Scenario: Signal drop to no service
- **WHEN** the device loses cellular service entirely
- **THEN** the native module emits a `signal_strength` event with `dBm: -999` and `level: 0`

### Requirement: Call state transition monitoring
The system SHALL monitor call state transitions (IDLE, RINGING, OFFHOOK) via `PhoneStateListener.LISTEN_CALL_STATE` and emit each transition as a timestamped event to React Native.

#### Scenario: Incoming call detected
- **WHEN** the device receives an incoming call
- **THEN** the native module emits a `call_state` event with `{ state: 'RINGING', timestamp }`

#### Scenario: Call answered
- **WHEN** the user answers a call
- **THEN** the native module emits a `call_state` event with `{ state: 'OFFHOOK', timestamp }`

#### Scenario: Call ends
- **WHEN** a call ends (hung up, dropped, or rejected)
- **THEN** the native module emits a `call_state` event with `{ state: 'IDLE', timestamp }`

### Requirement: Audio focus change monitoring
The system SHALL monitor Android `AudioManager` audio focus changes and emit events when the Phone app gains or loses audio focus, as a proxy for microphone circuit availability.

#### Scenario: Phone app takes audio focus
- **WHEN** the Phone app acquires `AUDIOFOCUS_GAIN` during a call
- **THEN** the native module emits an `audio_focus` event with `{ focus: 'GAIN', timestamp }`

#### Scenario: Audio focus lost during call
- **WHEN** audio focus is lost or reduced (`AUDIOFOCUS_LOSS` / `AUDIOFOCUS_LOSS_TRANSIENT`) while a call is active
- **THEN** the native module emits an `audio_focus` event with `{ focus: 'LOSS', timestamp }`

### Requirement: Network type change monitoring
The system SHALL monitor cellular network type changes (LTE, NR/5G, HSPA, no service) and emit each change as a timestamped event.

#### Scenario: Network type degrades during call
- **WHEN** the device drops from 5G NR to LTE or lower during a call
- **THEN** the native module emits a `network_type` event with `{ type: 'LTE', timestamp }`

### Requirement: Foreground service lifecycle
The system SHALL run monitoring inside an Android foreground service with a persistent notification so that monitoring continues when the app is backgrounded or the screen is off.

#### Scenario: Monitoring survives app background
- **WHEN** the user backgrounds the app while monitoring is active
- **THEN** the foreground service continues emitting telephony events to the JS layer via `RCTDeviceEventEmitter`

#### Scenario: Monitoring starts on demand
- **WHEN** the TypeScript layer calls `TelephonyModule.startMonitoring()`
- **THEN** the foreground service starts, the persistent notification appears, and listeners are registered

#### Scenario: Monitoring stops on demand
- **WHEN** the TypeScript layer calls `TelephonyModule.stopMonitoring()`
- **THEN** the foreground service stops, the notification is dismissed, and all listeners are unregistered
