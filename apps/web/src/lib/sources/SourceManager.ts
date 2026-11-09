import { appendEvent, parseFrame, type Alert, type EngineEvent, type TelemetryFrame } from '@astro/engine';
import { LIVE_TIMEOUT_MS, STALE_MS } from '../constants';
import { emitter, type Batch, type SourceMode, type TelemetrySource } from './types';

export type ManagerEvent =
  | { type: 'frames'; t: number; frames: TelemetryFrame[]; alerts: Alert[]; degraded: Record<string, boolean>; mode: SourceMode }
  | { type: 'mode'; mode: SourceMode; everLive: boolean }
  | { type: 'hello'; t: number; log: EngineEvent[] };

export interface ManagerOptions {
  live: TelemetrySource;
  sim: TelemetrySource;
  poll?: TelemetrySource;
  now?: () => number;
  liveTimeoutMs?: number;
  staleMs?: number;
}

/**
 * LIVE (WebSocket) -> POLL (REST, optional) -> STALE (frozen, <=5 s) -> SIM (engine in the browser).
 * The server is the source of truth: when the live stream returns, its clock and log win.
 */
export class SourceManager {
  mode: SourceMode = 'STALE';
  everLive = false;
  private readonly bus = emitter<ManagerEvent>();
  private readonly now: () => number;
  private readonly liveTimeout: number;
  private readonly staleMs: number;
  private lastLiveAt = 0;
  private lastPollAt = 0;
  private staleSince: number;
  private lastT: Record<string, number> = {};
  private lastFrame: Record<string, TelemetryFrame> = {};
  private maxT = 0;
  private queue: EngineEvent[] = [];
  private eventLog: EngineEvent[] = [];
  private unsubs: Array<() => void> = [];

  constructor(private readonly o: ManagerOptions) {
    this.now = o.now ?? Date.now;
    this.liveTimeout = o.liveTimeoutMs ?? LIVE_TIMEOUT_MS;
    this.staleMs = o.staleMs ?? STALE_MS;
    this.staleSince = this.now();
  }

  subscribe(cb: (e: ManagerEvent) => void): () => void {
    return this.bus.on(cb);
  }

  start(): void {
    const { live, sim, poll } = this.o;
    this.staleSince = this.now();
    this.unsubs.push(live.onBatch((b) => this.onLive(b)));
    this.unsubs.push(poll?.onBatch((b) => this.onPoll(b)) ?? (() => {}));
    this.unsubs.push(sim.onBatch((b) => this.mode === 'SIM' && this.process(b)));
    this.unsubs.push(live.onHello?.((h) => this.onHello(h)) ?? (() => {}));
    live.start();
  }

  stop(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.o.live.stop();
    this.o.poll?.stop();
    this.o.sim.stop();
  }

  /** Called every ~500 ms by the runtime (and directly by tests). */
  tick(): void {
    const now = this.now();
    if (this.mode === 'LIVE' && now - this.lastLiveAt > this.liveTimeout) {
      if (this.o.poll) {
        this.lastPollAt = now;
        this.setMode('POLL');
        this.o.poll.start();
      } else {
        this.staleSince = this.lastLiveAt + this.liveTimeout;
        this.setMode('STALE');
      }
    } else if (this.mode === 'POLL' && now - this.lastPollAt > this.liveTimeout) {
      this.o.poll?.stop();
      this.staleSince = this.lastPollAt + this.liveTimeout;
      this.setMode('STALE');
    }
    if (this.mode === 'STALE' && now - this.staleSince >= this.staleMs) {
      this.setMode('SIM');
      this.lastT = {};
      this.o.sim.start({ fromT: this.maxT || undefined, log: this.eventLog });
    }
  }

  command(ev: EngineEvent): void {
    this.eventLog = appendEvent(this.eventLog, ev);
    if (this.mode === 'SIM' || this.mode === 'STALE') this.o.sim.send(ev);
    const delivered = this.mode === 'LIVE' || this.mode === 'POLL' ? this.o.live.send(ev) : false;
    if (!delivered) this.queue.push(ev);
  }

  private onHello(h: { t: number; log: EngineEvent[] }): void {
    const pending = this.queue;
    this.eventLog = pending.reduce(appendEvent, [...h.log]);
    this.bus.emit({ type: 'hello', t: h.t, log: h.log });
  }

  private onLive(b: Batch): void {
    this.lastLiveAt = this.now();
    if (this.mode !== 'LIVE') {
      this.o.poll?.stop();
      this.o.sim.stop();
      this.lastT = {};
      this.everLive = true;
      this.setMode('LIVE');
      const pending = this.queue;
      this.queue = [];
      for (const ev of pending) if (!this.o.live.send(ev)) this.queue.push(ev);
    }
    this.process(b);
  }

  private onPoll(b: Batch): void {
    if (this.mode !== 'POLL') return;
    this.lastPollAt = this.now();
    this.process(b);
  }

  private setMode(mode: SourceMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.bus.emit({ type: 'mode', mode, everLive: this.everLive });
  }

  private process(b: Batch): void {
    const frames: TelemetryFrame[] = [];
    const degraded: Record<string, boolean> = {};
    for (const raw of b.frames ?? []) {
      const id = (raw as { crewId?: unknown } | null)?.crewId;
      if (typeof id !== 'string') continue;
      const f = parseFrame(raw, this.lastFrame[id]);
      if (f.t <= (this.lastT[id] ?? -Infinity)) continue; // duplicate or out of order
      this.lastT[id] = f.t;
      this.lastFrame[id] = f;
      this.maxT = Math.max(this.maxT, f.t);
      degraded[id] = f.degraded;
      frames.push(f);
    }
    if (!frames.length) return;
    this.bus.emit({ type: 'frames', t: b.t, frames, alerts: b.alerts ?? [], degraded, mode: this.mode });
  }
}
