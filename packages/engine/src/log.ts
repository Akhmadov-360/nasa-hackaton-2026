import { computeFrame, type EngineConfig } from './frame';
import type { EngineEvent, Status, TelemetryFrame } from './schemas';

/** Returns a new log sorted by time; never mutates the input. */
export function appendEvent(log: EngineEvent[], ev: EngineEvent): EngineEvent[] {
  return [...log, ev].sort((a, b) => a.t - b.t);
}

const WARMUP_SEC = 60;
const WARMUP_STEP = 5;

/**
 * Frame at any moment of the mission (Time Travel). `t` is clamped into [minT, maxT].
 * Status hysteresis is warmed up over the preceding minute so the result matches the live stream.
 */
export function frameAt(
  cfg: EngineConfig, crewId: string, t: number, range?: { minT: number; maxT: number },
): TelemetryFrame {
  const tt = range ? Math.min(range.maxT, Math.max(range.minT, t)) : Math.max(0, t);
  let prev: Record<string, Status> | undefined;
  for (let s = Math.max(range?.minT ?? 0, tt - WARMUP_SEC); s < tt; s += WARMUP_STEP) {
    prev = computeFrame(cfg, crewId, s, prev).status.byMetric;
  }
  return computeFrame(cfg, crewId, tt, prev);
}
