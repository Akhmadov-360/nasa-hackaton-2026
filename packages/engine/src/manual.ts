import type { EngineEvent } from './schemas';

/**
 * Self-check: readings the crew member enters by hand. They are recorded as `measurement` events in the event log,
 * so replay, the report, the package and the offline path all work on them without a second store.
 */
export type ManualMetric = 'glucose' | 'sleep' | 'mood' | 'hydration';

export interface ManualSpec {
  unit: string;
  /** accepted range of one entry (the API and the form both enforce it) */
  min: number;
  max: number;
  integer?: boolean;
  /** how long an entry stays current; after that the reading is "due", not an alarm */
  validSec: number;
  /** latest = the newest entry counts; sum = all entries in the window are added (water drunk) */
  agg: 'latest' | 'sum';
}

const H = 3600;
export const MANUAL: Record<ManualMetric, ManualSpec> = {
  glucose: { unit: 'mg/dL', min: 20, max: 600, validSec: 8 * H, agg: 'latest' },
  sleep: { unit: 'h', min: 0, max: 24, validSec: 24 * H, agg: 'latest' },
  mood: { unit: '/5', min: 1, max: 5, integer: true, validSec: 12 * H, agg: 'latest' },
  hydration: { unit: 'L', min: 0.05, max: 3, validSec: 24 * H, agg: 'sum' },
};
export const MANUAL_KEYS = Object.keys(MANUAL) as ManualMetric[];
export const isManualMetric = (m: unknown): m is ManualMetric => typeof m === 'string' && m in MANUAL;

/** Whether `value` is an acceptable single entry for `metric`. */
export function validManualValue(metric: ManualMetric, value: unknown): value is number {
  const s = MANUAL[metric];
  return typeof value === 'number' && Number.isFinite(value) && value >= s.min && value <= s.max && (!s.integer || Number.isInteger(value));
}

/** Current self-check values of one crew member at time `t`: the entry (or sum) and the time of the newest entry. */
export type ManualState = Partial<Record<ManualMetric, { value: number; t: number }>>;

export function manualAt(events: EngineEvent[], crewId: string, t: number): ManualState {
  const out: ManualState = {};
  for (const e of events) {
    if (e.type !== 'measurement' || e.crewId !== crewId || e.t > t) continue;
    const metric = e.params?.metric;
    const value = e.params?.value;
    if (!isManualMetric(metric) || !validManualValue(metric, value)) continue;
    const spec = MANUAL[metric];
    if (t - e.t > spec.validSec) continue;
    const cur = out[metric];
    if (spec.agg === 'sum') out[metric] = { value: (cur?.value ?? 0) + value, t: Math.max(cur?.t ?? e.t, e.t) };
    else if (!cur || e.t >= cur.t) out[metric] = { value, t: e.t };
  }
  return out;
}
