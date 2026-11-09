import type { EngineEvent } from '@astro/engine';
import { emitter, type Batch, type TelemetrySource } from './types';

/** REST fallback for networks that block WebSocket: GET /telemetry/latest every 500 ms. */
export class PollSource implements TelemetrySource {
  private batches = emitter<Batch>();
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly base: () => string, private readonly intervalMs = 500) {}

  onBatch(cb: (b: Batch) => void) {
    return this.batches.on(cb);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  send(ev: EngineEvent): boolean {
    void fetch(`${this.base()}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ev),
    }).catch(() => {});
    return true;
  }

  private async poll(): Promise<void> {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 2000);
    try {
      const r = await fetch(`${this.base()}/telemetry/latest`, { signal: ctl.signal });
      if (!r.ok) return;
      const d = (await r.json()) as { t: number; frames: unknown[] };
      this.batches.emit({ t: d.t, frames: d.frames, alerts: [] });
    } catch {
      /* network down: the manager notices the silence */
    } finally {
      clearTimeout(to);
    }
  }
}
