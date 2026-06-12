## 1. Project Scaffolding

- [x] 1.1 Init React Native CLI project (Android-only, TypeScript template)
- [x] 1.2 Add dependencies: `@op-engineering/op-sqlite`, `react-native-fs`, `react-native-share`
- [x] 1.3 Configure `AndroidManifest.xml` with permissions: `READ_PHONE_STATE`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_PHONE_CALL`, `READ_NETWORK_STATE`, `WRITE_EXTERNAL_STORAGE`
- [x] 1.4 Set `minSdkVersion` to 31 (Android 12) in `build.gradle`

## 2. Kotlin Native Module — Telephony Bridge

- [x] 2.1 Create `TelephonyModule.kt`: register `startMonitoring` / `stopMonitoring` as `@ReactMethod`s and wire up `RCTDeviceEventEmitter`
- [x] 2.2 Create `TelephonyService.kt`: Android foreground service that holds the `PhoneStateListener` and `AudioManager.OnAudioFocusChangeListener`
- [x] 2.3 Implement `PhoneStateListener` with `LISTEN_SIGNAL_STRENGTHS | LISTEN_CALL_STATE | LISTEN_DATA_CONNECTION_STATE`
- [x] 2.4 Emit `signal_strength`, `call_state`, `network_type`, `audio_focus` events to JS via `RCTDeviceEventEmitter`
- [x] 2.5 Create `TelephonyPackage.kt` and register it in `MainApplication.kt`
- [x] 2.6 Add persistent low-priority foreground notification channel in `TelephonyService`

## 3. TypeScript — Native Module Wrapper

- [x] 3.1 Create `src/native/TelephonyModule.ts`: typed wrapper exposing `startMonitoring()`, `stopMonitoring()`, and `addListener(eventType, handler)`
- [x] 3.2 Define TypeScript event payload types for all four event types (`SignalStrengthEvent`, `CallStateEvent`, `AudioFocusEvent`, `NetworkTypeEvent`)

## 4. SQLite Database Layer

- [x] 4.1 Create `src/db/schema.ts`: define `sessions` and `events` table DDL
- [x] 4.2 Create `src/db/database.ts`: initialize `op-sqlite` connection and run migrations on app start
- [x] 4.3 Implement `insertSession`, `closeSession`, `insertEvent` write helpers
- [x] 4.4 Implement `listSessions` query (with aggregate metadata: `eventCount`, `minDbm`, `callStateChanges`)
- [x] 4.5 Implement `getSessionEvents(sessionId)` query returning chronological event array

## 5. TypeScript — Session Manager

- [x] 5.1 Create `src/services/SessionManager.ts`: subscribe to native events, manage open session state
- [x] 5.2 Implement session open logic: trigger on `call_state → RINGING | OFFHOOK`, guard against duplicate opens
- [x] 5.3 Implement session close logic: trigger on `call_state → IDLE`, update `endedAt`
- [x] 5.4 Persist every incoming event to SQLite via db helpers, with current `sessionId` (or null)

## 6. Export Service

- [x] 6.1 Create `src/services/ExportService.ts` with `exportSessionJson(sessionId)` and `exportSessionCsv(sessionId)`
- [x] 6.2 Write JSON export: serialize session + events array to `Downloads/samsung-debug/<sessionId>.json` via `react-native-fs`
- [x] 6.3 Write CSV export: flatten events to rows with headers, write to `Downloads/samsung-debug/<sessionId>.csv`
- [x] 6.4 Implement `exportAll()`: generate JSON + CSV for all sessions and bundle into a ZIP archive
- [x] 6.5 After any export, invoke Android share sheet via `react-native-share`

## 7. UI

- [x] 7.1 Create `HomeScreen`: monitoring toggle (start/stop), status indicator, link to sessions list
- [x] 7.2 Create `SessionListScreen`: FlatList of sessions with `startedAt`, duration, `minDbm`, event count
- [x] 7.3 Create `SessionDetailScreen`: chronological event timeline with color-coded event types and dBm sparkline
- [x] 7.4 Add "Export JSON", "Export CSV", and "Export All" buttons to `SessionDetailScreen` / `HomeScreen`
- [x] 7.5 Wire React Navigation between screens

## 8. Permissions & Device Testing

- [x] 8.1 Implement runtime permission request flow for `READ_PHONE_STATE` and `WRITE_EXTERNAL_STORAGE` on app first launch
- [ ] 8.2 Install and test on Samsung Galaxy S24 Ultra (physical device)
- [ ] 8.3 Verify foreground service survives: app backgrounded, screen off, Phone app in foreground
- [ ] 8.4 Make a test call and verify session is created, events are logged, and export produces valid JSON + CSV
