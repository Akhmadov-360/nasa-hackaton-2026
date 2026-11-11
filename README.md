# Astronaut Health Monitor

Mission Control dashboard that monitors the health of a four-person crew during a space mission.
Built for the **NASA Space Apps Challenge, Tashkent 2026**.

The crew's baseline physiology is **real** (PhysioNet recordings), solar flares come from **NASA DONKI**, and the
system reacts to anomalies with alerts, voice and an audit trail. It keeps working when the network does not.

## What is real and what is modeled

| Signal | Source | Status |
|---|---|---|
| ECG waveform (360 Hz) | PhysioNet MIT-BIH Arrhythmia Database, records 100, 101, 103, 105 | Real recording, looped between two R-peaks |
| Heart rate variation, SpO₂, respiration | PhysioNet BIDMC PPG and Respiration Dataset | Real; the four healthiest 60 s windows were picked automatically |
| Solar flare events (class, time) | NASA DONKI | Real events. **Needs a NASA API key to download, see below** |
| Radiation dose response to a flare | Our model (`packages/data/radiation-model.json`) | **Modeled, assumed values.** DONKI gives class, magnitude and times, not dose. Peak dose rate per class (C about 50, M about 300, X 2000–5000 µSv/h, scaled by the flare's real magnitude) is an assumption chosen for a visible demo, not a measurement; a real flare adds little dose indoors, the real hazard is the solar particles that follow. Time-compressed 180x |
| Exertion / O₂-fault responses | Our model (`packages/data/modifiers.json`) | **Modeled, assumed values.** Exertion: HR +45 bpm, HRV −25 ms, SpO₂ −1, breathing +8/min. O₂ fault: SpO₂ decays exponentially to about 85 % in 2–3 min, HR rises +30 bpm then falls |
| Alarm thresholds | `packages/data/thresholds.json` | **Provisional, illustrative.** To be replaced with values from NASA-STD-3001 |

The UI shows a "Provisional thresholds" note and a "Modeled" badge on the radiation card. This is not a medical device.

Crew members are fictional. Data attribution is listed in `packages/data/packs/demo.pack.json` (`meta.sources`,
`meta.licenses`); check each dataset page for its exact license.

## Run it

Requirements: Node 22+, pnpm 10.

```bash
pnpm install
pnpm build:libs        # builds @astro/engine (the API and web app import its dist)
pnpm --filter @astro/api start     # http://localhost:3001  (WebSocket /ws, REST)
pnpm --filter @astro/web dev       # http://localhost:3000
```

Open http://localhost:3000 and press **Enter Mission Control** (this click enables sound and voice alerts).
To clear injected events use **Reset scenario** in the Control deck (or `POST /reset`).

Keyboard: **1–4** select crew, **T** back to live, **M** mute. Sound and voice can be toggled in the top bar; the language switch (EN / RU / UZ) also changes the voice language.

Everything needed at runtime is in the repository, so the demo works without internet.

### Getting the NASA DONKI flares

`api.nasa.gov` rate-limits the shared `DEMO_KEY`. Get a free personal key at https://api.nasa.gov, then:

```bash
# copy .env.example to .env and put your key in it (the file is git-ignored)
pnpm --filter @astro/data fetch:donki
pnpm --filter @astro/data build:pack
```

The Control Deck's flare button then shows the real event (for example the X8.7 flare of 14 May 2024). If NASA's `/FLR` endpoint is down (it returned 404 in November 2026), the script reads the same flares from DONKI's flare notifications. Solar energetic particle events for May 2024 are saved to `data-raw/donki/` as well, for context.
Without it the button injects a generic X-class flare.

### Rebuilding the scenario pack from raw PhysioNet files

Raw downloads live in `packages/data/data-raw/` (git-ignored): `bidmc/bidmc_NN_Numerics.csv` and `mitdb/NNN.{hea,dat}`.
`pnpm --filter @astro/data build:pack` regenerates `packs/demo.pack.json` from them.

## Report, protocols and telemetry packages

- **Report** (top bar): summary of a period (last 5 min / 30 min / hour / whole session) for all crew or one member: incidents with their probable cause, radiation added, and what is real versus modeled. Copy the summary as text, print it, or export it.
- **Response protocol**: click the checklist icon on any alert in the flight log, or *Open protocol* on an incident. The steps are illustrative and not validated by flight surgeons.
- **Telemetry package**: *Export package* saves a `.json` or `.json.gz` file (the finished report plus session info). *Import package* (button or drag and drop) opens one from another run or machine in review mode. Files are validated, limited to 5 MB and never executed.
- **Time to threshold**: when a reading drifts steadily towards its limit, its card shows when it will be reached.

## Demo script (3 minutes)

1. **Baseline.** All four crew nominal; the ECG is a real MIT-BIH trace, heart rate and SpO₂ come from BIDMC.
2. **Body scan.** Hover an organ: its readings appear next to the silhouette.
3. **Oxygen fault.** Hold *O₂ supply fault* for 0.8 s. SpO₂ falls, the status island swells, a toast drops out of it,
   a voice says the warning, and the Flight log records it with mission time.
4. **Solar flare.** Hold *Solar flare*. Radiation rate and accumulated dose rise for the whole crew.
5. **Time travel.** Drag the slider back: any moment of the last 24 h is reconstructed from the event log.
6. **Resilience.** Stop the API. After a few seconds the banner reads `SIGNAL LOST — USING ESTIMATED TELEMETRY` and the
   same engine keeps running in the browser. Start the API again and the link returns to LIVE.

## Architecture

```
packages/engine   Pure TypeScript: Zod frame parsing, baseline player, modifiers, thresholds with hysteresis,
                  event log and time travel. No React, no Nest, no DOM. Runs on the server AND in the browser.
packages/data     Scenario pack (real data), thresholds / modifiers / radiation JSON, ingest scripts.
apps/api          NestJS: WebSocket gateway (10 Hz batches + heartbeat) and REST (/telemetry/latest, /scenarios, /events).
apps/web          Next.js dashboard (client-rendered), Zustand store, SourceManager, widgets.
```

Key idea: a frame is a pure function, `frame(t) = baseline(t) + active modifiers(t)`, driven by an event log. That makes
the server and the offline browser simulation identical, and makes Time Travel free.

### Fault tolerance

`SourceManager` falls back automatically: **LIVE** (WebSocket) → **POLL** (HTTP, for networks that block WebSocket) →
**STALE** (≤ 5 s, last values) → **SIM** (engine in the browser). When the server returns, its clock and log win and
commands issued offline are replayed to it.

Other guards: every widget has its own error boundary; incoming frames are validated per crew member (bad values fall
back to the last good one and are flagged `est.`); duplicate and out-of-order frames are dropped; each alert channel
(toast, sound, voice, log) is isolated so a blocked speaker never hides a toast; commands need a 0.8 s hold; persisted
state tolerates corrupt or unavailable `localStorage`.

## Tests

```bash
pnpm test        # engine, data, api, web unit tests
pnpm typecheck
```

## Known limits

- Thresholds and the radiation / exertion / O₂ response models are provisional until the math team fills them in.
- Voice: Uzbek has no installed voice in most browsers, so it falls back to Russian. Check that your presentation laptop has an English and a Russian voice (Windows: Settings, Time and language, Speech).
- Sparklines keep showing the live trend while Time Travel is active (the main values and ECG are reconstructed).
- Russian and Uzbek strings need review by native speakers.
- Rendering was profiled in a headless browser without a GPU; check frame rate on the presentation laptop.

## Team

NASA Space Apps Challenge Tashkent 2026 team. Data: PhysioNet (BIDMC, MIT-BIH), NASA DONKI.
