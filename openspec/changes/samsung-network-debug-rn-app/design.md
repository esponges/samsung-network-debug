## Context

A Samsung Galaxy S24 Ultra (Android 14) is experiencing intermittent dropped calls and one-way audio, symptoms consistent with a loose sub-board flex cable. The problem cannot be reproduced on demand, so a background diagnostic app is needed to capture telephony events during normal use. The app targets a single physical device; there are no multi-user or cloud concerns.

## Goals / Non-Goals

**Goals:**
- Capture signal strength (dBm/ASU), call state transitions, network type, and audio focus/routing events during every call
- Run as a foreground service so monitoring survives backgrounding and screen-off
- Persist events grouped into per-call sessions in on-device SQLite
- Export sessions as JSON and CSV for review by a repair technician

**Non-Goals:**
- iOS support (Android-only, Samsung-specific APIs are the target)
- Recording actual audio content
- Cloud sync or remote telemetry
- Multi-device or multi-user support
- Real-time UI during a call (background logging only; review happens post-call)

## Decisions

### 1. React Native CLI (bare) over Expo managed workflow

Expo managed workflow restricts native module APIs and foreground services behind plugins that add abstraction without benefit here. Bare workflow gives direct AndroidManifest control and lets us write the Kotlin module without wrapping it in an Expo plugin.

*Alternatives considered:* Expo with a custom plugin — rejected because it adds a config-plugin layer that is harder to debug for someone unfamiliar with Kotlin.

### 2. Custom Kotlin native module over react-native-device-info

`react-native-device-info` exposes a one-shot `getCarrier()` and basic signal APIs but does not provide continuous `PhoneStateListener` callbacks for signal strength or call state events. The custom module is ~150 lines and gives exactly what we need: a persistent listener that emits JS events via `RCTDeviceEventEmitter`.

*Alternatives considered:* Polling `react-native-device-info` every second — rejected because polling misses transient drops between intervals and drains battery unnecessarily.

### 3. Android Foreground Service over Headless JS task

A foreground service (with a persistent notification) is the only reliable way to keep a `TelephonyManager` listener alive when the Phone app is in the foreground and our app is not. Headless JS tasks are designed for short bursts triggered by background events, not continuous monitoring.

*Alternatives considered:* WorkManager periodic task — rejected because minimum interval is 15 minutes, far too coarse for call-level diagnostics.

### 4. SQLite over AsyncStorage / MMKV

Events need structured querying (filter by session, order by timestamp, aggregate per session). AsyncStorage and MMKV are key-value stores unsuitable for relational event data. SQLite with `@op-engineering/op-sqlite` (synchronous, JSI-based) avoids the async overhead of `react-native-sqlite-storage`.

*Alternatives considered:* Realm — rejected as overkill for a single-device diagnostic tool.

### 5. Event-driven architecture (PhoneStateListener) over polling

Android's `TelephonyManager.PhoneStateListener` with `LISTEN_SIGNAL_STRENGTHS | LISTEN_CALL_STATE | LISTEN_DATA_CONNECTION_STATE` fires on change, giving millisecond-accurate timestamps of exactly when degradation occurred. Polling at any interval introduces jitter and can miss brief drops.

### Data Model

```
Session { id, startedAt, endedAt, peakDrop_dBm }
Event   { id, sessionId, timestamp, type, payload (JSON) }
```

Event types: `signal_strength` | `call_state` | `audio_focus` | `network_type` | `audio_route`

A session starts on the first `call_state → RINGING` or `OFFHOOK` event and closes on `IDLE`.

## Risks / Trade-offs

- **Microphone audio level unreadable during GSM calls** → The modem owns the mic at hardware level; app-layer `AudioRecord` cannot access it mid-call. Mitigation: log `AudioManager` audio focus transitions and audio route changes as a proxy — these change when the mic circuit fails.
- **Foreground service notification may annoy during normal use** → Required by Android 14 for any persistent service. Mitigation: use a minimal, low-priority notification channel.
- **PhoneStateListener requires READ_PHONE_STATE** → On Android 12+ this also requires READ_PRIVILEGED_PHONE_STATE for certain fields (e.g., precise call state). Mitigation: fall back to unprivileged fields (call state + signal strength) which do not require privileged permission.
- **Battery impact** → Continuous `LISTEN_SIGNAL_STRENGTHS` listener has negligible CPU cost (system-driven callbacks, no polling). Risk is low.

## Open Questions

- Should the persistent notification include a live signal strength readout, or stay minimal? (Nice-to-have, not required for v1)
- Is ADB logcat companion script (for modem-level RIL logs) in scope for v1, or a follow-up?
