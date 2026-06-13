# Samsung Network Debug — CLAUDE.md

## What this is

A React Native (Android-only) diagnostic app for a **Samsung Galaxy S24 Ultra (SM-S928B)** experiencing intermittent dropped calls and one-way audio. Suspected cause: damaged sub-board flex cable. The app logs telephony events to confirm or rule that out.

## The problem being diagnosed

| Symptom | What to look for in the data |
|---|---|
| Dropped calls | dBm drops sharply during OFFHOOK |
| One-way audio | `audio_focus: LOSS` mid-call without call ending |
| Network degrades during calls | LTE → EDGE transition while OFFHOOK |
| Phantom call state changes | Multiple IDLE/RINGING/OFFHOOK in one session |

**Always build release** — live reload crashes the device
