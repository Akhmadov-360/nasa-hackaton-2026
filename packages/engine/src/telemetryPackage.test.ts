import { describe, expect, it } from 'vitest';
import { buildReport } from './report';
import { buildPackage, parsePackage } from './telemetryPackage';
import { cfgForTests } from './testkit';

const report = buildReport(cfgForTests([{ t: 1000, type: 'o2fault', crewId: 'A2' }]), { fromT: 900, toT: 1300 });

describe('telemetry package', () => {
  it('round-trips through JSON', () => {
    const pkg = buildPackage(report, { sessionId: 's1', exportedAtT: 1300 });
    const back = parsePackage(JSON.parse(JSON.stringify(pkg)));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.pkg.report.crew[1].incidents).toHaveLength(1);
  });

  it('rejects files that are not packages, in plain words, without throwing', () => {
    for (const bad of [null, 42, 'x', {}, { schema: 'something-else' }, { schema: 'astro-telemetry-package/1', report: { crew: 'no' } }]) {
      const r = parsePackage(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(5);
    }
  });

  it('rejects an absurdly large event list', () => {
    const pkg = buildPackage(report, { sessionId: 's1', exportedAtT: 1300 });
    const huge = { ...pkg, report: { ...pkg.report, events: Array.from({ length: 5000 }, () => pkg.report.events[0] ?? { t: 1, type: 'normalize', crewId: 'ALL' }) } };
    expect(parsePackage(huge).ok).toBe(false);
  });
});
