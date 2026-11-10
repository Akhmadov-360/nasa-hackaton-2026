import { describe, expect, it } from 'vitest';
import { buildReport } from './report';
import { cfgForTests } from './testkit';
import type { EngineEvent } from './schemas';

const fault: EngineEvent[] = [{ t: 1000, type: 'o2fault', crewId: 'A2' }];

describe('buildReport', () => {
  it('finds no incidents when nothing happened', () => {
    const r = buildReport(cfgForTests([]), { fromT: 900, toT: 1300 });
    expect(r.crew.flatMap((c) => c.incidents)).toEqual([]);
    expect(r.crew.map((c) => c.crewId)).toEqual(['A1', 'A2']);
  });

  it('turns an O2 fault into one incident with its metrics, cause and protocol, for that crew member only', () => {
    const r = buildReport(cfgForTests(fault), { fromT: 900, toT: 1300 });
    const a2 = r.crew.find((c) => c.crewId === 'A2')!;
    expect(a2.incidents).toHaveLength(1);
    const inc = a2.incidents[0];
    expect(inc.worst).toBe('CRITICAL');
    expect(inc.metrics).toContain('spo2');
    expect(inc.protocol).toBe('hypoxia');
    expect(inc.causes.map((e) => e.type)).toEqual(['o2fault']);
    expect(inc.endT).toBeGreaterThan(inc.startT);
    expect(a2.stats.spo2.min).toBeLessThan(90);
    expect(r.crew.find((c) => c.crewId === 'A1')!.incidents).toHaveLength(0);
  });

  it('reports radiation as the difference between the end and the start of the period', () => {
    const r = buildReport(cfgForTests([{ t: 1000, type: 'flare', crewId: 'ALL', params: { class: 'X' } }]), { fromT: 900, toT: 1300 });
    const a1 = r.crew[0];
    expect(a1.radiation.deltaMSv).toBeGreaterThan(0);
    expect(a1.radiation.peakRateUSvH).toBeGreaterThan(100);
    expect(r.events).toHaveLength(1);
  });
});
