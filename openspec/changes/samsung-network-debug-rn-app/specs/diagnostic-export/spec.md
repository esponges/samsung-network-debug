## ADDED Requirements

### Requirement: JSON export of a session
The system SHALL export a full session (metadata + all events) as a structured JSON file written to the device's external storage, suitable for programmatic analysis.

#### Scenario: JSON file created on export
- **WHEN** the user triggers export for a session
- **THEN** a JSON file is written to `Downloads/samsung-debug/<sessionId>.json` containing session metadata and the full chronological event array

#### Scenario: JSON structure is complete
- **WHEN** the JSON file is opened
- **THEN** it contains `{ session: { id, startedAt, endedAt }, events: [{ timestamp, type, payload }] }` with no missing fields

### Requirement: CSV export of a session
The system SHALL export a session's events as a flat CSV file, with one row per event, suitable for opening in Excel or sharing with a technician.

#### Scenario: CSV file created on export
- **WHEN** the user triggers CSV export for a session
- **THEN** a CSV file is written to `Downloads/samsung-debug/<sessionId>.csv` with headers `timestamp,type,dBm,asu,level,networkType,callState,audioFocus`

#### Scenario: CSV rows align with events
- **WHEN** the CSV is opened
- **THEN** each event occupies one row; fields not applicable to that event type are empty

### Requirement: Share exported file
The system SHALL allow the user to share an exported file (JSON or CSV) via Android's native share sheet immediately after export.

#### Scenario: Share sheet opens after export
- **WHEN** an export completes successfully
- **THEN** the Android share sheet is invoked with the exported file so the user can send it via email, WhatsApp, Drive, etc.

### Requirement: Export all sessions
The system SHALL support exporting all sessions as a single ZIP archive containing one JSON and one CSV per session.

#### Scenario: ZIP archive created
- **WHEN** the user triggers "Export All"
- **THEN** a ZIP file is written to `Downloads/samsung-debug/all-sessions-<date>.zip` containing JSON and CSV files for every stored session
