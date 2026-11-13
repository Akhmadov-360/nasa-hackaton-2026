# CLAUDE.md

Astronaut Health Monitor: NASA Space Apps Challenge (Tashkent 2026) hackathon project. See `README.md` for the product.
Spec and plan (git-ignored, local): `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Commands

```bash
pnpm install
pnpm build:libs                   # REQUIRED after any change in packages/engine (api and web import its dist)
pnpm test                         # all unit tests (vitest)
pnpm typecheck
pnpm --filter @astro/api start    # :3001  (restart to reset the event log)
pnpm --filter @astro/web dev      # :3000
pnpm --filter @astro/web build && pnpm --filter @astro/web start   # production build, use this for the demo (stop `dev` first: same .next folder)
pnpm --filter @astro/data build:pack      # rebuild packs/demo.pack.json from data-raw/
pnpm --filter @astro/data fetch:donki   # reads NASA_API_KEY from the git-ignored root .env (see .env.example)
```

## Package boundaries

- `packages/engine`: pure TypeScript. Never import React, Nest or DOM APIs here. It runs on the server and in the browser.
- `packages/data`: JSON data + ingest scripts. `data-raw/` is git-ignored.
- `apps/api`: NestJS under `tsx` (no decorator metadata), so always use explicit `@Inject(Service)`.
- `apps/web`: Next.js client-only (`ssr: false`), so persisted state never causes hydration mismatches.

## Rules that matter

- **Numbers live in JSON, not code**: thresholds, modifier shapes, flare-class dose profiles are in `packages/data/*.json`.
  Files marked `"provisional": true` are illustrative until the math team fills them in (Appendix A of the spec).
- **The engine is deterministic**: no `Math.random`; noise comes from `mulberry32(hashSeed(crewId, t))`. `computeFrame`
  must stay a pure function of `(config, crewId, t, prevStatus)`.
- **High-frequency data stays out of React state**: frame history and the ECG ring live in `lib/telemetryBus.ts`; the
  store is updated at ≤ 4 Hz (or immediately on status change). The ECG canvas reads the ring in `requestAnimationFrame`.
- **One notification channel**: alerts go through `lib/alerts/alertCenter.ts` (Sileo toast, sound, voice, log), each
  isolated in try/catch. The island pill shows the overall status; while nothing is in alarm yet it shows the nearest forecast instead ("Heart rate · 1:27", "+N" for the others, full list in its tooltip). A card never changes its size for a forecast: it only gets a small countdown capsule in its header (`ForecastPill`). Organ readings open as a popover anchored to the hotspot in `BodyScan`. Critical toasts stay until acknowledged.
- **SourceManager** (`lib/sources`) owns LIVE/POLL/STALE/SIM. Components never talk to WebSocket directly.
- **Never name a CSS class `outline`** on SVG elements: it collides with Tailwind's `outline` utility and draws boxes.
- Keep `backdrop-filter` to the few large panels (`.glass-blur`); it is the main rendering cost without a GPU.
- **Everything user-facing is translated through keys** (`lib/i18n.ts`: en/ru/uz). The flight log stores `{key, params}`, never finished strings; metric names, status words, voice text and units are keys too. Use `useT()` in components and `tr()`/`metricName()`/`statusWord()` outside React. A test requires Russian to be complete.
- **Voice** (`lib/audio.ts`) speaks in the interface language (Uzbek falls back to Russian), spells out units, and never lets a warning cut off an emergency.
- **UI kit**: shadcn-style components in `components/ui` (Radix via the `radix-ui` package, `cn()` in `lib/utils.ts`). They were added by hand because the shadcn CLI was too slow on the venue network; theme tokens are mapped in `globals.css`. `components/RubberSegment.tsx` (view tabs) came from `shadcn add @react-bits/RubberSegment-TS-TW`; that CLI downgrades `motion` and rewrites the lockfile, so after any `shadcn add` restore `apps/web/package.json` and `pnpm-lock.yaml` from git.
- **react-bits components** (`components/BellToggle|HoldButton|GlideSelect|SpringCheck|AnimatedList|ElasticSlider|RubberSegment.tsx`, from `shadcn add @react-bits/...`) are used through thin wrappers: `ui/select.tsx` (every choose-one select), `deck/HoldButton.tsx` (0.8 s hold, `HOLD_MS`), `ui/segmented.tsx` (tabs and filters). They need `@hugeicons/*` (keep) and bring Tailwind v3 classes: `blur-0` does not exist in v4, use `blur-none`. Sound uses `BellToggle`, protocol steps `SpringCheck`, the island's forecast list `AnimatedList`, Time Travel `ElasticSlider`.
- **Time Travel / replay** (`lib/replay.ts`, store `timeTravelT` + `replayPlaying` + `replaySpeed`): drag or click starts a replay from that moment to the present (default 4×, hands over to live when caught up); pause, ±10 s (`J`/`L`), `K`, `T`. The window starts at the session start (never under 2 minutes). It only changes what the display shows: never touch the live pipeline (frames, alerts, forecasts, island, flight log) from replay code. Replayed frames are cached per `(crew, 0.1 s)` in `useDisplayFrame`.
- **Tabs and filters**: always `components/ui/segmented.tsx` (the rubber-band `RubberSegment`); never add another tab component. The active telemetry tab lives in the store (`telemetryView`), and `jumpTo(crewId, metric)` selects a crew member and opens the right tab: the island forecast rows and flight-log rows use it. Motion springs accept exactly two keyframes: a 3-keyframe spring throws and takes its widget down.
- **Flight log**: active warnings and emergencies are pinned above the chronological list (`PinnedIncidents`) until the reading is back in range; commands, link and system rows are dimmed; serious rows carry a tint and a left stripe; the Alerts filter shows a coral drop with the count of new serious alerts while another filter is open.
- **Buttons** share one matte finish (`components/ui/button.tsx`): soft fill, faint top highlight, no border or ring, soft hover. Do not add outlined buttons.
- **Telemetry views**: Vitals / Cabin / Radiation tabs sit above the ECG, which takes the leftover height; cards keep their natural height. A reading's normal range (`normText`) is shown right of the number.
- **Provenance**: every reading is marked recorded (PhysioNet) or modeled (`SOURCE_OF` in `lib/metrics.ts`). Do not credit a source in the UI or in the pack metadata unless its data is really loaded.
- **Report and package** (ADR in `docs/adr/0001-*.md`): `buildReport` (engine) turns the event log into incidents with causes and an illustrative protocol; `TelemetryPackage` is the validated file that is exported and re-imported (`lib/packageIO.ts`, zod schema in the engine). Protocol text lives in `packages/data/protocols.json` (en/ru, provisional). `timeToThreshold` feeds the "reaches warning in ..." line on vital cards.
- **Limits carry their basis**: every metric in `thresholds.json` has `tier` (nasa / derived / clinical / engineering / provisional), optional per-level `levelTier`, and a `source`. Never label a number `nasa` unless it is stated in NASA-STD-3001; see `docs/thresholds-sources.md`. While exercising (`frame.exercise`), `thresholds.exercise` replaces the resting HR / breathing / BP / stress / HRV limits (`limitsFor` in the engine), so normal effort is not an alarm.
- **"Reaches warning in ..."** (`timeToThreshold`) only shows for a clear, fast trend: at least 2 hysteresis widths of movement across the window and an arrival within 3 minutes. Slow simulated drift must never produce it.
- **Report** always carries `limits` and, for a short window, `earlier` (incidents before the window), so a 5-minute view never hides a flare from earlier. Exports: JSON / .json.gz package, Excel (`lib/xlsx.ts`, no dependency) for the report and the flight log, CSV with `sep=;`.
- **Live space weather** is fetched by the API (`/spaceweather`, NOAA SWPC GOES) and shown as a real measurement; it is never mixed into the crew's modelled dose.
- Only preferences are persisted (`locale`, `selectedCrewId`); events and the flight log belong to one server run.
- Status is always icon + word + colour. Dark theme only. Respect `prefers-reduced-motion`.

## Add a scenario or modifier

1. Event type: add to `EventType` in `packages/engine/src/schemas.ts`, handle it in `modifiers.ts` / `frame.ts`, put its
   numbers in `packages/data/modifiers.json`, validate it in `TelemetryService.command` (`apps/api`).
2. Add a button in `components/deck/ControlDeck.tsx` using `HoldButton` and `sendCommand(type, crewId, params)`.
3. Add a test next to the engine code, run `pnpm build:libs`, restart the API.

## Testing approach

Unit tests only for logic that can silently break the demo: engine (frames, status hysteresis, time travel), WFDB parser,
API command validation, SourceManager state machine, replay clock, alert isolation. Visual checks are done in a browser.
