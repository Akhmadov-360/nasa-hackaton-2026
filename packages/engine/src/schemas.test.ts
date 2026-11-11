import { describe, expect, it } from 'vitest';
import { parseFrame, VITAL_DEFAULTS, type TelemetryFrame } from './schemas';

const good = (): TelemetryFrame => ({
  t: 10, crewId: 'A1', vitals: { ...VITAL_DEFAULTS, hr: 80 }, ecg: [0.1, 0.2],
  radiation: { doseRateUSvH: 20, cumulativeMSv: 1 }, cabin: { co2: 2, o2: 21, humidity: 45, noise: 36, airflow: 0.12 },
  status: { overall: 'NOMINAL', byMetric: {} }, degraded: false,
});

describe('parseFrame', () => {
  it('passes a valid frame untouched', () => {
    const f = parseFrame(good());
    expect(f.degraded).toBe(false);
    expect(f.vitals.hr).toBe(80);
  });

  it('replaces NaN / Infinity / null / "null" with the last valid value and flags degraded', () => {
    const last = good();
    for (const bad of [NaN, Infinity, null, 'null']) {
      const f = parseFrame({ ...good(), vitals: { ...good().vitals, hr: bad } }, { ...last, vitals: { ...last.vitals, hr: 77 } });
      expect(f.vitals.hr).toBe(77);
      expect(f.degraded).toBe(true);
    }
  });

  it('never throws on garbage input', () => {
    for (const bad of [undefined, null, 42, 'x', [], { vitals: 5 }]) {
      expect(() => parseFrame(bad)).not.toThrow();
      expect(parseFrame(bad).degraded).toBe(true);
    }
  });
});
