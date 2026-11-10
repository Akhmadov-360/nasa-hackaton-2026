import { describe, expect, it } from 'vitest';
import { timeToThreshold } from './trend';
import type { MetricThreshold } from './schemas';

const spo2: MetricThreshold = { unit: '%', low: { caution: 95, warning: 92, critical: 88 }, hysteresis: 1 };
const series = (f: (t: number) => number) => Array.from({ length: 60 }, (_, t) => ({ t, v: f(t) }));

describe('timeToThreshold', () => {
  it('estimates when a falling value will reach the critical threshold', () => {
    const eta = timeToThreshold(series((t) => 96 - t / 60), spo2, 'critical')!;
    expect(eta.etaSec).toBeGreaterThan(400);
    expect(eta.etaSec).toBeLessThan(450);
    expect(eta.slopePerMin).toBeCloseTo(-1, 1);
  });
  it('says nothing for a flat series, a recovering one, or a noisy one', () => {
    expect(timeToThreshold(series(() => 97), spo2, 'critical')).toBeNull();
    expect(timeToThreshold(series((t) => 90 + t / 30), spo2, 'critical')).toBeNull();
    expect(timeToThreshold(series((t) => 96 + (t % 2 ? 1.5 : -1.5)), spo2, 'critical')).toBeNull();
  });
  it('returns null when the threshold is already crossed or there is too little data', () => {
    expect(timeToThreshold(series((t) => 87 - t / 60), spo2, 'critical')).toBeNull();
    expect(timeToThreshold([{ t: 0, v: 96 }, { t: 1, v: 95 }], spo2, 'critical')).toBeNull();
  });
});
