import type { Status, VitalKey } from '@astro/engine';

export interface MetricInfo {
  unit: string;
  decimals: number;
}

/** Units and precision only. Names are translated: see `metricName` in i18n.ts. */
export const METRICS: Record<string, MetricInfo> = {
  hr: { unit: 'bpm', decimals: 0 },
  hrv: { unit: 'ms', decimals: 0 },
  spo2: { unit: '%', decimals: 0 },
  bpSys: { unit: 'mmHg', decimals: 0 },
  bpDia: { unit: 'mmHg', decimals: 0 },
  respRate: { unit: '/min', decimals: 0 },
  temp: { unit: '°C', decimals: 1 },
  stress: { unit: 'idx', decimals: 0 },
  eeg: { unit: 'µV', decimals: 1 },
  co2: { unit: 'mmHg', decimals: 1 },
  o2: { unit: '%', decimals: 1 },
  humidity: { unit: '%', decimals: 0 },
  noise: { unit: 'NC', decimals: 0 },
  airflow: { unit: 'm/s', decimals: 2 },
  doseRate: { unit: 'µSv/h', decimals: 0 },
  dose: { unit: 'mSv', decimals: 2 },
};

export interface OrganInfo {
  id: 'brain' | 'heart' | 'lungs' | 'muscle';
  metrics: Array<VitalKey | 'co2' | 'o2'>;
}
export const ORGANS: OrganInfo[] = [
  { id: 'brain', metrics: ['eeg', 'stress'] },
  { id: 'heart', metrics: ['hr', 'hrv', 'bpSys', 'bpDia'] },
  { id: 'lungs', metrics: ['spo2', 'respRate', 'o2'] },
  { id: 'muscle', metrics: ['temp'] },
];

/** Where each reading comes from: a recorded PhysioNet signal, or our model on top of it. */
export type Provenance = 'real' | 'modeled';
export const SOURCE_OF: Record<string, { kind: Provenance; src: string }> = {
  hr: { kind: 'real', src: 'PhysioNet MIT-BIH + BIDMC' },
  spo2: { kind: 'real', src: 'PhysioNet BIDMC' },
  respRate: { kind: 'real', src: 'PhysioNet BIDMC' },
  hrv: { kind: 'modeled', src: '' },
  bp: { kind: 'modeled', src: '' },
  temp: { kind: 'modeled', src: '' },
  stress: { kind: 'modeled', src: '' },
  eeg: { kind: 'modeled', src: '' },
  o2: { kind: 'modeled', src: '' },
  co2: { kind: 'modeled', src: '' },
  humidity: { kind: 'modeled', src: '' },
  noise: { kind: 'modeled', src: '' },
  airflow: { kind: 'modeled', src: '' },
  /** the live space-weather strip; only shown as a source once data has really arrived */
  goes: { kind: 'real', src: 'NOAA SWPC GOES' },
};

/** The three telemetry views and the readings each one shows. */
export type TelemetryView = 'vitals' | 'cabin' | 'radiation';
export const TELEMETRY_VIEWS: TelemetryView[] = ['vitals', 'cabin', 'radiation'];
export const VIEW_METRICS: Record<TelemetryView, string[]> = {
  vitals: ['hr', 'hrv', 'spo2', 'bpSys', 'bpDia', 'respRate', 'temp', 'stress', 'eeg'],
  cabin: ['o2', 'co2', 'humidity', 'noise', 'airflow'],
  radiation: ['doseRate', 'dose'],
};
/** Which view a reading lives in, so a click on an alert can open the right tab. */
export const viewOfMetric = (metric: string | undefined): TelemetryView =>
  TELEMETRY_VIEWS.find((v) => metric !== undefined && VIEW_METRICS[v].includes(metric)) ?? 'vitals';

export const STATUS_RANK: Record<Status, number> = { NOMINAL: 0, CAUTION: 1, WARNING: 2, CRITICAL: 3 };
export const STATUS_COLOR: Record<Status, string> = {
  NOMINAL: 'var(--color-teal)', CAUTION: 'var(--color-amber)', WARNING: 'var(--color-coral)', CRITICAL: 'var(--color-crimson)',
};

export function formatMet(t: number): string {
  const s = Math.max(0, Math.floor(t));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d, 3)}:${p(h)}:${p(m)}:${p(s % 60)}`;
}
