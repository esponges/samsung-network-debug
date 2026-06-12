# Samsung Network Debug

An Android diagnostic app for capturing telephony events on a Samsung Galaxy S24 Ultra experiencing intermittent dropped calls and one-way audio. The suspected cause is a damaged sub-board flex cable — this app logs the data needed to confirm it.

## What it does

- **Monitors in the background** — runs as an Android foreground service so logging continues even when the app is backgrounded, the screen is off, or the Phone app is in the foreground
- **Captures telephony events** on every change:
  - Signal strength (dBm, ASU, level 0–4, network type)
  - Call state transitions (IDLE → RINGING → OFFHOOK → IDLE)
  - Network type changes (5G NR, LTE, HSPA, etc.)
  - Audio focus changes (proxy for microphone circuit availability, since the modem owns the mic during calls and app-layer audio APIs can't read it)
- **Groups events into sessions** — a session opens automatically when a call starts (RINGING/OFFHOOK) and closes when it ends (IDLE)
- **Persists everything to SQLite** — events are stored on-device and survive app restarts
- **Exports for analysis** — each session can be exported as JSON or CSV and shared via the Android share sheet; all sessions can be bundled into a ZIP archive

## Architecture

```
React Native (TypeScript)
  ├── src/native/TelephonyModule.ts   — typed wrapper for the Kotlin bridge
  ├── src/services/SessionManager.ts  — session lifecycle + event persistence
  ├── src/services/ExportService.ts   — JSON/CSV/ZIP export + share sheet
  ├── src/db/database.ts              — op-sqlite helpers (sync JSI)
  └── src/screens/
        HomeScreen         — monitoring toggle + "Export All"
        SessionListScreen  — list of captured sessions with aggregate stats
        SessionDetailScreen — event timeline + dBm sparkline + per-session export

Android (Kotlin)
  ├── TelephonyModule.kt   — ReactNative bridge (@ReactMethod)
  ├── TelephonyService.kt  — foreground service with TelephonyCallback + AudioFocusListener
  └── TelephonyPackage.kt  — package registration
```

## Requirements

- Android 12+ (minSdkVersion 31)
- Physical device with cellular — emulator will not produce real telephony events
- Permissions granted on first launch: `READ_PHONE_STATE`, `WRITE_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`

## Build & install

```bash
cd SamsungNetworkDebug
npm install
npx react-native run-android
```

Connect the S24 Ultra via USB with debugging enabled before running.

## Typical workflow

1. Open the app and tap **Start Monitoring** — grant permissions when prompted
2. Use the phone normally; make calls as usual
3. After a dropped call or audio issue, open the app and tap **View Sessions**
4. Select the relevant session to see the event timeline and dBm sparkline
5. Tap **Export JSON** or **Export CSV** to share the data with a repair technician

## Exported data

**JSON** — full session + events array:
```json
{
  "session": { "id": "...", "startedAt": 1718123456789, "endedAt": 1718123512345 },
  "events": [
    { "timestamp": 1718123456789, "type": "signal_strength", "payload": { "dBm": -97, "asu": 18, "level": 2, "networkType": "LTE" } },
    { "timestamp": 1718123457100, "type": "call_state", "payload": { "state": "RINGING" } }
  ]
}
```

**CSV** — one row per event, suitable for Excel:
```
timestamp,type,dBm,asu,level,networkType,callState,audioFocus
1718123456789,signal_strength,-97,18,2,LTE,,,
1718123457100,call_state,,,,,"RINGING",
```

## Diagnostic signals to look for

| Pattern | Likely meaning |
|---|---|
| dBm drops sharply during OFFHOOK | RF connection degraded during call — flex cable suspect |
| `audio_focus: LOSS` mid-call without call ending | Audio routing circuit interrupted |
| Network type degrades LTE → EDGE during call | Antenna connection intermittent |
| Multiple IDLE/RINGING/OFFHOOK transitions in one call | Call state reporting unreliable — modem or baseband issue |
