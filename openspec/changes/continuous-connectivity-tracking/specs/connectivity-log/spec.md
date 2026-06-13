## ADDED Requirements

### Requirement: Continuous level-change logging
The system SHALL record a connectivity entry whenever the signal level (0–4) changes from the previously recorded value, regardless of whether a call session is active. Each entry SHALL include: `id` (UUID), `timestamp` (epoch ms), `level` (0–4), `dBm` (integer), and `networkType` (string).

#### Scenario: Level drops during idle
- **WHEN** signal level changes from 3 to 0 while no call is active
- **THEN** a connectivity entry is appended to the log with the new level, dBm, networkType, and current timestamp

#### Scenario: Level changes during active call
- **WHEN** signal level changes from 2 to 1 while a call session is active
- **THEN** a connectivity entry is appended to the log (in addition to the normal session signal_strength event)

#### Scenario: Repeated identical level suppressed
- **WHEN** two consecutive signal readings report the same level (e.g., level 2 → level 2)
- **THEN** no new connectivity entry is written

### Requirement: Persistent storage independent of sessions
The connectivity log SHALL be stored in a dedicated AsyncStorage key (`@snd/connectivity`) as a flat JSON array, independent of call session storage.

#### Scenario: App restart preserves log
- **WHEN** the app is closed and reopened
- **THEN** all previously recorded connectivity entries are still accessible

#### Scenario: Entries survive session deletion
- **WHEN** a call session is deleted or cleared
- **THEN** connectivity log entries are unaffected

### Requirement: Log included in exports
The connectivity log SHALL be exportable alongside session data. When a user exports via the existing share flow, the connectivity log entries for the relevant time range SHALL be included.

#### Scenario: Export contains connectivity entries
- **WHEN** the user exports connectivity log data
- **THEN** the exported file contains all connectivity entries with id, timestamp, level, dBm, and networkType fields
