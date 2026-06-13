## Why

The S24 Ultra drops to 0–1 signal bars intermittently — both during and between calls — while an S25 Ultra on the same carrier in the same location shows 3 bars. The current app only logs signal events inside call sessions, leaving the between-call drops completely invisible. Without a continuous record, we cannot confirm whether the antenna degradation is constant or episodic, or correlate it with the call-quality symptoms (broken audio, "underwater" voice).

## What Changes

- Add an always-on connectivity log that captures signal level transitions (e.g. level 3 → 0, 0 → 2) regardless of whether a call is active.
- Apply a level-change filter so only transitions are stored, not every reading — keeping event volume at ~10–20 entries per day.
- Add a Connectivity Log screen showing a day-view timeline of signal level history.
- Expose the connectivity log in the existing export flow (CSV/JSON).

## Capabilities

### New Capabilities

- `connectivity-log`: Always-on, level-change-filtered signal level timeline stored independently of call sessions. Each entry records timestamp, level (0–4), dBm, and networkType.
- `connectivity-log-screen`: New screen displaying the connectivity log as a day-scoped timeline with level-0/1 periods highlighted as problem zones.

### Modified Capabilities

- `session-events`: No requirement changes — call sessions remain unchanged. The same `onSignalStrengthsChanged` callback will now also feed the connectivity log, but session event recording is unaffected.

## Impact

- **Android (TelephonyService.kt)**: `onSignalStrengthsChanged` extended to emit a new `connectivity_event` when level changes outside (and during) a call.
- **Native bridge (TelephonyModule.ts)**: New `connectivity_event` event type added.
- **Storage (database.ts)**: New `@snd/connectivity` AsyncStorage key; new `ConnectivityEntry` type; `getConnectivityLog` / `appendConnectivityEntry` helpers.
- **Session Manager (SessionManager.ts)**: Subscribe to `connectivity_event` and route to the connectivity log (not the session).
- **Navigation**: New `ConnectivityLog` screen added to the root stack.
- **No new Android permissions required**.
