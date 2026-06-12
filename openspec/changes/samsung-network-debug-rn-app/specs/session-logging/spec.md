## ADDED Requirements

### Requirement: Session lifecycle management
The system SHALL automatically open a new call session when a `call_state` event with `state: 'RINGING'` or `state: 'OFFHOOK'` is received, and close it when `state: 'IDLE'` is received. Each session SHALL have a unique ID, start timestamp, and end timestamp.

#### Scenario: Session opens on incoming call
- **WHEN** a `call_state → RINGING` event is received and no session is currently open
- **THEN** a new session row is inserted into SQLite with `startedAt = event.timestamp` and `endedAt = null`

#### Scenario: Session closes when call ends
- **WHEN** a `call_state → IDLE` event is received and a session is open
- **THEN** the open session's `endedAt` is updated to `event.timestamp`

#### Scenario: No duplicate sessions
- **WHEN** a `RINGING` event is received while a session is already open
- **THEN** no new session is created; events continue to be appended to the existing session

### Requirement: Event persistence
The system SHALL persist every telephony event (signal_strength, call_state, audio_focus, network_type) emitted by the native module to SQLite, associated with the current open session (if any). Events received outside of a call session SHALL still be persisted with a null sessionId for context.

#### Scenario: Signal event persisted during call
- **WHEN** a `signal_strength` event is received while a session is open
- **THEN** an event row is inserted with `sessionId`, `timestamp`, `type: 'signal_strength'`, and the full payload serialized as JSON

#### Scenario: Event persisted outside call
- **WHEN** any event is received while no session is open
- **THEN** the event is persisted with `sessionId: null`

### Requirement: Session list retrieval
The system SHALL provide a TypeScript API to retrieve all sessions ordered by `startedAt` descending, with aggregate metadata: total events, minimum dBm recorded, number of call state transitions.

#### Scenario: Sessions listed with metadata
- **WHEN** the session list is requested
- **THEN** each session entry includes `id`, `startedAt`, `endedAt`, `eventCount`, `minDbm`, `callStateChanges`

### Requirement: Session detail retrieval
The system SHALL provide a TypeScript API to retrieve all events for a given session ID, ordered by timestamp ascending.

#### Scenario: Full event timeline retrieved
- **WHEN** a session ID is passed to the event retrieval API
- **THEN** all events for that session are returned in chronological order with full payloads
