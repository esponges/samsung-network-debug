## Why

A Samsung Galaxy S24 Ultra is experiencing intermittent connectivity and calling issues (dropped calls, one-way audio, signal loss) that are hard to reproduce on demand — making diagnosis at a repair shop nearly impossible. A self-contained diagnostic app is needed to continuously log telephony and audio events in the background so that failure patterns can be captured in real use and shared with a specialized technician.

## What Changes

- New React Native Android app targeting Samsung Galaxy S24 Ultra (Android 14+)
- Thin Kotlin native module (~150 lines) bridging Android's `TelephonyManager` and `AudioManager` to React Native via event emitter
- Foreground service to keep monitoring alive during calls without being killed by the OS
- TypeScript session manager that groups raw events into per-call sessions and persists them to SQLite
- Export capability producing JSON and CSV files shareable with a repair technician

## Capabilities

### New Capabilities

- `telephony-monitoring`: Continuous background monitoring of signal strength (dBm/ASU), call state transitions, network type changes, and audio focus/routing events via a Kotlin native module and Android foreground service
- `session-logging`: Grouping of raw telephony events into per-call sessions with timestamps, persisted to SQLite on-device
- `diagnostic-export`: Export of session data as JSON or CSV for sharing with repair technicians

### Modified Capabilities

## Impact

- New React Native project (Expo bare workflow or React Native CLI, Android only)
- New Kotlin native module (`TelephonyModule.kt` + `TelephonyService.kt`)
- Android permissions required: `READ_PHONE_STATE`, `FOREGROUND_SERVICE`, `RECORD_AUDIO` (for audio focus monitoring), `READ_NETWORK_STATE`
- Dependencies: `react-native-sqlite-storage` or `@op-engineering/op-sqlite`, `react-native-share`, `react-native-fs`
