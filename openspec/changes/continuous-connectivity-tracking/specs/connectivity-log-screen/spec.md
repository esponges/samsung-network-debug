## ADDED Requirements

### Requirement: Day-scoped connectivity timeline
The Connectivity Log screen SHALL display connectivity entries for a single calendar day, with the current day shown by default. The user SHALL be able to navigate to previous and next days.

#### Scenario: Default view shows today
- **WHEN** the user opens the Connectivity Log screen
- **THEN** the timeline shows entries for the current calendar day

#### Scenario: Navigate to previous day
- **WHEN** the user taps the previous-day button
- **THEN** the timeline updates to show the preceding calendar day's entries

#### Scenario: Empty day shows placeholder
- **WHEN** the selected day has no connectivity entries
- **THEN** the screen displays a message indicating no data for that day

### Requirement: Visual signal level timeline
The screen SHALL render a bar or line chart of signal level (0–4) over time for the selected day, with the x-axis representing time of day and the y-axis representing level.

#### Scenario: Level-0 and level-1 periods highlighted
- **WHEN** the timeline contains entries with level 0 or 1
- **THEN** those time segments are rendered in a distinct warning color (red/amber) to draw attention to weak-signal periods

#### Scenario: Level-4 periods shown in positive color
- **WHEN** the timeline contains entries with level 4
- **THEN** those segments are rendered in green

### Requirement: Entry list below chart
Below the chart, the screen SHALL show a scrollable list of raw connectivity entries for the selected day, each displaying time, level, dBm, and networkType.

#### Scenario: Entry shows all fields
- **WHEN** a connectivity entry is displayed in the list
- **THEN** it shows formatted time (HH:MM:SS), level (numeric), dBm value, and networkType string

### Requirement: Navigation access
The Connectivity Log screen SHALL be reachable from the app's main navigation (home screen or session list header).

#### Scenario: Accessible from home
- **WHEN** the user is on the home or session list screen
- **THEN** there is a visible control to navigate to the Connectivity Log screen
