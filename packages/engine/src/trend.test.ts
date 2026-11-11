import { describe, expect, it } from 'vitest';
import { timeToThreshold } from './trend';
import type { MetricThreshold } from './schemas';

const spo2: MetricThreshold = { unit: '%', low: { caution: 95, warning: 92, critical: 88 }, hysteresis: 1 };
const series = (f: (t: number) => number) => Array.from({ length: 60 }, (_, t) => ({ t, v: f(t) }));

describe('timeToThreshold', () => {
  it('estimates when a falling value will reach the critical threshold', () => {
    const eta = timeToThreshold(series((t) => 96 - t / 15), spo2, 'critical')!;
    expect(eta.etaSec).toBeGreaterThan(55);
    expect(eta.etaSec).toBeLessThan(70);
    expect(eta.slopePerMin).toBeCloseTo(-4, 1);
  });
  it('ignores slow drift and arrivals more than three minutes away (no false early warnings)', () => {
    // 1 point per minute: moved only one hysteresis width across the window, would arrive in about 7 minutes
    expect(timeToThreshold(series((t) => 96 - t / 60), spo2, 'critical')).toBeNull();
    // clear trend (2.4 points in a minute), but the limit is about 3.6 minutes away
    expect(timeToThreshold(series((t) => 99 - t / 25), spo2, 'critical')).toBeNull();
    // a slow sine, the shape of cabin drift, looks linear over one minute
    expect(timeToThreshold(series((t) => 0.12 - 0.02 * Math.sin((2 * Math.PI * t) / 600)),
      { unit: 'm/s', low: { caution: 0.07, warning: 0.05, critical: 0.03 }, hysteresis: 0.01 }, 'warning')).toBeNull();
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
