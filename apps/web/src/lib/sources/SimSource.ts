import {
  appendEvent, computeFrame, diffAlerts,
  type Alert, type EngineEvent, type Status, type TelemetryFrame,
} from '@astro/engine';
import { baseCfg, crew } from '../engineConfig';
import { DEFAULT_MET_OFFSET_SEC } from '../constants';
import { emitter, type Batch, type StartOptions, type TelemetrySource } from './types';

/** Offline simulation: the same engine as the server, running in the browser at 10 Hz. */
export class SimSource implements TelemetrySource {
  private batches = emitter<Batch>();
  private timer?: ReturnType<typeof setInterval>;
  private log: EngineEvent[] = [];
  private startMs = 0;
  private fromT = DEFAULT_MET_OFFSET_SEC;
  private prevStatus: Record<string, Record<string, Status>> = {};
  private prevFrame: Record<string, TelemetryFrame> = {};

  onBatch(cb: (b: Batch) => void) {
    return this.batches.on(cb);
  }

  start(opts: StartOptions = {}): void {
    this.stop();
    this.log = [...(opts.log ?? [])];
    this.fromT = opts.fromT ?? DEFAULT_MET_OFFSET_SEC;
    this.startMs = Date.now();
    this.prevStatus = {};
    this.prevFrame = {};
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  send(ev: EngineEvent): boolean {
    this.log = appendEvent(this.log, ev);
    return true;
  }

  private tick(): void {
    const t = this.fromT + Math.floor(((Date.now() - this.startMs) / 1000) * 10) / 10 + 0.1;
    const cfg = { ...baseCfg, log: this.log };
    const frames: TelemetryFrame[] = [];
    const alerts: Alert[] = [];
    for (const c of crew) {
      const f = computeFrame(cfg, c.id, t, this.prevStatus[c.id]);
      alerts.push(...diffAlerts(this.prevFrame[c.id], f, baseCfg.thresholds));
      this.prevStatus[c.id] = f.status.byMetric;
      this.prevFrame[c.id] = f;
      frames.push(f);
    }
    this.batches.emit({ t, frames, alerts });
  }
}
