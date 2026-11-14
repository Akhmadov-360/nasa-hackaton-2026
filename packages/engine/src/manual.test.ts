import { describe, expect, it } from 'vitest';
import { computeFrame } from './frame';
import { frameAt } from './log';
import { buildReport, MissionReportSchema } from './report';
import { manualAt, validManualValue } from './manual';
import { cfgForTests } from './testkit';
import type { EngineEvent } from './schemas';

const m = (t: number, metric: string, value: number, crewId = 'A1'): EngineEvent => ({ t, type: 'measurement', crewId, params: { metric, value } });
const H = 3600;

describe('self-check measurements', () => {
  it('validates ranges and whole numbers', () => {
    expect(validManualValue('glucose', 52)).toBe(true);
    expect(validManualValue('glucose', 19)).toBe(false);
    expect(validManualValue('glucose', Number.NaN)).toBe(false);
    expect(validManualValue('mood', 3)).toBe(true);
    expect(validManualValue('mood', 3.5)).toBe(false);
    expect(validManualValue('sleep', 24.5)).toBe(false);
    expect(validManualValue('hydration', '1' as unknown as number)).toBe(false);
  });

  it('shows no value before the entry (replay at an earlier time) and the value after it', () => {
    const cfg = cfgForTests([m(1000, 'glucose', 52)]);
    expect(computeFrame(cfg, 'A1', 999).manual).toBeUndefined();
    expect(computeFrame(cfg, 'A1', 1001).manual?.glucose?.value).toBe(52);
    expect(computeFrame(cfg, 'A2', 1001).manual).toBeUndefined();
  });

  it('judges glucose against its limits on both sides', () => {
    const at = (v: number) => computeFrame(cfgForTests([m(1000, 'glucose', v)]), 'A1', 1001).status.byMetric.glucose;
    expect(at(95)).toBe('NOMINAL');
    expect(at(69)).toBe('CAUTION');
    expect(at(52)).toBe('WARNING');
    expect(at(39)).toBe('CRITICAL');
    expect(at(190)).toBe('CAUTION');
    expect(at(260)).toBe('WARNING');
    expect(at(360)).toBe('CRITICAL');
  });

  it('judges sleep and mood, and never alarms on water drunk', () => {
    const cfg = cfgForTests([m(1000, 'sleep', 5), m(1000, 'mood', 2), m(1000, 'hydration', 0.3)]);
    const f = computeFrame(cfg, 'A1', 1001);
    expect(f.status.byMetric.sleep).toBe('WARNING');
    expect(f.status.byMetric.mood).toBe('WARNING');
    expect(f.status.byMetric.hydration).toBeUndefined();
    expect(f.manual?.hydration?.value).toBeCloseTo(0.3);
  });

  it('adds water drunk over 24 h, takes the latest of the others, and lets a reading go stale', () => {
    const events = [m(1000, 'hydration', 0.5), m(1000 + H, 'hydration', 0.75), m(1000, 'glucose', 52), m(1000 + 2 * H, 'glucose', 90)];
    const s = manualAt(events, 'A1', 1000 + 3 * H);
    expect(s.hydration?.value).toBeCloseTo(1.25);
    expect(s.glucose?.value).toBe(90);
    const later = manualAt(events, 'A1', 1000 + 26 * H);
    expect(later.hydration).toBeUndefined(); // the 24 h window has passed
    expect(later.glucose).toBeUndefined(); // glucose is current for 8 h, then due
    expect(computeFrame(cfgForTests(events), 'A1', 1000 + 26 * H).status.byMetric.glucose).toBeUndefined();
  });

  it('is not cleared by normalize', () => {
    const cfg = cfgForTests([m(1000, 'glucose', 52), { t: 1010, type: 'normalize', crewId: 'A1' }]);
    expect(computeFrame(cfg, 'A1', 1020).status.byMetric.glucose).toBe('WARNING');
  });

  it('works through Time Travel and ignores invalid entries', () => {
    const cfg = cfgForTests([m(1000, 'glucose', 52), m(1005, 'glucose', 9999), { t: 1006, type: 'measurement', crewId: 'A1', params: { metric: 'bogus', value: 1 } }]);
    expect(frameAt(cfg, 'A1', 1010).manual?.glucose?.value).toBe(52);
    expect(frameAt(cfg, 'A1', 990).manual).toBeUndefined();
  });

  it('reports a low glucose as an incident with the measurement as its cause, and the package schema accepts it', () => {
    const cfg = cfgForTests([m(1000, 'glucose', 35)]);
    const report = buildReport(cfg, { fromT: 900, toT: 1300 });
    const inc = report.crew.find((c) => c.crewId === 'A1')!.incidents[0];
    expect(inc.primaryMetric).toBe('glucose');
    expect(inc.worst).toBe('CRITICAL');
    expect(inc.causes[0].type).toBe('measurement');
    expect(report.limits?.some((l) => l.metric === 'glucose' && l.tier === 'clinical')).toBe(true);
    expect(MissionReportSchema.safeParse(JSON.parse(JSON.stringify(report))).success).toBe(true);
  });
});
