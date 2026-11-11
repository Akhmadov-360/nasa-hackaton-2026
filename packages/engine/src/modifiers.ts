import type { EngineEvent } from './schemas';

export interface Shape { riseSec: number; holdSec: number; decaySec: number }
export interface ExertionCfg extends Shape {
  hrAdd: number; hrvDrop: number; spo2Drop: number; respAdd: number; bpSysAdd: number; tempAdd: number; stressAdd: number;
}
export interface O2FaultCfg {
  /** the fault clears by itself after this long if nobody normalizes it */
  durationSec: number;
  spo2Floor: number; spo2TauSec: number;
  hrAdd: number; hrRiseTauSec: number;
  hrDecompStartSec: number; hrDecompDrop: number; hrDecompSpanSec: number;
  respAdd: number; cabinO2Drop: number; stressAdd: number; eegDrop: number;
}
export interface CabinCfg {
  co2Baseline: number; co2Noise: number; o2Baseline: number; o2Noise: number;
  /** % relative humidity: baseline, slow drift amplitude and period, jitter */
  humidityBaseline: number; humidityDrift: number; humidityPeriodSec: number; humidityNoise: number;
  /** simulated NC rating; exercise equipment adds `noiseExertionAdd` at full exertion */
  noiseBaseline: number; noiseNoise: number; noiseExertionAdd: number;
}
export const DEFAULT_CABIN: CabinCfg = {
  co2Baseline: 2, co2Noise: 0.2, o2Baseline: 21, o2Noise: 0.05,
  humidityBaseline: 45, humidityDrift: 4, humidityPeriodSec: 900, humidityNoise: 0.4,
  noiseBaseline: 36, noiseNoise: 1, noiseExertionAdd: 6,
};
export interface ModifiersConfig { recoverSec: number; exertion: ExertionCfg; o2fault: O2FaultCfg; cabin?: CabinCfg }
export interface FlareClass {
  /** peak dose rate in uSv/h: [at magnitude 1, at the largest magnitude] */
  peakUSvH: [number, number];
  magnitudeMax: number;
  riseSec: number; holdSec: number; decaySec: number;
}
export interface RadiationConfig {
  backgroundUSvH: number;
  /** real event seconds represented by one demo second */
  demoCompression: number;
  classes: Record<string, FlareClass>;
}

/** Trapezoid 0..1: rise, hold at 1, decay. */
export function envelope(t: number, start: number, rise: number, hold: number, decay: number): number {
  const x = t - start;
  if (x <= 0) return 0;
  if (x < rise) return x / rise;
  if (x < rise + hold) return 1;
  const y = x - rise - hold;
  return y < decay ? 1 - y / decay : 0;
}

/** Integral of `envelope` from `start` to `t`. */
export function envelopeArea(t: number, start: number, rise: number, hold: number, decay: number): number {
  const x = t - start;
  if (x <= 0) return 0;
  if (x < rise) return (x * x) / (2 * rise);
  if (x < rise + hold) return rise / 2 + (x - rise);
  const y = x - rise - hold;
  const base = rise / 2 + hold;
  return y < decay ? base + y - (y * y) / (2 * decay) : base + decay / 2;
}

const appliesTo = (e: EngineEvent, crewId: string) => e.crewId === crewId || e.crewId === 'ALL';
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Level of one exertion event (trapezoid), ended early by a later `normalize`. */
export function eventLevel(e: EngineEvent, shape: Shape, cutoff: number | undefined, recoverSec: number, t: number): number {
  const intensity = Number(e.params?.intensity ?? 1);
  const tt = cutoff !== undefined ? Math.min(t, cutoff) : t;
  let lv = envelope(tt, e.t, shape.riseSec, shape.holdSec, shape.decaySec);
  if (cutoff !== undefined && t > cutoff) lv *= Math.max(0, 1 - (t - cutoff) / recoverSec);
  return lv * intensity;
}

/** Oxygen fault curves at `x` seconds after onset: exponential approach for SpO2 and the cabin, compensate-then-fail for HR. */
export function o2faultCurves(x: number, c: O2FaultCfg): { level: number; hrOffset: number } {
  if (x <= 0) return { level: 0, hrOffset: 0 };
  const level = 1 - Math.exp(-x / c.spo2TauSec);
  const compensation = c.hrAdd * (1 - Math.exp(-x / c.hrRiseTauSec));
  const decompensation = c.hrDecompDrop * clamp01((x - c.hrDecompStartSec) / c.hrDecompSpanSec);
  return { level, hrOffset: compensation - decompensation };
}

/** The fault as seen at time `t`: ends at `durationSec` or at a `normalize`, then fades over `recoverSec`. */
export function o2faultAt(e: EngineEvent, cutoff: number | undefined, t: number, cfg: ModifiersConfig): { level: number; hrOffset: number } {
  const intensity = Number(e.params?.intensity ?? 1);
  const end = Math.min(cutoff ?? Infinity, e.t + cfg.o2fault.durationSec);
  const cur = o2faultCurves(Math.min(t, end) - e.t, cfg.o2fault);
  const fade = t > end ? Math.max(0, 1 - (t - end) / cfg.recoverSec) : 1;
  return { level: cur.level * fade * intensity, hrOffset: cur.hrOffset * fade * intensity };
}

export interface Levels { exertion: number; o2fault: number; o2faultHr: number }

export function levelsFor(log: EngineEvent[], crewId: string, t: number, cfg: ModifiersConfig): Levels {
  const mine = log.filter((e) => appliesTo(e, crewId));
  const norms = mine.filter((e) => e.type === 'normalize').map((e) => e.t).sort((a, b) => a - b);
  const out: Levels = { exertion: 0, o2fault: 0, o2faultHr: 0 };
  for (const e of mine) {
    const cutoff = norms.find((n) => n > e.t);
    if (e.type === 'exertion') {
      out.exertion = Math.max(out.exertion, eventLevel(e, cfg.exertion, cutoff, cfg.recoverSec, t));
    } else if (e.type === 'o2fault') {
      const f = o2faultAt(e, cutoff, t, cfg);
      out.o2fault = Math.max(out.o2fault, f.level);
      if (Math.abs(f.hrOffset) > Math.abs(out.o2faultHr)) out.o2faultHr = f.hrOffset;
    }
  }
  return out;
}

/** Warped time: real time plus the extra beats accumulated while HR is off baseline (speeds up or slows the ECG). */
export function ecgWarp(log: EngineEvent[], crewId: string, t: number, cfg: ModifiersConfig, hrMean: number): number {
  const mine = log.filter((e) => appliesTo(e, crewId));
  const norms = mine.filter((e) => e.type === 'normalize').map((e) => e.t).sort((a, b) => a - b);
  let extra = 0;
  for (const e of mine) {
    if (e.type !== 'exertion' && e.type !== 'o2fault') continue;
    const cutoff = norms.find((n) => n > e.t);
    const horizon = e.type === 'exertion'
      ? cfg.exertion.riseSec + cfg.exertion.holdSec + cfg.exertion.decaySec
      : cfg.o2fault.durationSec;
    const end = Math.min(t, e.t + horizon + cfg.recoverSec);
    for (let tau = e.t; tau < end; tau += 1) {
      const hrOff = e.type === 'exertion'
        ? cfg.exertion.hrAdd * eventLevel(e, cfg.exertion, cutoff, cfg.recoverSec, tau)
        : o2faultAt(e, cutoff, tau, cfg).hrOffset;
      extra += hrOff / hrMean;
    }
  }
  return t + extra;
}
