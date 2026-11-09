import { describe, expect, it } from 'vitest';
import modifiers from '../../data/modifiers.json';
import radiation from '../../data/radiation-model.json';
import thresholds from '../../data/thresholds.json';
import { computeFrame, type EngineConfig } from './frame';
import type { EngineEvent, ScenarioPack, Thresholds, Track } from './schemas';

const track: Track = {
  ecgHz: 360, vitalsHz: 1,
  ecg: Array.from({ length: 360 * 10 }, (_, i) => Math.sin(i / 20)),
  hr: Array(10).fill(70), spo2: Array(10).fill(98), resp: Array(10).fill(15),
};
const pack: ScenarioPack = {
  meta: { id: 't', title: 't', sources: [], licenses: [] },
  crew: [{ id: 'A1', name: 'A', role: 'CDR' }, { id: 'A2', name: 'B', role: 'FE' }],
  baselines: { A1: track, A2: track }, events: [],
};
const cfg = (log: EngineEvent[]): EngineConfig => ({
  pack, thresholds: thresholds as Thresholds, modifiers, radiation, log,
});

describe('computeFrame', () => {
  it('is deterministic', () => {
    expect(computeFrame(cfg([]), 'A1', 42)).toEqual(computeFrame(cfg([]), 'A1', 42));
  });

  it('exertion raises HR and lowers HRV at peak, normalize brings it back', () => {
    const ev: EngineEvent = { t: 100, type: 'exertion', crewId: 'A1' };
    const base = computeFrame(cfg([]), 'A1', 130);
    const peak = computeFrame(cfg([ev]), 'A1', 130);
    expect(peak.vitals.hr).toBeGreaterThan(base.vitals.hr + 20);
    expect(peak.vitals.hrv).toBeLessThan(base.vitals.hrv);
    const norm: EngineEvent = { t: 140, type: 'normalize', crewId: 'A1' };
    const after = computeFrame(cfg([ev, norm]), 'A1', 200);
    expect(after.vitals.hr).toBeCloseTo(computeFrame(cfg([]), 'A1', 200).vitals.hr, 0);
  });

  it('o2fault lowers SpO2 only for the targeted crew member', () => {
    const log: EngineEvent[] = [{ t: 100, type: 'o2fault', crewId: 'A2' }];
    expect(computeFrame(cfg(log), 'A2', 140).vitals.spo2).toBeLessThan(90);
    expect(computeFrame(cfg(log), 'A1', 140).vitals.spo2).toBeGreaterThan(95);
  });

  it('flare raises dose rate and cumulative dose never decreases', () => {
    const log: EngineEvent[] = [{ t: 100, type: 'flare', crewId: 'ALL', params: { class: 'X' } }];
    expect(computeFrame(cfg(log), 'A1', 130).radiation.doseRateUSvH)
      .toBeGreaterThan(computeFrame(cfg([]), 'A1', 130).radiation.doseRateUSvH * 2);
    let prev = -1;
    for (let t = 0; t < 1200; t += 10) {
      const c = computeFrame(cfg(log), 'A1', t).radiation.cumulativeMSv;
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});
