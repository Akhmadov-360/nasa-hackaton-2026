# Roadmap: closing the gaps against the challenge text

Written 2026-11-14 (hackathon day). Sources: the challenge page ("Create Health Monitoring Software for Astronauts on Space
Missions", Details and Resources tabs), NASA HRP "5 Hazards of Human Spaceflight" (nasa.gov/hrp/hazards), the code in this
repository, and the engineering checklists (system design, tech debt, testing strategy).

What I could **not** read: the *Project Submission Guide* and *Judging and Awards Guide* from the kick-off e-mail (they need a
login). Their deadlines and format rules must be checked by the team before the submission block below is trusted.

## Status

| Item | State |
|---|---|
| D1 Smoke test and rehearsal | Done (`pnpm smoke`, `scripts/smoke.md`) |
| Submission pack | Done (`docs/SUBMISSION.md`, README NASA data and AI-use sections) |
| G2 "Do now" guidance | Done (pinned alarms, organ popover; Island list not changed) |
| G3 "About this indicator" + organ function | Done (side window from card titles, organ popover rows and the Crew dose title; `about.json`, en/ru). Hazards and risks per indicator are shown in the window |
| G1 Self-Check (glucose, sleep, mood, water) | Done: `measurement` events, `frame.manual`, limits and sources, API validation, Self-check tab and side window, smoke step (14 steps). Edit and remove with undo, optional earlier time, wall-clock date in the Excel *Self-check* sheet, mood as five faces. Not done: reminders to enter values (G4) |
| G6+G8 Mission context and escalation | Done: five contexts (station, Gateway, Moon base, Mars transit, Mars base), delay in the header on wide screens and in the tooltip, the *Ground* line under *Do now* for a warning or a critical reading. The station delay (0.25 to 0.5 s) is our estimate; NASA says under a second via the relay satellites |
| G7 Hazard tags | Done: icon chips in the *About* window and a legend of the five hazards (shield button beside the tabs) that lists the indicators of each hazard and opens their *About* windows. No tags on the cards, to keep them small |
| G4 Routine check-ins | Done: schedule in `checkins.json`, due and overdue derived from the event log, header chip, tab ring, due state on the cards. Not done: a streak counter (optional), reminders by voice or sound |
| G5 Metric detail chart | Done as the first section of the *About* window (periods 5 min, 30 min, session; limit bands; hover value; entries as points for the self-check values). No separate window and no tabs: *About* already holds the explanation and the *Do now* text lives at the alarm |
| G9, G10 | Not started |

## 1. What the challenge asks, and where we are

The text names four things: (a) astronauts **assess their own health** and act on it, (b) data can come from **user input**
(keyboard, mouse, camera), (c) the tool explains **why an exam is needed, how hazards affect each indicator, when to call the
crew or flight surgeons, and what to do**, (d) the **interface** shows status clearly (clickable body, charts, colour).

| Challenge element | Status | Evidence / gap |
|---|---|---|
| Indicators named: blood pressure, heart rate, **blood sugar**, body temperature, **daily sleep hours**, **mood** | **3 of 6** | BP, HR, temperature exist. Glucose, sleep, mood do not |
| Input "from the user" (keyboard, clicks, camera) | **Missing** | Everything comes from the stream or scenarios; no manual entry at all |
| "Astronauts must make health assessments **on themselves**" | Partial | Dashboard is monitor-style; no self-check flow |
| Guidance: what to do now | **Partial** | Protocols exist but only behind the Flight log icon / Report |
| Explanations: why measure, how hazards change it, when to call ground | **Missing** | No per-indicator "about" content |
| Prompt astronauts to take measurements from time to time | **Missing** | No routine, reminders or overdue state |
| Dynamic charts over time | Partial | Sparklines (60 samples) and Time Travel; no chart with limit bands |
| Colour coding | Done | Status colours with icon and word |
| Clickable human figure with function and status | Mostly | Organ popovers show readings; no "what this organ does / which hazards affect it" |
| Different environments (station, rover, base, other planet) | **Missing** | One implicit context |
| Five HRP hazards | Partial | Radiation (modelled), closed environment (cabin metrics), distance (offline mode). **Isolation/confinement** and **gravity (bone, muscle)** have no indicator |
| Gamification (optional) | Missing | Optional |

Strong points already in place (do not rebuild): body scan, colour coding, time-to-threshold forecasts, offline mode, limit
provenance tiers, report and Excel export, replay.

## 2. Priorities

Score = (Impact + Risk) x (6 - Effort), each 1 to 5 (tech-debt framework). Effort in hours is for one developer who knows the code.

| # | Item | Impact | Risk | Effort | Score | Hours |
|---|---|---|---|---|---|---|
| D1 | Golden-path smoke test + production/offline rehearsal | 5 | 5 | 2 | **40** | 2 |
| G2 | Inline "do now" action line at the reading | 5 | 4 | 2 | **36** | 2 |
| G3 | Per-indicator "about" (why, in space, when to call ground) + organ function | 5 | 4 | 2 | **36** | 2.5 |
| D3 | Unit tests for every new engine and API rule | 4 | 4 | 2 | **32** | with each item |
| D2 | CSV/Excel formula-injection guard (only if free text is added) | 3 | 4 | 1 | 35 | 0.5 |
| D4 | README team section, ADR for measurements | 3 | 2 | 1 | 25 | 1 |
| G6+G8 | Mission context switch + ground-delay-aware escalation | 3 | 3 | 2 | 24 | 2.5 |
| G7 | Tag every indicator with the HRP hazard(s) | 3 | 3 | 2 | 24 | 1.5 |
| G10 | i18n completeness report (uz) + voice fallback notice | 3 | 3 | 2 | 24 | 2 |
| G4 | Routine check-in schedule, reminders, overdue, streak | 4 | 3 | 3 | 21 | 3 |
| G5 | Metric detail chart with limit bands | 4 | 3 | 3 | 21 | 3 |
| **G1** | **Self-Check: glucose, sleep, mood, hydration** | 5 | 5 | 4 | **20** | 5 |
| G9 | Sparklines follow the replay cursor | 2 | 3 | 2 | 20 | 1.5 |
| G11 | Exercise countermeasure log (bone and muscle) | 3 | 2 | 3 | 15 | 2.5 |
| G12 | Camera / ultrasound input | 2 | 1 | 5 | 3 | skip |

G1 scores lower only because it is the biggest, but it closes the largest hole (three named indicators and every kind of user
input), and G2 to G4 depend on it for content. **Build G1 first among the features**, but start with D1 because it protects
everything else.

## 3. Design for the biggest item: Self-Check (G1)

### Requirements
- Functional: an astronaut records blood glucose (mg/dL), sleep (hours in the last 24 h), mood / clarity (1 to 5) and water
  drunk (L). The entry appears in the Flight log, the Report and both Excel exports; an out-of-range value raises a status and
  shows the same guidance as a sensor reading.
- Non-functional: works offline (the browser simulation must accept it), survives a page reload and a server restart as far as
  the rest of the session does, works with Time Travel, deterministic, no personal free text.
- Constraint: about one working day, no database, one server process.

### Decision: record entries as events in the existing event log (event sourcing)
Add event type `measurement` with `params: { metric, value }` next to `flare`, `exertion`, `o2fault`, `normalize`.

```
UI form --validate--> sendCommand('measurement', crewId, {metric, value})
   |                      |-> store.addEvent + audit row (Flight log)     (instant, works offline)
   |                      '-> SourceManager.command -> API /events (validated again) -> event log
engine: computeFrame(cfg, crew, t)  ->  frame.manual = latest value per metric at t (+ age)
        applyStatus: evaluates manual metrics with thresholds.json   ->  byMetric.glucose = CAUTION ...
report: episodes, stats and limits table include them;  package schema accepts type 'measurement'
```

Why this and not a client-side store: replay and Time Travel, the Report, the telemetry package and the offline replay of
commands to a returning server all already work on the event log, so manual data inherits them for free and stays
deterministic. Cost: `normalize` must not clear measurements, and `EventType` plus two zod enums change.

**Data model.** `TelemetryFrame.manual?: Record<string, { value: number; t: number }>`. Hydration is the **sum** of entries in the
last 24 h; the others take the latest entry. A reading older than its validity window (glucose 8 h, sleep 24 h, mood 12 h,
hydration 24 h) is `due`, not an alarm.

**API contract** (`TelemetryService.command`): metric whitelist with ranges: glucose 20 to 600, sleep 0 to 24, mood integer 1 to 5,
hydration 0 to 3 per entry. Reject anything else. No free text, so no injection or personal data in exports.

**Thresholds** (new entries in `thresholds.json`, each with a tier and a source, as for every other metric):

| Metric | Limits | Tier | Basis |
|---|---|---|---|
| Glucose, low side | below 70 caution, below 54 warning, below 40 critical | `clinical` (critical `engineering`) | ADA Standards of Care 2026, section 6: hypoglycaemia is below 70 mg/dL, level 2 below 54. **Verified in search results** |
| Glucose, high side | 140 / 180 / 250 | `provisional` | The "70 to 140" range in the brief is **not verified**: confirm fasting and post-meal targets in ADA section 6 before labelling it `clinical` |
| Sleep, hours in 24 h | below 6 / 5 / 4 | `provisional` | Look up the NASA sleep requirement and HRP sleep risk page before upgrading |
| Mood / clarity 1 to 5 | at or below 3 / 2 / 1 | `provisional` | Self-rating index, not a diagnosis; say so in the UI |
| Water drunk, L per day | below 2.5 caution (`derived`), below 2.0 warning and 1.5 critical (`engineering`) | mixed | 2.5 L/day is the minimum water **provided** per crew member (NASA-STD-3001 [V2 6109], OCHMO water brief); it is a supply minimum, not a proven intake target. Say that in the tooltip |

### Trade-offs and what to revisit
- Event log is capped at 300 entries; manual entries share it. Fine for a demo, raise the cap or compact if used for days.
- Self-reported values are untrusted input: validated on both sides, never used to drive the simulated physiology.
- Later: wearable or camera input would enter through the same `measurement` event.

## 4. Implementation plans

Each item lists what to touch and how to know it is done. Run `pnpm build:libs` after engine changes.

### D1. Smoke test and demo rehearsal (do first, 2 h)
- Add `scripts/smoke.md` (the manual golden path) and a small Playwright script run against the production build: enter, hold *O2 supply fault* (0.8 s), wait for the island forecast, open the island list and click a row, open Report and export Excel, drag the Time Travel bar, stop the API and wait for `SIGNAL LOST`.
- Run it on the presentation laptop in both 1366x768 and 1920x1080, then once with Wi-Fi off after a hard reload.
- Done when: the script passes twice in a row on the production build, no console errors except the favicon 404.

### G2. "Do now" line (2 h)
- New `packages/data/guidance.json`: per metric and level, one or two short actions in en/ru (uz later), marked illustrative and not validated by flight surgeons (same wording as protocols). Example for CO2 above 4.5 mmHg: check the CO2 scrubber and raise cabin ventilation.
- Show it where there is room, never in the cards (cards must not change size): in the pinned *Active alarms* block of the Flight log, in the Body Scan organ popover, and in the Island list description.
- Test: every metric that has thresholds has guidance for caution, warning and critical (engine-level test over the two JSON files).

### G3. "About this indicator" and organ function (2.5 h)
- Extend `guidance.json` with `why`, `inSpace`, `howMeasured`, `callGroundWhen`, plus `hazards` (G7). Source every claim to an HRP page or a document already in `docs/thresholds-sources.md`; mark what is not sourced.
- UI: an `i` button in the metric detail drawer (G5) and in the organ popover. Organ copy: function and which hazards affect it (heart: cardiovascular events; muscle and bone: gravity fields; brain: isolation and confinement).
- Test: no empty string in any shipped locale; Russian completeness test already covers dictionary keys, extend it to `guidance.json`.

### G1. Self-Check (5 h), per section 3
1. Engine: `EventType` + `measurement`, `frame.manual`, `metricValues`/`applyStatus` for the four metrics, `normalize` ignores them, report episodes and `limits`, zod enums in `report.ts`. Tests: threshold edges, hydration sums, staleness, replay at an earlier `t`, a package round trip.
2. Data: four metrics in `thresholds.json` with tiers and sources (table above).
3. API: `TelemetryService.command` whitelist and ranges. Tests: accepts valid, rejects NaN, out of range, unknown metric, missing crew.
4. Web: `components/selfcheck/SelfCheckDrawer.tsx` (uses `Segmented` for mood 1 to 5, `ElasticSlider` for sleep hours, number field for glucose, quick buttons for water), a Control deck entry, i18n keys en/ru, log text, metric labels, cards in a fourth tab **Self-check** with the `due` state.
5. Offline: confirm `SimSource` applies the event and the command is replayed to a returning server.
- Done when: entering glucose 52 raises WARNING in the Flight log with the guidance line, the Report lists it, the Excel export has it, and Time Travel to before the entry shows no value.

### G6 + G8. Mission context and escalation (2.5 h)
- `packages/data/missions.json`: Station in low Earth orbit, Lunar base or Gateway, Mars transit, Mars surface habitat. Fields: label, gravity (0, 0.17, 0.38 g; check before showing), one-way delay (Moon about 1.3 s; Mars about 3 to 22 min), who can respond. Do **not** put 1.3 s on the station: it is not that delay.
- A selector next to the link readout (`Select` wrapper). It changes the label, the delay readout and the escalation text ("flight surgeon reply in about N min: act on the checklist first").
- Done when: switching context changes the header and the "call ground" wording, and nothing in the engine changes.

### G7. Hazard tags (1.5 h)
- `hazards` field per metric: radiation, isolation and confinement, distance, gravity fields, closed environment. A small badge in the detail drawer and an *about the five hazards* legend in the info popover. Mood and sleep map to isolation; dose to radiation; cabin metrics to closed environment; blood pressure and heart rate to gravity fields; the offline mode to distance.

### G4. Routine check-ins (3 h)
- A mission-time schedule (JSON): for example glucose every 8 h, sleep and mood once a day, water at set points. The store derives `due` and `overdue` from the last measurement; a small Island chip "2 check-ins due" opens Self-Check. Optional gamification: a streak counter of completed daily routines. Keep it a derived value, not persisted.

### G5. Metric detail chart (3 h)
- Click a card or organ marker: a drawer with a chart of the last N minutes from the engine (`frameAt` at sampled times) with the caution, warning and critical limits drawn as bands, and the tabs *Trend, About, What to do* (G3, G2).

### G9. Sparklines follow the replay cursor (1.5 h)
- `Sparkline` reads the ring buffer. While replaying, build its points from `frameAt` at `cursor - k` for the last 60 steps through the same replay cache as `useDisplayFrame`.

### G10. Translations and voice (2 h)
- A script that lists keys missing in `uz` and strings that equal their English text; have a native speaker read the medical terms. When Uzbek is selected and no Uzbek voice is installed, show a small note that voice alerts use Russian. This is the honest fallback; do not claim Uzbek voice.

### D2, D4 (1.5 h together)
- If free text is ever added, prefix cells starting with `=`, `+`, `-`, `@` in CSV and Excel exports. Self-Check has no free text, so this is only a guard.
- README: replace the template *Team* line with the real team name and members; link NASA HRP hazards and risks pages and the CSA radiation article from the Resources tab; add an ADR `0002` for the measurement event.

## 5. Tech-debt and test findings (for the record)

- **Test debt**: unit tests cover the engine, parser, API validation, source state machine, replay clock and alert isolation. Nothing exercises the interface end to end. Two real defects this week (a 3-keyframe spring that crashed the Control deck, a slider animation loop that died under React StrictMode) were only found in a browser. D1 is the cheapest fix.
- **Dependency debt**: six vendored react-bits components bring Tailwind v3 class names (`blur-0` is not a v4 class) and a second icon library (`@hugeicons`) beside `lucide-react`. Acceptable for the demo; the install command also downgrades `motion` and rewrites the lockfile, so restore both files after any `shadcn add` (the team's local working notes record this rule).
- **Architecture debt**: all state is one in-memory server run (events, log); the API has no authentication and allows localhost/LAN origins. Both are right for a hackathon demo and wrong for anything else; say so in the pitch if asked.
- **Documentation debt**: thresholds are documented per source in `docs/thresholds-sources.md`; add guidance sources there as G2/G3 land.

## 6. Suggested order for today

| Block | Work |
|---|---|
| 1 (about 2 h) | D1 smoke script and rehearsal on the presentation laptop; G2 + G3 content in `guidance.json` |
| 2 (about 5 h) | G1 Self-Check end to end with tests (engine, API, UI, export) |
| 3 (about 3 h) | G6 + G8 mission context, G7 hazard tags, G4 check-in prompts |
| 4 (as time allows) | G5 detail chart, G9 sparklines in replay, G10 translations, G11 exercise log |
| Last 2 h | Freeze features; D4 README and ADR; offline rehearsal; record the 30-second demo video; slides |

## 7. Submission checklist (verify against the Project Submission Guide)

- Team name and members in the README and on the portal; a short description that says what is real (recorded and live data) and what is modelled.
- A 30-second demo clip: Body Scan, hold *O2 supply fault*, island forecast, DONKI flare on Radiation, Time Travel replay, Excel export.
- Slides if the guide asks for them: problem (distance and self-reliance), the five-hazard map, the data-tier table, architecture, demo.
- Production build, 1366x768 and 1920x1080 check, Wi-Fi-off rehearsal, English and Russian voices installed.
- Check the global offers in the kick-off e-mail only if a free domain or hosting is wanted; none is needed for the app to work.
