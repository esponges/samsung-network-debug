## 1. Native Layer — Level-Change Emission

- [x] 1.1 Add `lastEmittedLevel: Int = -1` state variable to `TelephonyService`
- [x] 1.2 In `onSignalStrengthsChanged`, after computing `level`, check if it differs from `lastEmittedLevel`; if so, emit a `connectivity_event` and update `lastEmittedLevel`
- [x] 1.3 Add `emitConnectivityEvent(level, dBm, networkType, timestamp)` helper in `TelephonyService` using the existing `TelephonyModule.sendTelephonyEvent` pattern

## 2. Native Bridge — New Event Type

- [x] 2.1 Add `connectivity_event` to the `TelephonyEventType` union in `TelephonyModule.ts`
- [x] 2.2 Add `ConnectivityEvent` interface (`level`, `dBm`, `networkType`, `timestamp`) and add it to `TelephonyEventPayloadMap`

## 3. Storage — Connectivity Log

- [x] 3.1 Add `ConnectivityEntry` interface to `database.ts` (`id`, `timestamp`, `level`, `dBm`, `networkType`)
- [x] 3.2 Implement `appendConnectivityEntry(entry: ConnectivityEntry): Promise<void>` in `database.ts` — reads `@snd/connectivity`, appends, writes back
- [x] 3.3 Implement `getConnectivityLog(): Promise<ConnectivityEntry[]>` in `database.ts`
- [x] 3.4 Implement `getConnectivityLogForDay(date: Date): Promise<ConnectivityEntry[]>` filtering by calendar day

## 4. Session Manager — Route connectivity_event

- [x] 4.1 In `SessionManager.ts`, subscribe to `connectivity_event` in `startSessionManager`
- [x] 4.2 In the `connectivity_event` handler, call `appendConnectivityEntry` with a new UUID and the event payload (do not gate on `currentSessionId`)
- [x] 4.3 Add `connectivity_event` subscription removal to `stopSessionManager`

## 5. Export — Include Connectivity Log

- [x] 5.1 Add `exportConnectivityLogCsv(): Promise<string>` to `ExportService.ts` — writes entries to a temp file and returns the path
- [x] 5.2 Add `exportConnectivityLogJson(): Promise<string>` to `ExportService.ts`

## 6. Connectivity Log Screen

- [x] 6.1 Create `src/screens/ConnectivityLogScreen.tsx` with day state (default: today) and prev/next navigation buttons
- [x] 6.2 Implement the signal level bar chart — x-axis = time of day (proportional), bars colored by level (0–1 red, 2–3 amber, 4 green)
- [x] 6.3 Render a scrollable entry list below the chart (time, level, dBm, networkType per row)
- [x] 6.4 Show "No data for this day" placeholder when `getConnectivityLogForDay` returns empty
- [x] 6.5 Add export buttons (CSV / JSON) wired to `ExportService` connectivity helpers

## 7. Navigation

- [x] 7.1 Add `ConnectivityLog` to `RootStackParamList` in `App.tsx`
- [x] 7.2 Register `ConnectivityLogScreen` in the navigator stack
- [x] 7.3 Add a "Signal History" button to `SessionListScreen` header (or home screen) that navigates to `ConnectivityLog`
