import { describe, expect, it } from 'vitest';
import { appendEvent, frameAt } from './log';
import { cfgForTests } from './testkit';
import type { EngineEvent } from './schemas';

describe('log / time travel', () => {
  it('appendEvent keeps order and does not mutate the input', () => {
    const a: EngineEvent[] = [{ t: 5, type: 'flare', crewId: 'ALL' }];
    const b = appendEvent(a, { t: 2, type: 'normalize', crewId: 'ALL' });
    expect(b.map((e) => e.t)).toEqual([2, 5]);
    expect(a).toHaveLength(1);
  });

  it('frameAt clamps t into [minT, maxT]', () => {
    const cfg = cfgForTests([]);
    const range = { minT: 100, maxT: 500 };
    expect(frameAt(cfg, 'A1', -50, range).t).toBe(100);
    expect(frameAt(cfg, 'A1', 9999, range).t).toBe(500);
    expect(frameAt(cfg, 'A1', 300, range)).toEqual(frameAt(cfg, 'A1', 300, range));
  });
});
