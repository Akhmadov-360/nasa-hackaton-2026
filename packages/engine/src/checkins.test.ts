import { describe, expect, it } from 'vitest';
import { checkinsDue, checkinStreak, latestSlot, type CheckinSchedule } from './checkins';
import type { EngineEvent } from './schemas';

const H = 3600;
const DAY = 86400;
const schedule: CheckinSchedule = {
  overdueAfterHours: 3,
  routines: [
    { metric: 'glucose', atHours: [6, 14, 22] },
    { metric: 'sleep', atHours: [7] },
    { metric: 'hydration', atHours: [10, 14] },
  ],
};
const at = (day: number, hour: number) => day * DAY + hour * H;
const entry = (t: number, metric: string, value: number): EngineEvent => ({ t, type: 'measurement', crewId: 'A1', params: { metric, value, id: `${metric}${t}` } });

describe('routine check-ins', () => {
  it('finds the latest passed slot, looking back over midnight', () => {
    expect(latestSlot([6, 14, 22], at(3, 12))).toBe(at(3, 6));
    expect(latestSlot([6, 14, 22], at(3, 15))).toBe(at(3, 14));
    expect(latestSlot([6, 14, 22], at(3, 2))).toBe(at(2, 22));
    expect(latestSlot([7], at(0, 5))).toBeUndefined(); // nothing before the first slot of the first day
    expect(latestSlot([30, -1, Number.NaN], at(3, 5))).toBeUndefined();
  });

  it('lists what is due at noon: overdue first, only the latest missed slot of each routine', () => {
    const list = checkinsDue([], 'A1', at(3, 12), schedule);
    expect(list.map((c) => [c.metric, c.state])).toEqual([['glucose', 'overdue'], ['sleep', 'overdue'], ['hydration', 'due']]);
    expect(list[0].slotT).toBe(at(3, 6));
  });

  it('is satisfied by an entry at or after the slot, and an earlier entry does not count', () => {
    const t = at(3, 12);
    expect(checkinsDue([entry(at(3, 6) + 60, 'glucose', 95)], 'A1', t, schedule).map((c) => c.metric)).toEqual(['sleep', 'hydration']);
    expect(checkinsDue([entry(at(3, 5), 'glucose', 95)], 'A1', t, schedule).map((c) => c.metric)).toContain('glucose');
    expect(checkinsDue([entry(at(3, 8), 'sleep', 7), entry(at(3, 11), 'hydration', 0.5)], 'A1', t, schedule).map((c) => c.metric)).toEqual(['glucose']);
  });

  it('follows removals, belongs to one crew member, and becomes due again at the next slot', () => {
    const t = at(3, 12);
    const e = entry(at(3, 7), 'glucose', 95);
    const removed: EngineEvent = { t: at(3, 8), type: 'measurement', crewId: 'A1', params: { metric: 'glucose', retract: `glucose${at(3, 7)}` } };
    expect(checkinsDue([e], 'A1', t, schedule).map((c) => c.metric)).not.toContain('glucose');
    expect(checkinsDue([e, removed], 'A1', t, schedule).map((c) => c.metric)).toContain('glucose');
    expect(checkinsDue([e], 'A2', t, schedule).map((c) => c.metric)).toContain('glucose');
    // the 14:00 slot has passed and nothing was entered since
    expect(checkinsDue([e], 'A1', at(3, 14) + 60, schedule).find((c) => c.metric === 'glucose')?.state).toBe('due');
    expect(checkinsDue([e], 'A1', at(3, 17) + 60, schedule).find((c) => c.metric === 'glucose')?.state).toBe('overdue');
  });

  it('is empty before any telemetry', () => {
    expect(checkinsDue([], 'A1', 0, schedule)).toEqual([]);
  });

  it('counts a streak of days with every check-in done, and progress of today', () => {
    const full = (d: number) => [
      entry(at(d, 6.5), 'glucose', 100), entry(at(d, 14.5), 'glucose', 100), entry(at(d, 22.5), 'glucose', 100),
      entry(at(d, 7.5), 'sleep', 7), entry(at(d, 10.5), 'hydration', 1), entry(at(d, 14.5), 'hydration', 1),
    ];
    expect(checkinStreak([], 'A1', 0, schedule)).toEqual({ days: 0, done: 0, total: 0 });
    // noon on day 3: slots passed are glucose 6, sleep 7, hydration 10
    const part = [entry(at(3, 6.5), 'glucose', 100), entry(at(3, 7.5), 'sleep', 7)];
    expect(checkinStreak(part, 'A1', at(3, 12), schedule)).toEqual({ days: 0, done: 2, total: 3 });
    const todayDone = [...part, entry(at(3, 10.5), 'hydration', 1)];
    expect(checkinStreak(todayDone, 'A1', at(3, 12), schedule).days).toBe(1);
    // two full days before keep the streak even while today is still open
    expect(checkinStreak([...full(1), ...full(2), ...part], 'A1', at(3, 12), schedule).days).toBe(2);
    expect(checkinStreak([...full(1), ...full(2), ...todayDone], 'A1', at(3, 12), schedule).days).toBe(3);
    // a gap on day 2 breaks it
    expect(checkinStreak([...full(1), ...todayDone], 'A1', at(3, 12), schedule).days).toBe(1);
    // removing an entry (retract) drops it again
    const retracted: EngineEvent = { t: at(3, 12), type: 'measurement', crewId: 'A1', params: { retract: `hydration${at(3, 10.5)}` } };
    expect(checkinStreak([...todayDone, retracted], 'A1', at(3, 12), schedule).days).toBe(0);
  });
});
