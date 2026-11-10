# ADR-0001: Medical report and telemetry package are computed by the engine and travel as one validated file

**Status:** Accepted
**Date:** 2026-11-10
**Deciders:** project team

## Context

Monitoring alone is not enough for a long mission with delayed communication: the ground team needs a summary of what
happened, and the crew needs guidance when something goes wrong. We have no database, no backend state beyond an event
log, and the demo must work offline. The report must be reproducible and must be importable on another machine (the
"ground station") without the original run.

## Decision

1. `packages/engine` computes the report (`buildReport`) from the same deterministic frame function and the event log.
   Incidents are derived by merging overlapping WARNING-or-worse episodes; causes come from the event log.
2. The report schema is a zod schema in the engine and is also the validator of the import file.
3. A **telemetry package** (`astro-telemetry-package/1`) is one JSON file (optionally gzip) holding the finished report
   plus session metadata. Import validates it, drops unknown fields, enforces size limits and never executes anything.
4. Trends (`timeToThreshold`) are a pure function over recent samples; the UI only displays them when the fit is clear.
5. Protocol text lives in `packages/data/protocols.json` (en/ru), marked provisional and illustrative.

## Options considered

### A. Compute in the engine, ship the finished report (chosen)
| Dimension | Assessment |
|---|---|
| Complexity | Low: one pure function and one schema |
| Offline | Works; the browser and the server share the code |
| Reproducibility | Same inputs give the same report |
| Import safety | One schema validates everything |

**Cons:** the package duplicates the event log inside the report (small, capped at 500 events).

### B. Ship raw frames and recompute on the receiver
**Pros:** receiver can re-derive anything. **Cons:** large files over a slow link, and the receiver needs the same pack and
thresholds, which are provisional and change.

### C. Server-side report with a database
**Cons:** adds infrastructure that fails offline, against the project's fault-tolerance goal.

## Trade-off analysis

A keeps files small and self-contained, which matters on a delayed link. The cost is that a package is a snapshot, not a
re-computable dataset; this is acceptable because the report is the deliverable.

## Consequences

- Report logic is unit-tested in the engine; the UI only renders it.
- A schema change needs a new `schema` version string so old packages are rejected with a clear message.
- Protocols and thresholds remain provisional until medical input exists; every screen that shows them says so.

## Action items

1. [x] Engine: `report.ts`, `trend.ts`, `telemetryPackage.ts` with tests
2. [ ] UI: report drawer, import/export, protocol dialog, time-to-threshold on cards
3. [ ] Replace the illustrative protocols with approved text when available
