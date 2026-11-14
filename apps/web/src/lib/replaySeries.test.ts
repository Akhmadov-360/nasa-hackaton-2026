import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@astro/engine';
import { replayFrames } from './replaySeries';

describe('sparkline frames while replaying', () => {
  const log: EngineEvent[] = [];

  it('returns the window up to the cursor on a 0.2 s grid, oldest first', () => {
    const f = replayFrames(log, 'A1', 302400.13, 6);
    expect(f).toHaveLength(31);
    expect(f[f.length - 1].t).toBeCloseTo(302400.0, 5);
    expect(f[0].t).toBeCloseTo(302394.0, 5);
    for (let i = 1; i < f.length; i++) expect(f[i].t).toBeGreaterThan(f[i - 1].t);
  });

  it('reuses frames when the cursor slides and recomputes after the event log changes', () => {
    const a = replayFrames(log, 'A1', 302400, 6);
    const b = replayFrames(log, 'A1', 302400.4, 6);
    expect(b[b.length - 3]).toBe(a[a.length - 1]); // the grid point at 302400.0 is the same object
    const changed = replayFrames([{ t: 302300, type: 'o2fault', crewId: 'A1' }], 'A1', 302400, 6);
    expect(changed[changed.length - 1]).not.toBe(a[a.length - 1]);
    expect(changed[changed.length - 1].vitals.spo2).toBeLessThan(a[a.length - 1].vitals.spo2);
  });

  it('never goes before the start of the mission clock', () => {
    const f = replayFrames(log, 'A1', 1, 6);
    expect(f[0].t).toBeGreaterThanOrEqual(0);
    expect(f.length).toBeLessThan(31);
  });

  it('is deterministic per crew member', () => {
    expect(replayFrames(log, 'A2', 302400, 3).map((x) => x.vitals.hr)).toEqual(replayFrames([...log], 'A2', 302400, 3).map((x) => x.vitals.hr));
  });
});
