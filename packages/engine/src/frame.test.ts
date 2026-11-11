import { describe, expect, it } from 'vitest';
import modifiers from '../../data/modifiers.json';
import radiation from '../../data/radiation-model.json';
import thresholds from '../../data/thresholds.json';
import { computeFrame, type EngineConfig } from './frame';
import type { ModifiersConfig, RadiationConfig } from './modifiers';
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
  pack, thresholds: thresholds as Thresholds, modifiers: modifiers as unknown as ModifiersConfig, radiation: radiation as unknown as RadiationConfig, log,
});

describe('computeFrame', () => {
  it('is deterministic', () => {
    expect(computeFrame(cfg([]), 'A1', 42)).toEqual(computeFrame(cfg([]), 'A1', 42));
  });

  it('cabin baseline stays clearly under the NASA CO2 limit and the environment metrics stay NOMINAL', () => {
    for (let t = 0; t < 300; t += 7) {
      const f = computeFrame(cfg([]), 'A1', 3 * 86400 + t);
      expect(f.cabin.co2).toBeLessThan(2.5);
      for (const k of ['co2', 'o2', 'humidity', 'noise', 'doseRate', 'dose']) expect(f.status.byMetric[k]).toBe('NOMINAL');
    }
  });

  it('humidity warning limits are the NASA 25 to 75 % RH and exertion raises noise', () => {
    const h = (thresholds as Thresholds).metrics.humidity;
    expect([h.low?.warning, h.high?.warning]).toEqual([25, 75]);
    const n = (thresholds as Thresholds).metrics.noise;
    expect([n.high?.caution, n.high?.warning]).toEqual([40, 50]);
    const ev: EngineEvent = { t: 100, type: 'exertion', crewId: 'A1' };
    expect(computeFrame(cfg([ev]), 'A1', 130).cabin.noise).toBeGreaterThan(computeFrame(cfg([]), 'A1', 130).cabin.noise + 3);
  });

  it('every threshold names its tier, and the CO2 caution level is the NASA 3 mmHg', () => {
    const ms = (thresholds as Thresholds).metrics;
    for (const [k, m] of Object.entries(ms)) expect(m.tier, k).toBeTruthy();
    expect(ms.co2.tier).toBe('nasa');
    expect(ms.co2.high?.caution).toBe(3);
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
    expect(computeFrame(cfg(log), 'A2', 250).vitals.spo2).toBeLessThan(90);
    expect(computeFrame(cfg(log), 'A1', 250).vitals.spo2).toBeGreaterThan(95);
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

  it('O2 fault: SpO2 decays exponentially towards the floor, HR first compensates upward and then falls', () => {
    const log: EngineEvent[] = [{ t: 100, type: 'o2fault', crewId: 'A1' }];
    const at = (x: number) => computeFrame(cfg(log), 'A1', 100 + x);
    const base = computeFrame(cfg([]), 'A1', 160).vitals.hr;
    expect(at(150).vitals.spo2).toBeLessThan(88);
    expect(at(150).vitals.spo2).toBeGreaterThan(83);
    expect(at(60).vitals.hr).toBeGreaterThan(base + 20); // compensatory tachycardia
    expect(at(320).vitals.hr).toBeLessThan(at(60).vitals.hr - 30); // decompensation
    expect(at(30).vitals.spo2).toBeGreaterThan(at(150).vitals.spo2); // monotone fall
  });

  it('flare dose rate follows the class table and scales with the real magnitude', () => {
    const flare = (mag: number): EngineEvent[] => [{ t: 100, type: 'flare', crewId: 'ALL', params: { class: 'X', magnitude: mag } }];
    const rate = (mag: number) => computeFrame(cfg(flare(mag)), 'A1', 125).radiation.doseRateUSvH;
    expect(rate(1)).toBeGreaterThan(1500);
    expect(rate(9)).toBeGreaterThan(rate(1) * 1.5);
    expect(rate(9)).toBeLessThanOrEqual(5100);
    const cRate = computeFrame(cfg([{ t: 100, type: 'flare', crewId: 'ALL', params: { class: 'C', magnitude: 5 } }]), 'A1', 125).radiation.doseRateUSvH;
    expect(cRate).toBeLessThan(60);
    expect(cRate).toBeGreaterThan(30);
  });
});
