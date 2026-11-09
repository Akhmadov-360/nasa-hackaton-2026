import { ecgWarp, envelope, envelopeArea, levelsFor, type ModifiersConfig, type RadiationConfig } from './modifiers';
import { mulberry32, hashSeed } from './prng';
import { sampleEcg, sampleVitals, trackMeanHr } from './baseline';
import { applyStatus } from './status';
import type { EngineEvent, ScenarioPack, Status, TelemetryFrame, Thresholds } from './schemas';

export interface EngineConfig {
  pack: ScenarioPack;
  thresholds: Thresholds;
  modifiers: ModifiersConfig;
  radiation: RadiationConfig;
  log: EngineEvent[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function radiationAt(cfg: EngineConfig, crewId: string, t: number) {
  const { backgroundUSvH: bg, demoCompression: c, classes } = cfg.radiation;
  let rate = bg;
  let areaUSv = (bg * t) / 3600;
  const flares = [...cfg.pack.events, ...cfg.log].filter(
    (e) => e.type === 'flare' && (e.crewId === 'ALL' || e.crewId === crewId),
  );
  for (const e of flares) {
    const cls = classes[String(e.params?.class ?? 'X')] ?? classes.X;
    const [r, h, d] = [cls.riseSec / c, cls.holdSec / c, cls.decaySec / c];
    const extra = bg * (cls.peakMultiplier - 1);
    rate += extra * envelope(t, e.t, r, h, d);
    areaUSv += (extra * envelopeArea(t, e.t, r, h, d) * c) / 3600;
  }
  return { doseRateUSvH: rate, cumulativeMSv: areaUSv / 1000 };
}

/** Pure and deterministic: same (config, crew, t, prevStatus) always gives the same frame. */
export function computeFrame(
  cfg: EngineConfig, crewId: string, t: number, prevStatus?: Record<string, Status>,
): TelemetryFrame {
  const track = cfg.pack.baselines[crewId];
  const events: EngineEvent[] = [...cfg.pack.events, ...cfg.log];
  const m = cfg.modifiers;
  const lv = levelsFor(events, crewId, t, m);
  const rnd = mulberry32(hashSeed(crewId, t));
  const noise = () => rnd() - 0.5;

  const base = sampleVitals(track, t);
  const hrMean = trackMeanHr(track);
  const hr = base.hr + m.exertion.hrAddFrac * hrMean * lv.exertion + m.o2fault.hrAdd * lv.o2fault;
  const hrvBase = Math.max(5, 120 - base.hr);

  const tw = ecgWarp(events, crewId, t, m, hrMean);
  const twNext = ecgWarp(events, crewId, t + 0.1, m, hrMean);
  const speed = Math.max(0.5, (twNext - tw) / 0.1);

  const frame: TelemetryFrame = {
    t,
    crewId,
    vitals: {
      hr,
      hrv: Math.max(2, hrvBase * (1 - m.exertion.hrvDropFrac * lv.exertion) + noise() * 2),
      spo2: clamp(base.spo2 - m.o2fault.spo2Drop * lv.o2fault + noise() * 0.4, 50, 100),
      bpSys: 118 + noise() * 3 + m.exertion.bpSysAdd * lv.exertion,
      bpDia: 76 + noise() * 2 + 0.4 * m.exertion.bpSysAdd * lv.exertion,
      respRate: base.resp * (1 + m.exertion.respAddFrac * lv.exertion) + m.o2fault.respAdd * lv.o2fault,
      temp: 36.7 + 0.05 * Math.sin(t / 60) + m.exertion.tempAdd * lv.exertion,
      stress: clamp(20 + noise() * 4 + m.exertion.stressAdd * lv.exertion + m.o2fault.stressAdd * lv.o2fault, 0, 100),
      eeg: 10 + 0.8 * Math.sin(t / 3) + noise() * 0.4 - m.o2fault.eegDrop * lv.o2fault,
    },
    ecg: sampleEcg(track, tw, speed),
    radiation: radiationAt(cfg, crewId, t),
    cabin: { co2: 3 + noise() * 0.2, o2: 21 - m.o2fault.cabinO2Drop * lv.o2fault + noise() * 0.05 },
    status: { overall: 'NOMINAL', byMetric: {} },
    degraded: false,
  };
  return applyStatus(frame, cfg.thresholds, prevStatus);
}
