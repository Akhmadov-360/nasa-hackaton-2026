# Astronaut Health Monitor

A Mission Control style dashboard that monitors the health of a four-person crew, built for the
**NASA Space Apps Challenge, Tashkent 2026**. Baseline physiology comes from real PhysioNet recordings, solar flares
from NASA DONKI, live space weather from NOAA GOES. Every number on screen says where it comes from, and the system keeps
running when the network does not.

It is a hackathon prototype and **not a medical device**. The crew is fictional.

- [1. Problem and mission context](#1-problem-and-mission-context)
- [2. Key features and UX decisions](#2-key-features-and-ux-decisions)
- [3. Scientific rigor and data tiers](#3-scientific-rigor-and-data-tiers)
- [4. Space weather feeds](#4-space-weather-feeds)
- [5. Architecture and fault tolerance](#5-architecture-and-fault-tolerance)
- [6. Quick start and project structure](#6-quick-start-and-project-structure)
- [7. Three-minute pitch script](#7-three-minute-pitch-script)
- [Known limits](#known-limits)

---

## 1. Problem and mission context

Outside low Earth orbit the ground is no longer next door. The one-way radio delay to the Moon is about 1.3 s, and to Mars
it ranges from roughly 3 to 22 minutes depending on the planets' positions. A flight surgeon on the ground cannot react to a
falling blood-oxygen reading in real time, so the crew and the on-board system have to see the situation, and see where it is
heading, without waiting for a reply.

Two things follow, and they are what this project works on:

1. **Telemetry that explains itself.** A reading is only useful if the operator knows whether it is recorded or calculated,
   what limit it is judged against, and where that limit comes from. Every metric in this project carries a data source and a
   limit tier (section 3).
2. **Telemetry that survives a bad link.** The dashboard must keep working when the connection drops or degrades, and must
   say plainly when it is showing estimated values (section 5).

---

## 2. Key features and UX decisions

| Feature | What it does | Where |
|---|---|---|
| **Body scan** | A hand-drawn SVG silhouette with organ hotspots (brain, heart, lungs, muscle). Hover or click one and its readings open in a popover next to the marker. Hotspots take the colour of the worst status of their readings. | `components/bodyscan/BodyScan.tsx` |
| **ECG at display rate** | A recorded MIT-BIH trace drawn on a canvas in `requestAnimationFrame` from a ring buffer. High-frequency data is kept out of React state; the store is updated at 4 Hz or less. About 60 fps was measured in a headless browser without a GPU. | `components/telemetry/EcgChart.tsx`, `lib/telemetryBus.ts` |
| **Three telemetry views** | **Vitals** (9 readings), **Cabin** (O₂, CO₂, humidity, noise, airflow), **Radiation** (crew dose and live GOES flux). A dot on a tab shows a non-nominal reading in a view that is not open. Next to each number a small range shows its normal band (up to the first caution limit). | `components/telemetry/TelemetryGrid.tsx` |
| **Time-to-Threshold forecast** | When a reading moves steadily towards its next limit, its card gets a small countdown capsule (`⏱ 1:27`) and the **Dynamic Island** at the top shows the nearest forecast across the whole crew (`Heart rate · 1:27  +2 ⌄`). Hover or click the island to list all forecasts; a row jumps to that crew member and the right tab. Cards never change size for a forecast. See the rules below. | `lib/forecast.ts`, `ForecastPill.tsx`, `topbar/IslandPill.tsx`, `engine/trend.ts` |
| **Hold-to-confirm Control deck** | Scenarios need a **0.8 s press and hold**: *Solar flare*, *Physical exertion*, *O₂ supply fault*, *Restore normal*, *Reset scenario*. A release, pointer cancel or sliding off the button does nothing. The flare button has a selector of 12 real DONKI flares. | `components/deck/HoldButton.tsx`, `lib/hold.ts` |
| **Prioritised Flight log** | One notification path for every alert (toast, sound, voice, log), each isolated. Active warnings and emergencies stay **pinned** above the chronological list until the reading is back in range; routine rows (commands, link) are dimmed; serious rows have a tint and a left stripe; a click opens the crew member and tab of the alert. The *Alerts* filter shows a count when new serious alerts arrive while another filter is open. | `components/deck/AuditLog.tsx`, `logParts.tsx`, `lib/alerts/alertCenter.ts` |
| **Time Travel** | Drag the bar back up to 24 h: frames are reconstructed from the event log, not stored. | `components/time/TimeTravelBar.tsx`, `engine/log.ts` |
| **Medical report** | Incidents (merged warning-or-worse episodes) with their probable cause from the event log and an illustrative response protocol. A short window still lists incidents from earlier in the session. Ends with a table of every limit and its source. | `engine/report.ts`, `components/report/*` |
| **Export** | Report as a multi-sheet Excel workbook `.xlsx` (*Summary, Crew, Incidents, Events, Limits and sources*), the flight log as `.xlsx` or CSV (`sep=;` so it opens in columns in any locale), and a validated telemetry package (`.json` / `.json.gz`) that can be re-imported by drag and drop. | `lib/xlsx.ts`, `lib/exportReport.ts`, `lib/packageIO.ts` |
| **Languages and voice** | English, Russian, Uzbek. Voice alerts speak in the interface language (Uzbek falls back to Russian) and spell out units. | `lib/i18n.ts`, `lib/audio.ts` |

**Forecast rules** (`timeToThreshold`): a straight-line fit over the last ~50 s must have R² of at least 0.8, the reading must
have moved at least two hysteresis widths across the window, no single sample-to-sample change may carry more than 35 % of the
whole movement (a step is not a trend), and the limit must be reached within 3 minutes. Slow simulated drift therefore never
produces a forecast.

**Status is never colour alone**: every status is an icon, a word and a colour. Dark theme only; `prefers-reduced-motion` is
respected. Tabs and filters use one rubber-band segmented control; buttons share one matte, borderless style.

---

## 3. Scientific rigor and data tiers

Numbers live in JSON (`packages/data/thresholds.json`), not in code, and every limit states how trustworthy it is:

| Tier | Meaning |
|---|---|
| `nasa` | The number is stated in NASA-STD-3001. |
| `derived` | Computed from, or taken from, another NASA document (Human Integration Design Handbook, an NTRS paper). |
| `clinical` | A general clinical reference (AHA/ACC, BTS, NICE), not NASA. |
| `engineering` | Our own choice. |
| `provisional` | A placeholder. |

A metric has one tier and, where levels differ, a per-level override (`levelTier`).
Levels are *caution / warning / critical*; `low` is the limit on the way down, `high` on the way up.

| Reading | Limits (caution / warning / critical) | Tier | Basis |
|---|---|---|---|
| Cabin CO₂ | > 3 / 4.5 / 7.5 mmHg | `nasa`, critical `engineering` | NASA-STD-3001 Vol 2 [V2 6004]: 1-hour average at most 3 mmHg (OCHMO-TB-004 Rev D). 4.5 mmHg is where the brief reports symptoms; 7.5 is ours |
| Humidity | 30 / 25 / 20 % low, 60 / 75 / 80 % high | `nasa`, critical `engineering` | [V2 6012] crew-health range 25 to 75 % RH (warning), [V2 6013] comfort zone 30 to 60 % (caution) |
| Noise | 45 / 50 / 60 NC | `nasa`, caution and critical `engineering` | [V2 6078] NC-50 for work areas (warning). NC-40 is a sleep-area limit [V2 6079] and is not used as an alarm. Real NC needs an octave-band spectrum; the app shows one simulated NC rating |
| Airflow | 0.07 / 0.05 / 0.03 m/s low, 0.18 / 0.2 / 0.3 m/s high | `derived`, caution and critical `engineering` | ISS cabin design range 0.05 to 0.2 m/s, Perry et al., NTRS 20120015343. An ISS design parameter, **not** a NASA-STD-3001 requirement |
| Cabin O₂ | 19.5 / 18 / 16 % | `derived` | ppO₂ at 760 mmHg from the Human Integration Design Handbook (NASA/SP-2010-3407 Rev 1): 148 mmHg (OSHA minimum quoted there), 137 mmHg ("accepted limit of alertness"), 122 mmHg (Shuttle mask-donning at 121) |
| Accumulated dose | 25 / 100 / 250 mSv | `derived`, caution and warning `engineering` | 250 mSv design-reference solar particle event limit [V1 4031] (OCHMO-TB-020 Rev E). Caution and warning are 10 % and 40 % of it |
| Dose rate | 60 / 150 / 400 µSv/h | `engineering` | NASA gives no numeric trigger ([V2 6100]); about 3x, 7x and 19x the 0.5 mSv/day background |
| Heart rate | 100 / 120 / 150 bpm high, 50 / 42 / 35 low | `clinical` | AHA: typical adult resting range 60 to 100 bpm. While exercising the limits switch to 140 / 160 / 175 bpm (AHA vigorous zone, our assumed peak of 180 bpm) |
| Blood pressure | 130 / 150 / 180 systolic, 85 / 95 / 110 diastolic | `clinical` | 2017 ACC/AHA categories as shown by the AHA. Warning and low-side levels are ours |
| SpO₂ | < 94 / 92 / 88 % | `clinical`, warning and critical `engineering` | Caution from the BTS adult oxygen guideline (94 to 98 % target). There is no NASA table of pO₂ against SpO₂; the 85 % floor of the O₂-fault scenario is **our assumption** |
| Respiration | > 21 / 25 / 32 per min | `clinical`, critical `engineering` | NICE sepsis guideline NG51 (21 to 24 medium risk, 25 or more high risk) |
| Temperature, HRV, stress | see `thresholds.json` | `provisional` | No NASA numeric limit exists. Low caution 36.0 °C matches a NICE marker |

What NASA-STD-3001 does **not** give: its Volume 1 Rev C text contains no numeric operating limits for heart rate, blood
pressure, SpO₂, respiration or temperature, and nothing for HRV, stress or EEG. Those are set by flight surgeons and are not
published in the documents we read.

**Data sources**

| Source | Used for |
|---|---|
| NASA-STD-3001 Vol 1 and 2, via the OCHMO technical briefs (CO₂ TB-004, habitable atmosphere TB-003, radiation TB-020, water, acoustics, ECLSS) | Tier `nasa` limits. The briefs are "for reference only"; the standard is authoritative |
| NASA Human Integration Design Handbook, NASA/SP-2010-3407 Rev 1 | Hypoxia table and ppO₂ limits (cabin O₂) |
| NTRS 20120015343 (Perry et al.), 20170008857 (Allen), 20140003747 (Downs et al.) | ISS cabin design table, acoustic requirements (NC-50 modules, NC-40 crew quarters, NC-52 Orion), ISS exercise at 66 to 75 % of peak heart rate |
| PhysioNet MIT-BIH Arrhythmia Database (records 100, 101, 103, 105) | ECG waveform at 360 Hz, looped between two R-peaks |
| PhysioNet BIDMC PPG and Respiration Dataset | Heart rate, SpO₂, respiration (the four healthiest 60 s windows were picked automatically) |
| AHA, BTS, NICE (public pages and summaries) | `clinical` limits. Read from summaries, not from the full guidelines |

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
>= 100 MeV channels, drops NOAA's negative fill values, caches the result for 60 s and keeps the last good copy when NOAA is
unreachable (`GET /spaceweather`). The Radiation tab shows the flux in pfu, the NOAA solar radiation storm scale (S1 at 10 pfu, one
step per decade) and 24 h of data on a log axis. It is a real measurement at Earth orbit and is **never mixed into the crew's
modelled dose**; when it cannot be loaded the card says so instead of showing a stale number.

---

## 5. Architecture and fault tolerance

```
packages/engine   Pure TypeScript. Zod schemas, baseline player, modifiers, thresholds with hysteresis, event log,
                  time travel, trend forecast, report, telemetry package. No React, no Nest, no DOM.
packages/data     Scenario pack (real data), thresholds / modifiers / radiation / protocols JSON, DONKI flares, ingest scripts.
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
command (type, crew, flare class, intensity, magnitude, event-log size).

**Source modes** (`SourceManager`; components never talk to the WebSocket directly):

| Mode | Source | Leaves when |
|---|---|---|
| `LIVE` | WebSocket `/ws`, 10 Hz batches plus heartbeat | no data for 3 s |
| `POLL` | HTTP `GET /telemetry/latest`, for networks that block WebSocket (also tried 2 s after data stops) | no data for 3 s |
| `STALE` | Last values frozen, at most 5 s | after 5 s |
| `SIM` | The same engine running in the browser; banner `SIGNAL LOST — USING ESTIMATED TELEMETRY` | the server answers again |

When the server returns, its clock and event log win and commands issued offline are replayed to it. A restarted server is
detected (new session id, backwards clock jump) and the client state is reset.

Other guards: every widget has its own error boundary, duplicate and out-of-order frames are dropped, each alert channel
(toast, sound, voice, log) is isolated, persisted state (language and selected crew only) tolerates corrupt or unavailable
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

**Tests and checks** (35 engine, 5 data, 9 API, 22 web unit tests):

```bash
pnpm test
pnpm typecheck
```

**Data scripts**

```bash
pnpm --filter @astro/data fetch:donki   # needs NASA_API_KEY in the git-ignored .env (copy .env.example)
pnpm --filter @astro/data build:pack    # rebuilds packs/demo.pack.json from the raw PhysioNet files in packages/data/data-raw/ (git-ignored)
```

Keyboard: **1 to 4** select a crew member, **T** back to live, **M** mute. REST: `GET /telemetry/latest`, `GET /scenarios`,
`GET /spaceweather`, `POST /events`, `POST /reset`.

```
apps/api/src/telemetry/     service (event log, command validation), gateway (WebSocket), controller, spaceweather.service
apps/web/src/
  components/               bodyscan, crew, deck (control deck, flight log), telemetry (cards, ECG), report, time, topbar, ui
  lib/                      sources (LIVE/POLL/STALE/SIM), store, alerts, audio, i18n, forecast, xlsx, packageIO, ...
  hooks/                    useDisplayFrame, useEta, useReport
packages/engine/src/        schemas, baseline, frame, modifiers, status, trend, log, report, telemetryPackage, spaceweather
packages/data/              thresholds.json, modifiers.json, radiation-model.json, protocols.json, packs/, events/, scripts/
docs/                       thresholds-sources.md, adr/0001-report-and-telemetry-package.md
CLAUDE.md                   rules for working in this repository
```

---

## 7. Three-minute pitch script

Open the production build in English or Russian, press **Enter Mission Control**, make sure the Control deck says
*Real event: X8.7 · 2024-05-14* and the scenario is clean (*Reset scenario* if not). Hold every Control deck button for 0.8 s.

| Time | Do | Say |
|---|---|---|
| **0:00** | Nothing yet. Point at the **Vitals** tab: heart rate, SpO₂, respiration with filled dots, other readings with rings. | "Four astronauts. The filled dot is a real PhysioNet signal, the ring is our model. Next to every number is its normal range." |
| **0:20** | Click the `i` next to the tabs, then open **Cabin**. Hover the dot on *CO₂*. | "Cabin limits come from NASA-STD-3001: CO₂ at 3 mmHg, humidity 25 to 75 %, noise NC-50. The tooltip names the document and the tier." |
| **0:40** | Hover an organ on the **Body scan**. | "Readings by organ, with the same status colours." |
| **0:50** | Select Lina (key **1**). Hold **O₂ supply fault**. | "A cabin oxygen fault for one astronaut." |
| **1:00** | Watch the card capsules (`⏱ 0:41`) and the island (`Cabin O₂ 0:22 +3 ⌄`). Click the island; click the *Cabin O₂* row. | "Before any limit is crossed, the system forecasts it. The island summarises every forecast across the crew, and a click takes me to the sensor." |
| **1:25** | Wait for the warning: voice, toast, **Flight log** pins *Active alarms* at the top. | "Warning, voice, toast. The active alarm stays pinned, routine entries are dimmed." Hold **Restore normal**. |
| **1:45** | Pick another flare in the selector, hold **Solar flare**, open **Radiation**. | "A real flare from DONKI. The left card is our modelled dose against NASA's 250 mSv limit. The right card is live, real proton flux from the GOES satellite, kept separate on purpose." |
| **2:10** | Drag **Time travel** back about a minute and return with **T**. | "Any moment of the last 24 hours is recomputed from the event log." |
| **2:20** | Open **Report** (top bar). Show *Last 5 min* with the notice about earlier incidents, then **Export package → Excel workbook**. Scroll to *Data and limits*. | "The report lists incidents with causes and an illustrative protocol, and the table of every limit with its source. It exports to a readable Excel workbook." |
| **2:40** | Stop the API server. Wait 5 s. | "No link: the banner says estimated telemetry, and the same engine keeps running in the browser." Start the API; the link returns to LIVE. |
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
- Hydration is deliberately not modelled: no intake signal exists to show.
- Sparklines keep showing the live trend while Time Travel is active (the main values and the ECG are reconstructed).
- Uzbek: some report and protocol strings fall back to Russian, and Uzbek has no installed voice in most browsers (it speaks
  Russian). Russian and Uzbek strings need review by native speakers.
- The Excel workbooks were validated with a spreadsheet library, not opened in Microsoft Excel itself.
- Rendering was profiled in a headless browser without a GPU; check the frame rate on the presentation laptop.

## Team

NASA Space Apps Challenge Tashkent 2026 team. Data: PhysioNet (BIDMC, MIT-BIH), NASA DONKI, NOAA SWPC. Data attribution
and licences are listed in `packages/data/packs/demo.pack.json` (`meta.sources`, `meta.licenses`); check each dataset page for its
exact licence.
