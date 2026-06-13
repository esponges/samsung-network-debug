## Context

The app runs a foreground `TelephonyService` that registers a `PhoneTelephonyCallback`. `onSignalStrengthsChanged` already fires continuously — it just gets dropped by `SessionManager` when no call is active (`currentSessionId === null`). All storage goes through `AsyncStorage` via a thin wrapper in `database.ts`. There is no SQLite, no migration system — adding a new storage key is the entire schema change.

The diagnostic target is a Samsung S24 Ultra with a suspected damaged sub-board flex cable. The symptom is intermittent signal collapse to 0–1 bars (vs 3 bars on an S25 Ultra at the same location), causing dropped calls and AMR codec degradation ("underwater" voice on uplink). We need to capture these collapses when they happen outside calls, where the current app is completely blind.

## Goals / Non-Goals

**Goals:**
- Capture every signal level transition (any direction) in a persistent log, regardless of call state.
- Keep the log lightweight: filter to level-change events only, target ≤20 entries/day under normal conditions.
- Surface the log in a new screen with day-scoped navigation and visual emphasis on level 0–1 periods.
- Include connectivity log data in existing CSV/JSON exports.

**Non-Goals:**
- IP-layer connectivity tracking (`ConnectivityManager.NetworkCallback`) — signal level via the existing `TelephonyCallback` is sufficient and requires no new permissions.
- Aggregate statistics or anomaly detection — raw event log only; analysis stays in conversation/export.
- Purging or retention policy — storage is negligible at the expected event rate.
- Modifying how call sessions work — sessions remain call-bounded and unchanged.

## Decisions

### D1: Level-change filter, not time-based sampling

**Decision**: Log a connectivity entry only when `level` changes from the previous logged value.

**Alternatives considered**:
- *Every signal event*: ~1 event/3s = ~28,000 events/day. Useful resolution but unnecessary for "when did we drop to 0 bars."
- *Periodic snapshot (e.g., every 5 min)*: Predictable storage, but a 4-minute outage could fall entirely between two samples.
- *Threshold-only (log only entries to/from level 0–1)*: Misses context — knowing the level was 3 before dropping to 0 is valuable.

Level-change filtering captures all transitions with no resolution loss and near-zero storage cost.

### D2: New `connectivity_event` native event type, not reuse of `signal_strength`

**Decision**: Emit a distinct `connectivity_event` from `TelephonyService` for the connectivity log. `SessionManager` routes `signal_strength` to the active session and `connectivity_event` to the connectivity log independently.

**Alternatives considered**:
- *Reuse `signal_strength`*: Would require `SessionManager` to do double-duty (write to session AND connectivity log for the same event), creating coupling. Also, the level-change filter belongs at the service level (needs state), not in the JS layer.
- *Filter in JS after receiving `signal_strength`*: The service emits on every change already; filtering in JS would mean every event crosses the bridge. Keeping filter state in Kotlin is cleaner.

The level-change state (`lastEmittedLevel: Int`) lives in `TelephonyService` alongside the signal callback.

### D3: Flat array in `@snd/connectivity` AsyncStorage key

**Decision**: Store connectivity entries as a JSON array under a single AsyncStorage key, appended on each new entry.

**Alternatives considered**:
- *Per-day keys (e.g., `@snd/connectivity:2026-06-13`)*: Better for pruning old data, but adds key management complexity with no current need (storage is negligible).
- *Per-entry keys*: Unnecessary overhead for ~20 entries/day.

Simple flat array is consistent with how sessions are stored (`@snd/sessions`) and trivial to read/export.

### D4: Connectivity Log screen scoped to a single day with prev/next navigation

**Decision**: The screen shows one calendar day at a time, with buttons to navigate to previous/next days.

**Rationale**: The diagnostic question is "when during the day did signal collapse?" A day-scoped x-axis is the natural granularity. Multi-day views would compress the timeline too much to see short outages.

## Risks / Trade-offs

- **AsyncStorage write on every level change**: AsyncStorage writes are async and run on a background thread, but frequent writes could theoretically queue up. At ≤20/day this is not a concern. If the level oscillates rapidly (e.g., between 0 and 1 repeatedly), we could see bursts — acceptable given the diagnostic value.
- **`lastEmittedLevel` is in-memory state**: If `TelephonyService` is killed and restarted (e.g., after a crash), the first event after restart will always be logged (since `lastEmittedLevel` resets to -1). This is correct behavior — a restart is itself a signal worth capturing.
- **No backfill**: Historical sessions in `phone-sessions/` CSV exports won't appear in the connectivity log. The log only starts from when this version is installed.

## Open Questions

- Should the connectivity log entries also be annotated with a `inCall: boolean` flag, so the timeline screen can overlay call periods? This would make it easy to see "signal was at level 0 before the call started" vs "dropped during the call." Low effort to add, deferred to implementation judgment.
