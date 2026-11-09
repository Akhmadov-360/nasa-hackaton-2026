import type { EngineEvent } from './schemas';

export interface Shape { riseSec: number; holdSec: number; decaySec: number }
export interface ExertionCfg extends Shape {
  hrAddFrac: number; hrvDropFrac: number; respAddFrac: number; bpSysAdd: number; tempAdd: number; stressAdd: number;
}
export interface O2FaultCfg extends Shape {
  spo2Drop: number; hrAdd: number; respAdd: number; cabinO2Drop: number; stressAdd: number; eegDrop: number;
}
export interface ModifiersConfig { recoverSec: number; exertion: ExertionCfg; o2fault: O2FaultCfg }
export interface FlareClass { peakMultiplier: number; riseSec: number; holdSec: number; decaySec: number }
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

/** Level of one exertion/o2fault event, ended early by a later `normalize`. */
export function eventLevel(e: EngineEvent, shape: Shape, cutoff: number | undefined, recoverSec: number, t: number): number {
  const intensity = Number(e.params?.intensity ?? 1);
  const tt = cutoff !== undefined ? Math.min(t, cutoff) : t;
  let lv = envelope(tt, e.t, shape.riseSec, shape.holdSec, shape.decaySec);
  if (cutoff !== undefined && t > cutoff) lv *= Math.max(0, 1 - (t - cutoff) / recoverSec);
  return lv * intensity;
}

export interface Levels { exertion: number; o2fault: number }

export function levelsFor(log: EngineEvent[], crewId: string, t: number, cfg: ModifiersConfig): Levels {
  const mine = log.filter((e) => appliesTo(e, crewId));
  const norms = mine.filter((e) => e.type === 'normalize').map((e) => e.t).sort((a, b) => a - b);
  const out: Levels = { exertion: 0, o2fault: 0 };
  for (const e of mine) {
    if (e.type !== 'exertion' && e.type !== 'o2fault') continue;
    const cutoff = norms.find((n) => n > e.t);
    out[e.type] = Math.max(out[e.type], eventLevel(e, cfg[e.type], cutoff, cfg.recoverSec, t));
  }
  return out;
}

/** Warped time: real time plus the extra beats accumulated while HR is raised (speeds up the ECG). */
export function ecgWarp(log: EngineEvent[], crewId: string, t: number, cfg: ModifiersConfig, hrMean: number): number {
  const mine = log.filter((e) => appliesTo(e, crewId));
  const norms = mine.filter((e) => e.type === 'normalize').map((e) => e.t).sort((a, b) => a - b);
  let extra = 0;
  for (const e of mine) {
    if (e.type !== 'exertion' && e.type !== 'o2fault') continue;
    const shape = cfg[e.type];
    const cutoff = norms.find((n) => n > e.t);
    const end = Math.min(t, e.t + shape.riseSec + shape.holdSec + shape.decaySec + cfg.recoverSec);
    const hrAdd = e.type === 'exertion' ? cfg.exertion.hrAddFrac * hrMean : cfg.o2fault.hrAdd;
    for (let tau = e.t; tau < end; tau += 1) {
      extra += (hrAdd * eventLevel(e, shape, cutoff, cfg.recoverSec, tau)) / hrMean;
    }
  }
  return t + extra;
}
