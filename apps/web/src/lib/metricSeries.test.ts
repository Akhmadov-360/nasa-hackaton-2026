import { describe, expect, it } from 'vitest';
import { baseCfg } from './engineConfig';
import { chartDomain, limitBands, sampleSeries } from './metricSeries';

const cfg = (log: never[] = []) => ({ ...baseCfg, log });

describe('metric series for the trend chart', () => {
  it('samples n + 1 evenly spaced points, deterministically, for several metrics at once', () => {
    const a = sampleSeries(cfg(), 'A1', ['hr', 'bpSys'], 302400, 302700, 60);
    const b = sampleSeries(cfg(), 'A1', ['hr', 'bpSys'], 302400, 302700, 60);
    expect(a).toEqual(b);
    expect(a.map((s) => s.metric)).toEqual(['hr', 'bpSys']);
    expect(a[0].points).toHaveLength(61);
    expect(a[0].points[0].t).toBe(302400);
    expect(a[0].points[60].t).toBe(302700);
  });

  it('sees an event the cards would see: an O2 fault lowers SpO2 in the series', () => {
    const log = [{ t: 302500, type: 'o2fault', crewId: 'A1' }] as never[];
    const calm = sampleSeries(cfg(), 'A1', ['spo2'], 302400, 302700, 40)[0].points;
    const fault = sampleSeries(cfg(log), 'A1', ['spo2'], 302400, 302700, 40)[0].points;
    expect(Math.min(...fault.map((p) => p.v))).toBeLessThan(Math.min(...calm.map((p) => p.v)) - 3);
  });

  it('skips a metric with no value (a self-check entry that does not exist yet)', () => {
    expect(sampleSeries(cfg(), 'A1', ['glucose'], 302400, 302500, 10)[0].points).toEqual([]);
  });

  it('turns thresholds into bands on both sides and nothing for a metric without limits', () => {
    const bands = limitBands(baseCfg.thresholds.metrics.hr);
    expect(bands.filter((b) => b.side === 'high').map((b) => [b.level, b.value])).toEqual([['caution', 100], ['warning', 120], ['critical', 150]]);
    expect(bands.filter((b) => b.side === 'low')).toHaveLength(3);
    expect(limitBands(undefined)).toEqual([]);
  });

  it('keeps the normal zone in view and leaves out limits that are far away', () => {
    const bands = limitBands(baseCfg.thresholds.metrics.hr);
    const [lo, hi] = chartDomain([68, 70, 72], bands);
    expect(lo).toBeLessThan(50); // the low caution limit (50) is in view
    expect(hi).toBeGreaterThan(100); // the high caution limit (100) is in view
    expect(hi).toBeLessThan(120); // the warning limit (120) is far from the data and is left out
    const [, hiFault] = chartDomain([70, 118, 145], bands);
    expect(hiFault).toBeGreaterThan(150); // the data reaches the critical limit, which comes into view
    expect(chartDomain([], bands)).toEqual([0, 1]);
    const [fl, fh] = chartDomain([5, 5, 5], []);
    expect(fh).toBeGreaterThan(fl);
  });
});
