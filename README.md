# Astronaut Health Monitor

A Mission Control style dashboard that monitors the health of a four-person crew, built for the
**NASA Space Apps Challenge, Tashkent 2026**. Baseline physiology comes from real PhysioNet recordings, solar flares
from NASA DONKI, live space weather from NOAA GOES. Every number on screen says where it comes from, and the system keeps
running when the network does not.

What it does, in one breath: the crew **sees** its readings (vitals, cabin, radiation, and values the astronaut enters by hand),
**forecasts** a limit before it is crossed, is told **what to do first** and **when to call the ground** (which depends on
how far from Earth the crew is), can **explain any indicator** (why it matters, what spaceflight does to it, which of the
five NASA hazards it belongs to, with a trend chart and its limit bands), and can **replay and export** the whole session.

It is a hackathon prototype and **not a medical device**. The crew is fictional.

- [1. Problem and mission context](#1-problem-and-mission-context)
- [2. Key features and UX decisions](#2-key-features-and-ux-decisions)
- [3. Scientific rigor and data tiers](#3-scientific-rigor-and-data-tiers)
- [4. Space weather feeds](#4-space-weather-feeds)
- [5. Architecture and fault tolerance](#5-architecture-and-fault-tolerance)
- [6. Quick start and project structure](#6-quick-start-and-project-structure)
- [7. Three-minute pitch script](#7-three-minute-pitch-script)
- [Known limits](#known-limits)
- [NASA data and other references](#nasa-data-and-other-references)
- [Use of AI (SI) disclosure](#use-of-ai-si-disclosure)
- [Team](#team)

---

## 1. Problem and mission context

Outside low Earth orbit the ground is no longer next door. The one-way radio delay to the Moon is about 1.3 s, and to Mars
it ranges from roughly 3 to 22 minutes depending on the planets' positions. A flight surgeon on the ground cannot react to a
falling blood-oxygen reading in real time, so the crew and the on-board system have to see the situation, and see where it is
heading, without waiting for a reply.

The app has a **mission context** selector (station in low orbit, Gateway, Moon base, Mars transit, Mars base): it changes the
signal delay shown and the ground-contact advice, so the same alarm says "call Mission Control now" near the Earth and "act on
the checklist first, a reply takes 6 to 45 minutes there and back" at Mars.

Two things follow, and they are what this project works on:

1. **Telemetry that explains itself.** A reading is only useful if the operator knows whether it is recorded or calculated,
   what limit it is judged against, and where that limit comes from. Every metric in this project carries a data source and a
   limit tier (section 3).
2. **Telemetry that survives a bad link.** The dashboard must keep working when the connection drops or degrades, and must
   say plainly when it is showing estimated values (section 5).

---

## 2. Key features and UX decisions

| Feature                          | What it does                                                                                                                                                                                                                                                                                                                                                                                                                               | Where                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Body scan**                    | A hand-drawn SVG silhouette with organ hotspots (brain, heart, lungs, muscle). Hover or click one and its readings open in a popover next to the marker. Hotspots take the colour of the worst status of their readings.                                                                                                                                                                                                                   | `components/bodyscan/BodyScan.tsx`                                                |
| **ECG at display rate**          | A recorded MIT-BIH trace drawn on a canvas in `requestAnimationFrame` from a ring buffer. High-frequency data is kept out of React state; the store is updated at 4 Hz or less. About 60 fps was measured in a headless browser without a GPU.                                                                                                                                                                                             | `components/telemetry/EcgChart.tsx`, `lib/telemetryBus.ts`                        |
| **Three telemetry views**        | **Vitals** (9 readings), **Cabin** (O₂, CO₂, humidity, noise, airflow), **Radiation** (crew dose and live GOES flux). A dot on a tab shows a non-nominal reading in a view that is not open. Next to each number a small range shows its normal band (up to the first caution limit).                                                                                                                                                      | `components/telemetry/TelemetryGrid.tsx`                                          |
| **Time-to-Threshold forecast**   | When a reading moves steadily towards its next limit, its card gets a small countdown capsule (`⏱ 1:27`) and the **Dynamic Island** at the top shows the nearest forecast across the whole crew (`Heart rate · 1:27  +2 ⌄`). Hover or click the island to list all forecasts; a row jumps to that crew member and the right tab. Cards never change size for a forecast. See the rules below.                                              | `lib/forecast.ts`, `ForecastPill.tsx`, `topbar/IslandPill.tsx`, `engine/trend.ts` |
| **Hold-to-confirm Control deck** | Scenarios need a **0.8 s press and hold**: _Solar flare_, _Physical exertion_, _O₂ supply fault_, _Restore normal_, _Reset scenario_. A release, pointer cancel or sliding off the button does nothing. The flare button has a selector of 12 real DONKI flares.                                                                                                                                                                           | `components/deck/HoldButton.tsx` (react-bits `HoldButton`)                        |
| **Languages**                    | English, Russian and Uzbek. Every user-facing string is a key; Russian is complete. Uzbek is a draft of about two thirds of the strings for a native speaker to review (medical terms especially); the rest falls back to Russian, then English, so a missing key never shows as a code. The voice alerts speak Russian when Uzbek is selected, and the sound button's tooltip says so (no Uzbek voice is claimed). `pnpm i18n:report` lists what is missing or equal to English in each language. | `lib/i18n.ts`, `lib/i18nCoverage.ts`, `scripts/i18n-report.ts` |
| **Trend chart**                  | The *About* window of every indicator opens with a chart of the reading over the last 5 minutes, 30 minutes or the session, for the selected crew member, drawn from the same deterministic engine frames as the cards. The caution, warning and critical limits are drawn as coloured bands with their values, so you can see how near the reading is; hover or touch for the exact value and time. Blood pressure shows both numbers. Glucose, sleep and mood show your entries as points; water has no chart (it is a running total). Bands show the resting limits. | `components/guidance/TrendChart.tsx`, `lib/metricSeries.ts` |
| **Routine check-ins**            | The Self-check values have a schedule (`packages/data/checkins.json`, hours of the mission day: glucose 06, 14 and 22; sleep 07; mood 09 and 21; water 10, 14 and 18). A small chip in the header shows how many are due for the selected crew member and opens the Self-check window at the first one; the Self-check tab gets an amber ring, and each card says *Check-in due since* or *Overdue since* (after 3 h). A check-in is done when an entry is made at or after its slot; only the latest missed slot of each routine counts, so nothing piles up. It is derived from the event log, so it follows edits and removals, is not stored, and works offline. The hours are our choice, not a NASA schedule. | `components/selfcheck/CheckinChip.tsx`, `engine/checkins.ts`, `hooks/useCheckins.ts` |
| **Five hazards**                 | A shield button beside the telemetry tabs opens a legend of the five hazards of human spaceflight (radiation, isolation, distance, gravity, closed environment) with a one-line meaning and the indicators each one touches; pressing an indicator opens its *About* window, where the hazards also show as tagged chips with icons. The hazard of each indicator comes from `packages/data/about.json`. | `components/guidance/hazards.tsx`, `lib/about.ts` |
| **Mission context**              | A selector next to the title tells the app where the crew is: station in low orbit, Gateway, Moon base, Mars transit or Mars base (`packages/data/missions.json`). It shows the one-way signal delay (station about 0.25 to 0.5 s, Moon 1.28 s, Mars about 3 to 22 min) and, in its tooltip, the gravity (0, 0.165 or about 0.38 g). For a warning or a critical reading, the *Do now* box gets a *Ground* line: near the Earth the ground answers in seconds (call Mission Control now); at Mars a reply takes 6 to 45 minutes there and back, so act on the checklist and decide with the crew medical officer first, then send the report. It changes the advice and the labels only; the body readings and the engine do not change. The choice is remembered as a preference. | `components/topbar/TopBar.tsx`, `lib/mission.ts`, `packages/data/missions.json` |
| **Self-check**                   | A fourth tab, *Self-check*, with four values the crew member enters by hand: blood glucose (mg/dL), sleep (hours in the last 24 h), mood (1 to 5) and water drunk (L). *Record* on a card opens a side window with a number field (glucose), a slider (sleep), five faces (mood) and quick water buttons. The time is taken automatically (mission time and the computer's clock), and an earlier time can be chosen for a value measured a while ago. The window lists the last 24 hours of entries, each with *Edit* and *Remove* (with *Undo*), so a wrong water amount can be corrected; the *About* window of each of the four has a *Record or edit* button. Each entry is one `measurement` event in the same event log as the scenario events, so it shows in the Flight log, in Time Travel, in the Report, in the telemetry package, and in the Excel export (a *Self-check* sheet: crew member, reading, value, unit, status against its limits, date and time, MET), and it works with the network off. A correction is another event that removes the entry by its id, so the log stays append-only and a replay never shows the wrong value. Glucose, sleep and mood are judged against limits with a stated basis (glucose: ADA hypoglycaemia levels, the rest ours); a bad value raises the same status, alert and *Do now* line as a sensor. Water has no alarm: the bar is a reference against the 2.5 L a day supplied per crew member. Entries are validated in the form and again by the API; no free text. Readings expire (glucose 8 h, mood 12 h, sleep and water 24 h) and then show *Due*, not an alarm. | `components/selfcheck/`, `packages/engine/src/manual.ts`, `thresholds.json` |
| **About this indicator**         | Click a card title (or a reading in the Body Scan organ popover, or the Crew dose title) to open a side window that explains the reading in plain language: why it matters, what spaceflight does to it, how it is measured, when to seek help, and which of the five NASA Human Research Program hazards (radiation, isolation, distance, gravity, closed environment) and named HRP risks it relates to. The organ popover also says what the organ does. Statements about spaceflight come from the NASA HRP pages and the documents in `docs/thresholds-sources.md`; the text is English and Russian (Uzbek falls back to Russian) and is background, not medical advice. | `components/guidance/MetricDrawer.tsx`, `lib/about.ts`, `packages/data/about.json` |
| **"Do now" guidance**            | For a reading that is out of range, a short first action (for example for CO₂ above its limit: raise ventilation, switch to the backup scrubber, tell the crew medical officer) appears where there is room: under each pinned alarm in the Flight log and in the Body Scan organ popover, never inside a metric card. The text depends on the side of the range (too high or too low) and on the level, comes from `packages/data/guidance.json` in English and Russian (Uzbek falls back to Russian), and is marked illustrative: not validated by flight surgeons. | `components/guidance/DoNow.tsx`, `lib/guidance.ts`, `packages/data/guidance.json` |
| **Prioritised Flight log**       | One notification path for every alert (toast, sound, voice, log), each isolated. Active warnings and emergencies stay **pinned** above the chronological list until the reading is back in range; routine rows (commands, link) are dimmed; serious rows have a tint and a left stripe; a click opens the crew member and tab of the alert. The _Alerts_ filter shows a count when new serious alerts arrive while another filter is open. | `components/deck/AuditLog.tsx`, `logParts.tsx`, `lib/alerts/alertCenter.ts`       |
| **Time Travel**                  | Click or drag the bar to a moment (the window starts at the session start, at most 24 h back) and a **replay runs from there to the present** at 1×, 2×, 4× or 8× (default 1×, so it catches up and hands over to live). Pause, skip 10 s back or forward, or go live at any time. Frames are reconstructed from the event log, not stored. The sparklines on the cards follow the replay cursor too (rebuilt from the engine, so each line agrees with the number beside it). Only the display moves: live monitoring (alerts, forecasts, island, flight log) keeps running, and a chip on the bar shows the live status during a replay.                                                                                                                                                                                                                                                                                                                                                    | `components/time/TimeTravelBar.tsx`, `engine/log.ts`                              |
| **Medical report**               | Incidents (merged warning-or-worse episodes) with their probable cause from the event log and an illustrative response protocol. A short window still lists incidents from earlier in the session. Ends with a table of every limit and its source.                                                                                                                                                                                        | `engine/report.ts`, `components/report/*`                                         |
| **Export**                       | Report as a multi-sheet Excel workbook `.xlsx` (_Summary, Crew, Incidents, Events, Limits and sources_), the flight log as `.xlsx` or CSV (`sep=;` so it opens in columns in any locale), and a validated telemetry package (`.json` / `.json.gz`) that can be re-imported by drag and drop.                                                                                                                                               | `lib/xlsx.ts`, `lib/exportReport.ts`, `lib/packageIO.ts`                          |

**Forecast rules** (`timeToThreshold`): a straight-line fit over the last ~50 s must have R² of at least 0.8, the reading must
have moved at least two hysteresis widths across the window, no single sample-to-sample change may carry more than 35 % of the
whole movement (a step is not a trend), and the limit must be reached within 3 minutes. Slow simulated drift therefore never
produces a forecast.

**Status is never colour alone**: every status is an icon, a word and a colour. Dark theme only; `prefers-reduced-motion` is
respected. Tabs and filters use one rubber-band segmented control; buttons share one matte, borderless style.

---

## 3. Scientific rigor and data tiers

Numbers live in JSON (`packages/data/thresholds.json`), not in code, and every limit states how trustworthy it is:

| Tier          | Meaning                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `nasa`        | The number is stated in NASA-STD-3001.                                                                  |
| `derived`     | Computed from, or taken from, another NASA document (Human Integration Design Handbook, an NTRS paper). |
| `clinical`    | A general clinical reference (AHA/ACC, BTS, NICE), not NASA.                                            |
| `engineering` | Our own choice.                                                                                         |
| `provisional` | A placeholder.                                                                                          |

A metric has one tier and, where levels differ, a per-level override (`levelTier`).
Levels are _caution / warning / critical_; `low` is the limit on the way down, `high` on the way up.

| Reading                  | Limits (caution / warning / critical)                 | Tier                                           | Basis                                                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabin CO₂                | > 3 / 4.5 / 7.5 mmHg                                  | `nasa`, critical `engineering`                 | NASA-STD-3001 Vol 2 [V2 6004]: 1-hour average at most 3 mmHg (OCHMO-TB-004 Rev D). 4.5 mmHg is where the brief reports symptoms; 7.5 is ours                                                                  |
| Humidity                 | 30 / 25 / 20 % low, 60 / 75 / 80 % high               | `nasa`, critical `engineering`                 | [V2 6012] crew-health range 25 to 75 % RH (warning), [V2 6013] comfort zone 30 to 60 % (caution)                                                                                                              |
| Noise                    | 45 / 50 / 60 NC                                       | `nasa`, caution and critical `engineering`     | [V2 6078] NC-50 for work areas (warning). NC-40 is a sleep-area limit [V2 6079] and is not used as an alarm. Real NC needs an octave-band spectrum; the app shows one simulated NC rating                     |
| Airflow                  | 0.07 / 0.05 / 0.03 m/s low, 0.18 / 0.2 / 0.3 m/s high | `derived`, caution and critical `engineering`  | ISS cabin design range 0.05 to 0.2 m/s, Perry et al., NTRS 20120015343. An ISS design parameter, **not** a NASA-STD-3001 requirement                                                                          |
| Cabin O₂                 | 19.5 / 18 / 16 %                                      | `derived`                                      | ppO₂ at 760 mmHg from the Human Integration Design Handbook (NASA/SP-2010-3407 Rev 1): 148 mmHg (OSHA minimum quoted there), 137 mmHg ("accepted limit of alertness"), 122 mmHg (Shuttle mask-donning at 121) |
| Accumulated dose         | 25 / 100 / 250 mSv                                    | `derived`, caution and warning `engineering`   | 250 mSv design-reference solar particle event limit [V1 4031] (OCHMO-TB-020 Rev E). Caution and warning are 10 % and 40 % of it                                                                               |
| Dose rate                | 60 / 150 / 400 µSv/h                                  | `engineering`                                  | NASA gives no numeric trigger ([V2 6100]); about 3x, 7x and 19x the 0.5 mSv/day background                                                                                                                    |
| Heart rate               | 100 / 120 / 150 bpm high, 50 / 42 / 35 low            | `clinical`                                     | AHA: typical adult resting range 60 to 100 bpm. While exercising the limits switch to 140 / 160 / 175 bpm (AHA vigorous zone, our assumed peak of 180 bpm)                                                    |
| Blood pressure           | 130 / 150 / 180 systolic, 85 / 95 / 110 diastolic     | `clinical`                                     | 2017 ACC/AHA categories as shown by the AHA. Warning and low-side levels are ours                                                                                                                             |
| SpO₂                     | < 94 / 92 / 88 %                                      | `clinical`, warning and critical `engineering` | Caution from the BTS adult oxygen guideline (94 to 98 % target). There is no NASA table of pO₂ against SpO₂; the 85 % floor of the O₂-fault scenario is **our assumption**                                    |
| Respiration              | > 21 / 25 / 32 per min                                | `clinical`, critical `engineering`             | NICE sepsis guideline NG51 (21 to 24 medium risk, 25 or more high risk)                                                                                                                                       |
| Temperature, HRV, stress | see `thresholds.json`                                 | `provisional`                                  | No NASA numeric limit exists. Low caution 36.0 °C matches a NICE marker                                                                                                                                       |

What NASA-STD-3001 does **not** give: its Volume 1 Rev C text contains no numeric operating limits for heart rate, blood
pressure, SpO₂, respiration or temperature, and nothing for HRV, stress or EEG. Those are set by flight surgeons and are not
published in the documents we read.

**Data sources**

| Source                                                                                                                                         | Used for                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| NASA-STD-3001 Vol 1 and 2, via the OCHMO technical briefs (CO₂ TB-004, habitable atmosphere TB-003, radiation TB-020, water, acoustics, ECLSS) | Tier `nasa` limits. The briefs are "for reference only"; the standard is authoritative                                                         |
| NASA Human Integration Design Handbook, NASA/SP-2010-3407 Rev 1                                                                                | Hypoxia table and ppO₂ limits (cabin O₂)                                                                                                       |
| NTRS 20120015343 (Perry et al.), 20170008857 (Allen), 20140003747 (Downs et al.)                                                               | ISS cabin design table, acoustic requirements (NC-50 modules, NC-40 crew quarters, NC-52 Orion), ISS exercise at 66 to 75 % of peak heart rate |
| PhysioNet MIT-BIH Arrhythmia Database (records 100, 101, 103, 105)                                                                             | ECG waveform at 360 Hz, looped between two R-peaks                                                                                             |
| PhysioNet BIDMC PPG and Respiration Dataset                                                                                                    | Heart rate, SpO₂, respiration (the four healthiest 60 s windows were picked automatically)                                                     |
| AHA, BTS, NICE (public pages and summaries)                                                                                                    | `clinical` limits. Read from summaries, not from the full guidelines                                                                           |

Full detail, page-level references and everything that was searched for and **not** found (for example hydration, which is
not modelled) are in [`docs/thresholds-sources.md`](docs/thresholds-sources.md). Re-verify against the current revision of each
document before any real use.

**What is recorded and what is modelled.** Heart rate, SpO₂, respiration and the ECG trace are recorded. Blood pressure,
temperature, stress, neural activity, HRV, all cabin values and the radiation dose are calculated by the engine; a filled dot on a
card means recorded, a ring means modelled. The scenario responses are **assumed**, not measured (`packages/data/modifiers.json`):
exertion drives heart rate to 66 % of an assumed 180 bpm peak (the ISS in-flight average of Downs et al.), lowers HRV by 25 ms
and raises breathing by 8 per minute; the O₂ fault lowers cabin O₂ by 6 points and SpO₂ decays exponentially towards 85 %.

---

## 4. Space weather feeds

**Historical flares: NASA DONKI.** `packages/data/events/donki-flares.json` holds 12 real flares from May 2024 (largest X8.7 on
2024-05-14). The Control deck selector lists them, and the chosen flare's real class and magnitude scale the modelled response.
`pnpm --filter @astro/data fetch:donki` downloads them with a NASA API key (`.env`, see `.env.example`); if DONKI's `/FLR`
endpoint is down it falls back to the flare notifications. DONKI gives class, magnitude and times, **not dose**: the dose rate
per flare class (`packages/data/radiation-model.json`) is an assumption chosen for a visible demo, time-compressed 180 times. A
real flare adds little dose indoors; the real hazard is the solar particles that follow.

**Live protons: NOAA SWPC GOES.** The API fetches
`https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json` (no key needed), parses the >= 10 MeV and

> = 100 MeV channels, drops NOAA's negative fill values, caches the result for 60 s and keeps the last good copy when NOAA is
> unreachable (`GET /spaceweather`). The Radiation tab shows the flux in pfu, the NOAA solar radiation storm scale (S1 at 10 pfu, one
> step per decade) and 24 h of data on a log axis. It is a real measurement at Earth orbit and is **never mixed into the crew's
> modelled dose**; when it cannot be loaded the card says so instead of showing a stale number.

---

## 5. Architecture and fault tolerance

```
packages/engine   Pure TypeScript. Zod schemas, baseline player, modifiers, thresholds with hysteresis, event log,
                  time travel, trend forecast, self-check entries and check-ins, report, telemetry package. No React, no Nest, no DOM.
packages/data     Scenario pack (real data), thresholds / modifiers / radiation / protocols / guidance / about / missions / check-ins JSON,
                  DONKI flares, ingest scripts.
apps/api          NestJS: WebSocket gateway (10 Hz batches, heartbeat), REST, NOAA GOES proxy.
apps/web          Next.js 16 dashboard (client-rendered), Zustand, TanStack Query, hand-written shadcn-style UI on Radix.
```

**Deterministic engine.** A frame is a pure function of `(config, crewId, t, previous status)`:

```
frame(t) = baseline(t) + modifiers(t)
```

The baseline is the recorded PhysioNet track; modifiers (exertion, O₂ fault, solar flare) are trapezoid or exponential curves
driven by an event log. There is no `Math.random`: noise comes from `mulberry32(hashSeed(crewId, t))`. The server and the
browser run the same code and produce identical frames, which is also what makes Time Travel and the report free: a past moment
is recomputed, not stored.

**Contracts.** Incoming frames are parsed with Zod-based guards per crew member (a bad value falls back to the last good one
and the card shows `est.`); the telemetry package is a Zod-validated file (`astro-telemetry-package/1`, at most 5 MB, 20 MB
unpacked, never executed); the same report schema validates an import and describes an export. The API validates every
command (type, crew, flare class, intensity, magnitude, event-log size, and for a self-check entry the metric, value range, id and time).

**Source modes** (`SourceManager`; components never talk to the WebSocket directly):

| Mode    | Source                                                                                            | Leaves when              |
| ------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| `LIVE`  | WebSocket `/ws`, 10 Hz batches plus heartbeat                                                     | no data for 3 s          |
| `POLL`  | HTTP `GET /telemetry/latest`, for networks that block WebSocket (also tried 2 s after data stops) | no data for 3 s          |
| `STALE` | Last values frozen, at most 5 s                                                                   | after 5 s                |
| `SIM`   | The same engine running in the browser; banner `SIGNAL LOST — USING ESTIMATED TELEMETRY`          | the server answers again |

When the server returns, its clock and event log win and commands issued offline are replayed to it. A restarted server is
detected (new session id, backwards clock jump) and the client state is reset.

Other guards: every widget has its own error boundary, duplicate and out-of-order frames are dropped, each alert channel
(toast, sound, voice, log) is isolated, persisted state (language, selected crew and mission context only) tolerates corrupt or unavailable
`localStorage`, and the demo needs no internet (the live GOES card is the only part that does, and it degrades by itself).

---

## 6. Quick start and project structure

Requirements: Node 22+, pnpm 10.

```bash
pnpm install
pnpm build:libs                       # builds @astro/engine; the API and web app import its dist (repeat after engine changes)
pnpm --filter @astro/api start        # http://localhost:3001  (WebSocket /ws, REST); restart to clear the event log
pnpm --filter @astro/web dev          # http://localhost:3000
```

Open http://localhost:3000 and press **Enter Mission Control** (the click also enables sound and voice).
`pnpm dev` runs the engine watcher, the API and the web app in parallel.

**Demo build** (faster than `dev`; stop `dev` first, both use the same `.next` folder):

```bash
pnpm --filter @astro/web build && pnpm --filter @astro/web start
```

To keep `dev` running, build into a separate folder and serve it on another port:

```bash
NEXT_DIST_DIR=.next-prod pnpm --filter @astro/web build
NEXT_DIST_DIR=.next-prod pnpm --filter @astro/web exec next start -p 3100
```

**Hosted demo (Vercel): https://astronaut-health-monitor-one.vercel.app.** The API is hosted on Render (https://astronaut-health-monitor-api.onrender.com, free plan) and the web app uses it (`NEXT_PUBLIC_API_URL`); if the server is asleep or down the app falls back to the browser simulation.
The web app alone is enough to run the demo; it is client-rendered and needs no server. Without the API it
shows the banner _SIGNAL LOST: USING ESTIMATED TELEMETRY_ and runs the same engine in the browser (mode `SIM`), so every
feature works except live server events across tabs and the live NOAA GOES card. To deploy: import
`Akhmadov-360/nasa-hackaton-2026` in Vercel and set the **Root Directory** to `apps/web`; `apps/web/vercel.json` already sets
the install command (`cd ../.. && pnpm install --frozen-lockfile`) and the build command (builds `@astro/engine`, then the app).
To use a hosted API instead, deploy `apps/api` (blueprint in `render.yaml`: Render, New, Blueprint, repository URL, Apply;
the API reads `PORT` and `CORS_ORIGINS`), set `NEXT_PUBLIC_API_URL` on Vercel to the service's https address and redeploy
the web app. The hosted API has one shared event log: every visitor sees the same scenario, so use _Reset scenario_ before a
demo. On Render's free plan the service sleeps after 15 minutes and takes up to a minute to wake; the app falls back to the
browser simulation meanwhile and reconnects by itself.

**Tests and checks** (50 engine, 5 data, 11 API, 52 web unit tests):

```bash
pnpm test
pnpm typecheck
```

**Golden-path smoke test** (a real Chrome or Edge, the pitch end to end with 18 assertions: hold button, island forecast and
list, pinned alarm, report and Excel export, Time Travel replay, NOAA feed down, network down and back, console errors).
Start the API and a web server first, then:

```bash
pnpm smoke -- --url http://localhost:3100 --size 1366x768 --shots shots   # options: --size WxH, --shots <dir>, --browser chrome|msedge, --headed
```

The manual rehearsal checklist for the presentation laptop is in [`scripts/smoke.md`](scripts/smoke.md).

**Data scripts**

```bash
pnpm --filter @astro/data fetch:donki   # needs NASA_API_KEY in the git-ignored .env (copy .env.example)
pnpm --filter @astro/data build:pack    # rebuilds packs/demo.pack.json from the raw PhysioNet files in packages/data/data-raw/ (git-ignored)
```

Keyboard: **1 to 4** select a crew member, **T** back to live, **K** pause or resume a replay, **J** / **L** skip 10 s back / forward, **M** mute. REST: `GET /telemetry/latest`, `GET /scenarios`,
`GET /spaceweather`, `POST /events`, `POST /reset`.

```
apps/api/src/telemetry/     service (event log, command validation), gateway (WebSocket), controller, spaceweather.service
apps/web/src/
  components/               bodyscan, crew, deck (control deck, flight log), telemetry (cards, ECG), guidance (Do now, About window,
                            trend chart, hazards), selfcheck, report, time, topbar, ui
  lib/                      sources (LIVE/POLL/STALE/SIM), store, alerts, audio, i18n, forecast, mission, about, guidance,
                            metricSeries, replaySeries, xlsx, packageIO, ...
  hooks/                    useDisplayFrame, useEta, useReport, useCheckins
packages/engine/src/        schemas, baseline, frame, modifiers, status, trend, log, manual, checkins, report, telemetryPackage, spaceweather
packages/data/              thresholds.json, modifiers.json, radiation-model.json, protocols.json, packs/, events/, scripts/
docs/                       thresholds-sources.md, adr/0001-report-and-telemetry-package.md
```

---

## 7. Three-minute pitch script

Open the production build in English, press **Enter Mission Control**, make sure the Control deck says
_Real event: X8.7 · 2024-05-14_, the mission selector says _Station_ and the scenario is clean (_Reset scenario_ if not).
Hold every Control deck button for 0.8 s. The header chip shows the check-ins due (4 at the start, by design). If time is
short, drop the rows marked *(cut)*.

| Time | Do | Say |
| --- | --- | --- |
| **0:00** | Point at the **Vitals** tab: heart rate, SpO₂, respiration with filled dots, the rest with rings. | "Four astronauts, far from the ground. The filled dot is a real PhysioNet signal, the ring is our model. Next to every number is its normal range." |
| **0:15** | Click the **Heart rate** card: the *About* window opens with the trend chart. Point at the limit bands, the hazard chip *Gravity* and "Seek help if". Close it. | "Every indicator explains itself: why it matters, what spaceflight does to it, when to seek help, and which of NASA's five hazards it belongs to. The chart shows how near the reading is to each limit." |
| **0:35** | Press the shield button beside the tabs. *(cut)* | "The five hazards of spaceflight, and the indicators each one touches." |
| **0:40** | Select Lina (key **1**). Hold **O₂ supply fault**. Open the island when the forecast appears. | "A cabin oxygen fault. Before any limit is crossed the system forecasts it; the island summarises every forecast and a click takes me to the sensor." |
| **1:05** | Wait for the warning: voice, toast, pinned alarm with the **Do now** line. | "Warning, voice, and the first action to take, right under the alarm." |
| **1:20** | Switch the selector to **Mars base**. Look at the *Ground* line under *Do now*, then hold **Restore normal**. | "Same alarm, but at Mars a reply takes 6 to 45 minutes there and back: act on the checklist first, then report. Near the Earth the line says call Mission Control now." |
| **1:40** | Open **Self-check** (or press the header chip). **Record** glucose 52, then show the entry list (edit, remove). | "The astronaut can enter glucose, sleep, mood and water. 52 raises a warning like any sensor, with the same advice. Entries can be corrected, and routine check-ins remind the crew what is due." |
| **2:00** | Select a flare, hold **Solar flare**, open **Radiation**. *(cut)* | "A real flare from DONKI. Left: our modelled dose against NASA's 250 mSv limit. Right: live proton flux from GOES, kept separate on purpose." |
| **2:10** | Click **Time travel** a minute back; the replay runs to the present (cards and sparklines follow the cursor). **T** returns to live. | "Any moment is recomputed from the event log and replayed; the live alarms keep running." |
| **2:25** | Open **Report**, then **Export package → Excel workbook**; show the *Self-check* sheet and *Limits and sources*. | "Incidents with causes and an illustrative protocol, every self-check entry with its date and time, and the table of every limit with its source." |
| **2:40** | Stop the API server (or go offline). Wait 5 s. | "No link: the banner says estimated telemetry and the same engine keeps running in the browser." |
| **2:55** | Close on the limits table or `docs/thresholds-sources.md`. | "Every limit says whether it is NASA, derived, clinical or our own choice. We kept the line between real and assumed visible." |

Rehearse once with the production build. Check the presentation laptop has an English and a Russian voice (Windows: Settings,
Time and language, Speech), and that the projector resolution (1366×768, 1920×1080) shows the full layout.

---

## Known limits

- Thresholds, the radiation response and the exertion / O₂-fault models are assumptions where the table above says
  `engineering` or `provisional`. Clinical levels were read from public AHA, BTS and NICE summaries, not from the full
  guidelines; operational vital-sign limits for crews are not published in NASA-STD-3001.
- The NASA briefs are derived from the standard and are "for reference only". The Human Integration Design Handbook marks its
  hypoxia section as under evaluation.
- Glucose, sleep, mood and water are entered by hand, not measured; sleep and mood limits are placeholders (NASA gives no
  numeric sleep or mood alarm), and water has no alarm because 2.5 L a day is a supply minimum, not an intake target.
- Bone and muscle changes (the gravity hazard) are not modelled; the gravity hazard is represented by the circulation
  indicators and the exercise limits.
- The signal delay of the station (0.25 to 0.5 s) is our estimate; NASA only says "under a second" via the relay satellites.
  Moon (1.28 s) and Mars (3 to 22 min) follow from the distances.
- The trend chart and the card sparklines use the resting limits; the ECG is not rebuilt during a replay.
- The check-in schedule (which hour each value is due) is our choice, not a NASA schedule.
- Uzbek is a draft of about two thirds of the strings, not read by a native speaker; the rest (report, protocols, space
  weather, long hazard texts) falls back to Russian, then English. Voice alerts speak Russian when Uzbek is selected.
- The Excel workbooks were validated with a spreadsheet library, not opened in Microsoft Excel itself.
- Rendering was profiled in a headless browser without a GPU; check the frame rate on the presentation laptop.

## NASA data and other references

**NASA data and documents used**

| Source | Used for | Where |
|---|---|---|
| NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information) | 12 real solar flares of May 2024 (largest X8.7, 2024-05-14); their class and magnitude scale the modelled radiation response | `packages/data/events/donki-flares.json` |
| NASA-STD-3001 Vol 1 and 2 through the OCHMO technical briefs (CO₂ TB-004, habitable atmosphere TB-003, radiation TB-020, water, acoustics, ECLSS) | Limits for CO₂, humidity, noise, drinking-water minimum, the 250 mSv solar particle event limit | `packages/data/thresholds.json`, `docs/thresholds-sources.md` |
| NASA Human Integration Design Handbook (NASA/SP-2010-3407 Rev 1) | Hypoxia table and ppO₂ limits behind the cabin O₂ limits | `docs/thresholds-sources.md` |
| NASA OCHMO sleep accommodations brief and the NASA HRP sleep-loss risk report | Context for the sleep limits (crews slept about 6 to 6.5 h against 8.5 h scheduled; limits are ours) | `docs/thresholds-sources.md` |
| NASA Technical Reports Server: Perry et al. (NTRS 20120015343), Allen (NTRS 20170008857), Downs et al. (NTRS 20140003747) | ISS cabin design table (airflow), acoustic requirements, ISS exercise intensity | `docs/thresholds-sources.md` |
| NASA Human Research Program: [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/), [Risks](https://www.nasa.gov/hrp/risks/) | The hazard framing of the product (radiation, isolation and confinement, distance, gravity, closed environments), the HRP risk names and the statements about spaceflight in the *About* windows | `packages/data/about.json`, `docs/thresholds-sources.md` |

**Space agency partner data and other references**

| Source | Used for |
|---|---|
| [Canadian Space Agency: Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Context for radiation monitoring (reading only, no data loaded) |
| NOAA Space Weather Prediction Center, GOES primary satellite | Live integral proton flux (>= 10 MeV and >= 100 MeV) and the NOAA S-scale |
| PhysioNet: MIT-BIH Arrhythmia Database, BIDMC PPG and Respiration Dataset | Recorded ECG (360 Hz), heart rate, SpO₂ and respiration |
| American Diabetes Association, American Heart Association, British Thoracic Society, NICE | Clinical limits (glucose low side, heart rate, blood pressure, SpO₂, respiration, temperature marker). Read from public summaries, see the tier notes in section 3 |

This project does not use NASA logos, insignia or flags, and is not affiliated with or endorsed by NASA or any agency named above.

## Use of AI (SI) disclosure

Most of the source code, unit tests, translations (Russian and Uzbek interface strings) and written documentation in this
repository were produced by an AI coding assistant (Anthropic's Claude, used through Claude Code), working from requirements,
design decisions and reviews given by the team. The team chose the problem framing, the data sources and the rule that every limit
must state where it comes from, directed every feature, ran the application, reviewed the output and decided what to ship.
Scientific limits were looked up in the cited documents during development; where a source could not be read in full, the limit is
labelled with a weaker tier (section 3) instead of presented as a NASA value. AI assistance is also recorded in the repository
metadata: AI-assisted commits carry a `Co-Authored-By: Claude` trailer in `git log`.

## Team

**Team name: Ultra Sun**, NASA Space Apps Challenge Tashkent 2026. Data attribution and licences are listed in
`packages/data/packs/demo.pack.json` (`meta.sources`, `meta.licenses`); check each dataset page for its exact licence.
