import { describe, expect, it } from 'vitest';
import { TelemetryService } from './telemetry.service';

const svc = () => new TelemetryService({ metOffsetSec: 1000, now: () => 0 });

describe('TelemetryService', () => {
  it('ticks one frame per crew member', () => {
    const frames = svc().tick(1000).frames;
    expect(frames.map((f) => f.crewId)).toEqual(['A1', 'A2', 'A3', 'A4']);
  });

  it('o2fault hits only the targeted crew member', () => {
    const s = svc();
    expect(s.command({ type: 'o2fault', crewId: 'A2', t: 1000 }).ok).toBe(true);
    const frames = s.tick(1040).frames;
    const spo2 = (id: string) => frames.find((f) => f.crewId === id)!.vitals.spo2;
    expect(spo2('A2')).toBeLessThan(90);
    expect(spo2('A1')).toBeGreaterThan(94);
  });

  it('rejects invalid commands without touching the log', () => {
    const s = svc();
    for (const bad of [null, {}, { type: 'explode', crewId: 'A1' }, { type: 'flare', crewId: 'Z9' }, { type: 'flare', crewId: 'ALL', params: { class: 'Q' } }]) {
      expect(s.command(bad).ok).toBe(false);
    }
    expect(s.snapshot().log).toHaveLength(0);
  });

  it('emits an alert when a metric gets worse', () => {
    const s = svc();
    s.tick(1000);
    s.command({ type: 'o2fault', crewId: 'A2', t: 1001 });
    const all = [] as string[];
    for (let t = 1001; t < 1060; t += 1) all.push(...s.tick(t).alerts.map((a) => a.crewId + a.metric));
    expect(all.some((x) => x.startsWith('A2'))).toBe(true);
  });

  it('rejects non-numeric or out-of-range params and unknown keys are dropped', () => {
    const s = svc();
    expect(s.command({ type: 'exertion', crewId: 'ALL', params: { intensity: 'x' } }).ok).toBe(false);
    expect(s.command({ type: 'exertion', crewId: 'ALL', params: { intensity: 99 } }).ok).toBe(false);
    expect(s.command({ type: 'exertion', crewId: 'A1', t: 1000, params: { intensity: 1.5, evil: 1 } }).ok).toBe(true);
    expect(s.snapshot().log[0].params).toEqual({ intensity: 1.5 });
  });

  it('caps the event log and can reset it', () => {
    const s = svc();
    for (let i = 0; i < 300; i++) expect(s.command({ type: 'normalize', crewId: 'ALL', t: 1000 + i }).ok).toBe(true);
    expect(s.command({ type: 'normalize', crewId: 'ALL', t: 2000 }).ok).toBe(false);
    s.reset();
    expect(s.snapshot().log).toHaveLength(0);
    expect(s.command({ type: 'normalize', crewId: 'ALL', t: 2000 }).ok).toBe(true);
  });

  it('peek() does not consume alert transitions that WebSocket clients are waiting for', () => {
    const s = svc();
    s.tick(1000);
    s.command({ type: 'o2fault', crewId: 'A2', t: 1001 });
    s.peek(1040);
    expect(s.tick(1040).alerts.length).toBeGreaterThan(0);
  });
});
