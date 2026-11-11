import { z } from 'zod';

export type Status = 'NOMINAL' | 'CAUTION' | 'WARNING' | 'CRITICAL';
export const STATUS_ORDER: Status[] = ['NOMINAL', 'CAUTION', 'WARNING', 'CRITICAL'];

export const VITAL_KEYS = ['hr', 'hrv', 'spo2', 'bpSys', 'bpDia', 'respRate', 'temp', 'stress', 'eeg'] as const;
export type VitalKey = (typeof VITAL_KEYS)[number];
export type Vitals = Record<VitalKey, number>;

export const VITAL_DEFAULTS: Vitals = {
  hr: 70, hrv: 55, spo2: 98, bpSys: 118, bpDia: 76, respRate: 15, temp: 36.7, stress: 20, eeg: 10,
};

export interface TelemetryFrame {
  t: number;
  crewId: string;
  vitals: Vitals;
  ecg: number[];
  radiation: { doseRateUSvH: number; cumulativeMSv: number };
  /** co2 in mmHg (partial pressure), o2 in % of atmosphere, humidity in % RH, noise as a simulated NC rating */
  cabin: { co2: number; o2: number; humidity: number; noise: number; /** ventilation, m/s */ airflow: number };
  status: { overall: Status; byMetric: Record<string, Status> };
  /** true when any value was substituted because the input was invalid */
  degraded: boolean;
  /** true while exertion is active: statuses use `Thresholds.exercise` for the metrics it lists */
  exercise?: boolean;
}

export interface Alert {
  id: string;
  t: number;
  crewId: string;
  metric: string;
  severity: Status;
  message: string;
  /** value that crossed the threshold and its unit, for UI formatting */
  value?: number;
  unit?: string;
}

export type EventType = 'flare' | 'exertion' | 'o2fault' | 'normalize';
export interface EngineEvent {
  t: number;
  type: EventType;
  /** crew id or 'ALL' */
  crewId: string;
  params?: Record<string, number | string>;
}

export interface Track {
  ecgHz: number;
  vitalsHz: number;
  ecg: number[];
  hr: number[];
  spo2: number[];
  resp: number[];
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
}

export interface ScenarioPack {
  meta: { id: string; title: string; sources: string[]; licenses: string[]; provisional?: boolean };
  crew: CrewMember[];
  baselines: Record<string, Track>;
  /** pre-recorded episodes, e.g. a real DONKI flare mapped to mission time */
  events: EngineEvent[];
}

export interface LevelSet {
  caution: number;
  warning: number;
  critical: number;
}
export interface MetricThreshold {
  unit: string;
  high?: LevelSet;
  low?: LevelSet;
  /** how far back past a threshold a value must return to release the status */
  hysteresis: number;
  /** where the numbers come from; see docs/thresholds-sources.md */
  tier?: LimitTier;
  /** per-level override of `tier` (e.g. CO2: caution is NASA, critical is our choice) */
  levelTier?: Partial<Record<'caution' | 'warning' | 'critical', LimitTier>>;
  source?: string;
}
/**
 * nasa = value stated in NASA-STD-3001; derived = computed from or taken from another NASA document;
 * clinical = general clinical reference (AHA/ACC), not NASA; engineering = our choice; provisional = placeholder
 */
export type LimitTier = 'nasa' | 'derived' | 'clinical' | 'engineering' | 'provisional';
export interface Thresholds {
  provisional?: boolean;
  metrics: Record<string, MetricThreshold>;
  /** replacement high/low levels used while the crew member is exercising (resting limits would call normal exercise an alarm) */
  exercise?: Record<string, { high?: LevelSet; low?: LevelSet; source?: string }>;
}

const finite = z.number().finite();
const asNumber = (v: unknown): number | undefined => {
  const r = finite.safeParse(v);
  return r.success ? r.data : undefined;
};
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Never throws. Invalid numbers fall back to `last`, then to defaults, and flag `degraded`. */
export function parseFrame(input: unknown, last?: TelemetryFrame): TelemetryFrame {
  const src = obj(input);
  let degraded = input === null || typeof input !== 'object' || Array.isArray(input);
  const pick = (v: unknown, fallback: number): number => {
    const n = asNumber(v);
    if (n === undefined) {
      degraded = true;
      return fallback;
    }
    return n;
  };

  const sv = obj(src.vitals);
  const vitals = {} as Vitals;
  for (const k of VITAL_KEYS) vitals[k] = pick(sv[k], last?.vitals[k] ?? VITAL_DEFAULTS[k]);
  if (src.vitals !== undefined && Object.keys(sv).length === 0) degraded = true;

  const sr = obj(src.radiation);
  const sc = obj(src.cabin);
  const ss = obj(src.status);
  const byMetric: Record<string, Status> = {};
  for (const [k, v] of Object.entries(obj(ss.byMetric))) {
    if (STATUS_ORDER.includes(v as Status)) byMetric[k] = v as Status;
  }
  const overall = STATUS_ORDER.includes(ss.overall as Status) ? (ss.overall as Status) : (last?.status.overall ?? 'NOMINAL');

  return {
    t: pick(src.t, last?.t ?? 0),
    crewId: typeof src.crewId === 'string' ? src.crewId : (last?.crewId ?? 'UNKNOWN'),
    vitals,
    ecg: Array.isArray(src.ecg) ? src.ecg.filter((x): x is number => asNumber(x) !== undefined) : [],
    radiation: {
      doseRateUSvH: pick(sr.doseRateUSvH, last?.radiation.doseRateUSvH ?? 0),
      cumulativeMSv: pick(sr.cumulativeMSv, last?.radiation.cumulativeMSv ?? 0),
    },
    cabin: {
      co2: pick(sc.co2, last?.cabin.co2 ?? 2),
      o2: pick(sc.o2, last?.cabin.o2 ?? 21),
      humidity: pick(sc.humidity, last?.cabin.humidity ?? 45),
      noise: pick(sc.noise, last?.cabin.noise ?? 36),
      airflow: pick(sc.airflow, last?.cabin.airflow ?? 0.12),
    },
    status: { overall, byMetric },
    degraded: input === undefined ? true : degraded || src.degraded === true,
    ...(src.exercise === true ? { exercise: true } : {}),
  };
}
