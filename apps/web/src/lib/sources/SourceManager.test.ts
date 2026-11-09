import { describe, expect, it } from 'vitest';
import { VITAL_DEFAULTS, type EngineEvent, type TelemetryFrame } from '@astro/engine';
import { SourceManager, type ManagerEvent } from './SourceManager';
import { emitter, type Batch, type StartOptions, type TelemetrySource } from './types';

class FakeSource implements TelemetrySource {
  private b = emitter<Batch>();
  private h = emitter<{ t: number; log: EngineEvent[] }>();
  started = 0;
  sent: EngineEvent[] = [];
  lastStart?: StartOptions;
  connected = true;
  start(o?: StartOptions) { this.started++; this.lastStart = o; }
  stop() { this.started = 0; }
  onBatch(cb: (b: Batch) => void) { return this.b.on(cb); }
  onHello(cb: (h: { t: number; log: EngineEvent[] }) => void) { return this.h.on(cb); }
  send(ev: EngineEvent) { if (!this.connected) return false; this.sent.push(ev); return true; }
  push(t: number, crews = ['A1', 'A2'], patch: Record<string, unknown> = {}) {
    this.b.emit({ t, alerts: [], frames: crews.map((c) => frame(c, t, patch[c])) });
  }
}

const frame = (crewId: string, t: number, patch?: unknown): TelemetryFrame & Record<string, unknown> => ({
  t, crewId, vitals: { ...VITAL_DEFAULTS, ...(patch as object | undefined) }, ecg: [0],
  radiation: { doseRateUSvH: 20, cumulativeMSv: 1 }, cabin: { co2: 3, o2: 21 },
  status: { overall: 'NOMINAL', byMetric: {} }, degraded: false,
});

function setup() {
  let now = 0;
  const live = new FakeSource();
  const sim = new FakeSource();
  const m = new SourceManager({ live, sim, now: () => now });
  const events: ManagerEvent[] = [];
  m.subscribe((e) => events.push(e));
  m.start();
  return { m, live, sim, events, at: (ms: number) => { now = ms; m.tick(); } };
}

describe('SourceManager', () => {
  it('falls LIVE -> STALE -> SIM when the stream stops, and returns to LIVE when it resumes', () => {
    const { m, live, sim, at } = setup();
    live.push(100); expect(m.mode).toBe('LIVE');
    at(2900); expect(m.mode).toBe('LIVE');
    at(3100); expect(m.mode).toBe('STALE');
    at(8200); expect(m.mode).toBe('SIM');
    expect(sim.started).toBe(1);
    expect(sim.lastStart?.fromT).toBe(100);
    live.push(500); expect(m.mode).toBe('LIVE');
    expect(sim.started).toBe(0);
  });

  it('ignores duplicate and out-of-order frames', () => {
    const { live, events } = setup();
    live.push(10); live.push(10); live.push(9); live.push(11);
    const ts = events.flatMap((e) => (e.type === 'frames' ? [e.t] : []));
    expect(ts).toEqual([10, 11]);
  });

  it('queues commands issued while offline and flushes them after reconnect', () => {
    const { m, live, sim, at } = setup();
    live.push(100);
    at(9000); // -> SIM
    live.connected = false;
    m.command({ t: 120, type: 'o2fault', crewId: 'A1' });
    expect(sim.sent).toHaveLength(1);
    expect(live.sent).toHaveLength(0);
    live.connected = true;
    live.push(130);
    expect(live.sent.map((e) => e.type)).toEqual(['o2fault']);
  });

  it('marks only the crew member with bad data as degraded', () => {
    const { live, events } = setup();
    live.push(1, ['A1', 'A2'], { A2: { hr: 'null' } });
    const f = events.find((e) => e.type === 'frames');
    expect(f && f.type === 'frames' && f.degraded).toEqual({ A1: false, A2: true });
  });
});
