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

/** One entry of the self-check as the crew member made it (corrections already applied). */
export interface ManualEntry {
  /** identity for editing and removing; entries recorded without one cannot be corrected */
  id?: string;
  metric: ManualMetric;
  value: number;
  /** mission time the value belongs to (the entry time, or earlier when it was back-dated) */
  t: number;
  crewId: string;
  /** wall-clock time of the entry in ms since 1970, for the report; metadata only, never used by the engine */
  at?: number;
}

type EntryEvent = Pick<EngineEvent, 't' | 'type' | 'crewId' | 'params'>;

/** Ids that a later `measurement` with `params.retract` has removed. A removal is a correction: it applies from the start. */
export function retractedIds(events: EntryEvent[]): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (e.type === 'measurement' && typeof e.params?.retract === 'string') out.add(e.params.retract);
  }
  return out;
}

/**
 * The entries in the log, oldest first, without removed or invalid ones. Editing is a removal plus a new entry, so the
 * event log stays append-only and Time Travel, the report and the package all see the corrected values.
 */
export function manualEntries(events: EntryEvent[], opts: { crewId?: string; fromT?: number; toT?: number } = {}): ManualEntry[] {
  const gone = retractedIds(events);
  const out: ManualEntry[] = [];
  for (const e of events) {
    if (e.type !== 'measurement' || e.params?.retract !== undefined) continue;
    if (opts.crewId !== undefined && e.crewId !== opts.crewId) continue;
    if ((opts.fromT !== undefined && e.t < opts.fromT) || (opts.toT !== undefined && e.t > opts.toT)) continue;
    const metric = e.params?.metric;
    const value = e.params?.value;
    if (!isManualMetric(metric) || !validManualValue(metric, value)) continue;
    const id = typeof e.params?.id === 'string' ? e.params.id : undefined;
    if (id && gone.has(id)) continue;
    const at = typeof e.params?.at === 'number' && Number.isFinite(e.params.at) ? e.params.at : undefined;
    out.push({ ...(id ? { id } : {}), metric, value, t: e.t, crewId: e.crewId, ...(at !== undefined ? { at } : {}) });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Current self-check values of one crew member at time `t`: the entry (or sum) and the time of the newest entry. */
export type ManualState = Partial<Record<ManualMetric, { value: number; t: number }>>;

export function manualAt(events: EngineEvent[], crewId: string, t: number): ManualState {
  const out: ManualState = {};
  for (const e of manualEntries(events, { crewId, toT: t })) {
    const spec = MANUAL[e.metric];
    if (t - e.t > spec.validSec) continue;
    const cur = out[e.metric];
    if (spec.agg === 'sum') out[e.metric] = { value: (cur?.value ?? 0) + e.value, t: Math.max(cur?.t ?? e.t, e.t) };
    else if (!cur || e.t >= cur.t) out[e.metric] = { value: e.value, t: e.t };
  }
  return out;
}
