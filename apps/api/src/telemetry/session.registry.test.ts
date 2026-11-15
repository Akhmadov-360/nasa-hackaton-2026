import { describe, expect, it } from 'vitest';
import { DEFAULT_SESSION, SessionRegistry } from './session.registry';
import { TelemetryService } from './telemetry.service';

const make = (clock: { t: number }, max = 200) =>
  new SessionRegistry(() => new TelemetryService({ metOffsetSec: 1000, now: () => clock.t }), () => clock.t, 1000, max);

describe('SessionRegistry', () => {
  it('gives every visitor a separate simulation', () => {
    const clock = { t: 0 };
    const r = make(clock);
    const a = r.get('visitor-aaaa');
    const b = r.get('visitor-bbbb');
    expect(a).not.toBe(b);
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.command({ type: 'o2fault', crewId: 'A2', t: 1000 }).ok).toBe(true);
    expect(a.snapshot().log).toHaveLength(1);
    expect(b.snapshot().log).toHaveLength(0);
    // the same visitor gets the same simulation back
    expect(r.get('visitor-aaaa')).toBe(a);
    // an O2 fault in one session does not lower the other's SpO2
    const spo2 = (s: TelemetryService) => s.tick(1100).frames.find((f) => f.crewId === 'A2')!.vitals.spo2;
    expect(spo2(a)).toBeLessThan(90);
    expect(spo2(b)).toBeGreaterThan(94);
    // a reset only clears its own session
    a.reset();
    b.command({ type: 'flare', crewId: 'ALL', t: 1000 });
    a.reset();
    expect(b.snapshot().log).toHaveLength(1);
  });

  it('starts the mission clock of each visitor when they arrive', () => {
    const clock = { t: 0 };
    const r = make(clock);
    r.get('visitor-aaaa');
    clock.t = 60_000;
    const late = r.get('visitor-bbbb');
    expect(late.nowT()).toBe(1000);
    expect(r.get('visitor-aaaa').nowT()).toBe(1060);
  });

  it('accepts a missing id as the shared default and rejects a malformed one', () => {
    expect(SessionRegistry.normalise(undefined)).toBe(DEFAULT_SESSION);
    expect(SessionRegistry.normalise('')).toBe(DEFAULT_SESSION);
    expect(SessionRegistry.normalise('visitor-1234')).toBe('visitor-1234');
    for (const bad of ['short', 'has space!!!', 'x'.repeat(41), '../../etc', 42, {}]) expect(SessionRegistry.normalise(bad)).toBeUndefined();
  });

  it('drops idle sessions but keeps the default one, and replaces the stalest when full', () => {
    const clock = { t: 0 };
    const r = make(clock, 3);
    r.get(DEFAULT_SESSION);
    r.get('visitor-aaaa');
    clock.t = 500;
    r.get('visitor-bbbb');
    clock.t = 1200;
    expect(r.sweep()).toBe(1); // aaaa idle for 1200 ms, bbbb for 700
    expect(r.has('visitor-aaaa')).toBe(false);
    expect(r.has(DEFAULT_SESSION)).toBe(true);
    r.get('visitor-cccc');
    clock.t = 1300;
    r.get('visitor-dddd'); // full (default, bbbb, cccc): the least recently used one goes
    expect(r.has('visitor-bbbb')).toBe(false);
    expect(r.size).toBe(3);
  });
});
