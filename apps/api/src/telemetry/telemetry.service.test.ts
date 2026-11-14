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
    const frames = s.tick(1100).frames;
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
    expect(s.command({ type: 'flare', crewId: 'ALL', params: { class: 'X', magnitude: 'big' } }).ok).toBe(false);
    expect(s.command({ type: 'flare', crewId: 'ALL', t: 1001, params: { class: 'X', magnitude: 8.7 } }).ok).toBe(true);
  });

  it('accepts a valid self-check measurement and rejects bad ones', () => {
    const s = svc();
    const send = (crewId: string, params: Record<string, unknown>) => s.command({ type: 'measurement', crewId, t: 1000, params });
    expect(send('A1', { metric: 'glucose', value: 52 }).ok).toBe(true);
    expect(s.snapshot().log[0].params).toEqual({ metric: 'glucose', value: 52 });
    expect(send('ALL', { metric: 'glucose', value: 52 }).ok).toBe(false);
    expect(send('Z9', { metric: 'glucose', value: 52 }).ok).toBe(false);
    expect(send('A1', { metric: 'weight', value: 70 }).ok).toBe(false);
    expect(send('A1', { metric: 'glucose', value: Number.NaN }).ok).toBe(false);
    expect(send('A1', { metric: 'glucose', value: '52' }).ok).toBe(false);
    expect(send('A1', { metric: 'glucose', value: 9000 }).ok).toBe(false);
    expect(send('A1', { metric: 'mood', value: 2.5 }).ok).toBe(false);
    expect(send('A1', { value: 5 }).ok).toBe(false);
    expect(s.snapshot().log).toHaveLength(1);
    expect(s.tick(1001).frames[0].status.byMetric.glucose).toBe('WARNING');
  });

  it('keeps an entry id and time, removes an entry by id, and rejects bad ids and times', () => {
    const s = svc();
    const send = (params: Record<string, unknown>) => s.command({ type: 'measurement', crewId: 'A1', t: 1000, params });
    expect(send({ metric: 'hydration', value: 0.5, id: 'w1', at: 1.78e12 }).ok).toBe(true);
    expect(s.snapshot().log[0].params).toEqual({ metric: 'hydration', value: 0.5, id: 'w1', at: 1.78e12 });
    expect(send({ metric: 'hydration', value: 0.5, id: '<script>' }).ok).toBe(false);
    expect(send({ metric: 'hydration', value: 0.5, id: 'x'.repeat(41) }).ok).toBe(false);
    expect(send({ metric: 'hydration', value: 0.5, at: 12 }).ok).toBe(false);
    expect(send({ metric: 'hydration', value: 0.5, at: 'now' }).ok).toBe(false);
    expect(s.tick(1001).frames[0].manual?.hydration?.value).toBeCloseTo(0.5);
    expect(send({ metric: 'hydration', retract: 'w1', value: 9 }).ok).toBe(true);
    expect(s.snapshot().log[1].params).toEqual({ metric: 'hydration', retract: 'w1' });
    expect(s.tick(1002).frames[0].manual?.hydration).toBeUndefined();
    expect(send({ metric: 'hydration', retract: { a: 1 } }).ok).toBe(false);
    expect(send({ metric: 'hydration', retract: 'bad id' }).ok).toBe(false);
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
