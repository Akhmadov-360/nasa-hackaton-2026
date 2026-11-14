import { computeFrame, type EngineConfig, type TelemetryFrame } from '@astro/engine';
import { baseCfg } from './engineConfig';

/** Frames per event log and moment: when the replay cursor slides, only the newest grid points are computed. */
const cache = new WeakMap<object, Map<string, TelemetryFrame>>();
const GRID_SEC = 0.2;
const MAX_CACHED = 3000;

/**
 * The frames behind a sparkline while a replay runs: `windowSec` seconds up to the cursor, on a 0.2 s grid aligned to
 * the mission clock, so moving the cursor reuses almost everything. Values only (no status hysteresis), oldest first.
 * Pure apart from the cache; the live pipeline is never touched.
 */
export function replayFrames(events: EngineConfig['log'], crewId: string, endT: number, windowSec: number): TelemetryFrame[] {
  let map = cache.get(events);
  if (!map) { map = new Map(); cache.set(events, map); }
  if (map.size > MAX_CACHED) map.clear();
  const end = Math.floor(endT / GRID_SEC) * GRID_SEC;
  const n = Math.max(1, Math.round(windowSec / GRID_SEC));
  const cfg: EngineConfig = { ...baseCfg, log: events };
  const out: TelemetryFrame[] = [];
  for (let i = n; i >= 0; i--) {
    const t = Math.round((end - i * GRID_SEC) * 10) / 10;
    if (t < 0) continue;
    const key = `${crewId}:${t.toFixed(1)}`;
    let f = map.get(key);
    if (!f) { f = computeFrame(cfg, crewId, t); map.set(key, f); }
    out.push(f);
  }
  return out;
}
