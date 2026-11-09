import type { Status, VitalKey } from '@astro/engine';

export interface MetricInfo {
  label: string;
  unit: string;
  decimals: number;
}

export const METRICS: Record<string, MetricInfo> = {
  hr: { label: 'heart rate', unit: 'bpm', decimals: 0 },
  hrv: { label: 'heart rate variability', unit: 'ms', decimals: 0 },
  spo2: { label: 'oxygen saturation', unit: '%', decimals: 0 },
  bpSys: { label: 'systolic pressure', unit: 'mmHg', decimals: 0 },
  bpDia: { label: 'diastolic pressure', unit: 'mmHg', decimals: 0 },
  respRate: { label: 'respiration', unit: '/min', decimals: 0 },
  temp: { label: 'body temperature', unit: '°C', decimals: 1 },
  stress: { label: 'stress level', unit: 'idx', decimals: 0 },
  eeg: { label: 'neural activity', unit: 'µV', decimals: 1 },
  co2: { label: 'cabin CO2', unit: 'mmHg', decimals: 1 },
  o2: { label: 'cabin oxygen', unit: '%', decimals: 1 },
  doseRate: { label: 'radiation dose rate', unit: 'µSv/h', decimals: 0 },
  dose: { label: 'accumulated radiation dose', unit: 'mSv', decimals: 2 },
};

export const metricLabel = (k: string) => METRICS[k]?.label ?? k;

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

export const STATUS_RANK: Record<Status, number> = { NOMINAL: 0, CAUTION: 1, WARNING: 2, CRITICAL: 3 };
/** Operator-facing name of a status: CRITICAL is shown as EMERGENCY. */
export const STATUS_WORD: Record<Status, string> = {
  NOMINAL: 'NOMINAL', CAUTION: 'CAUTION', WARNING: 'WARNING', CRITICAL: 'EMERGENCY',
};
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
