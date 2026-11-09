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
pnpm --filter @astro/data build:pack      # rebuild packs/demo.pack.json from data-raw/
NASA_API_KEY=... pnpm --filter @astro/data fetch:donki
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
  isolated in try/catch. The island pill shows status only, with no message text. Organ readings are shown inline in `BodyScan`.
- **SourceManager** (`lib/sources`) owns LIVE/POLL/STALE/SIM. Components never talk to WebSocket directly.
- **Never name a CSS class `outline`** on SVG elements: it collides with Tailwind's `outline` utility and draws boxes.
- Keep `backdrop-filter` to the few large panels (`.glass-blur`); it is the main rendering cost without a GPU.
- Status is always icon + word + colour. Dark theme only. Respect `prefers-reduced-motion`.

## Add a scenario or modifier

1. Event type: add to `EventType` in `packages/engine/src/schemas.ts`, handle it in `modifiers.ts` / `frame.ts`, put its
   numbers in `packages/data/modifiers.json`, validate it in `TelemetryService.command` (`apps/api`).
2. Add a button in `components/deck/ControlDeck.tsx` using `HoldButton` and `sendCommand(type, crewId, params)`.
3. Add a test next to the engine code, run `pnpm build:libs`, restart the API.

## Testing approach

Unit tests only for logic that can silently break the demo: engine (frames, status hysteresis, time travel), WFDB parser,
API command validation, SourceManager state machine, hold-to-confirm, alert isolation. Visual checks are done in a browser.
