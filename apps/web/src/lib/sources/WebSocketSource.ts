import type { EngineEvent } from '@astro/engine';
import { emitter, type Batch, type TelemetrySource } from './types';

/** WebSocket client for the Nest gateway. Reconnects forever with exponential backoff (1 s .. 8 s). */
export class WebSocketSource implements TelemetrySource {
  private ws?: WebSocket;
  private batches = emitter<Batch>();
  private hellos = emitter<{ t: number; log: EngineEvent[]; sessionId?: string }>();
  private retry = 1000;
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;

  constructor(private readonly url: () => string) {}

  onBatch(cb: (b: Batch) => void) {
    return this.batches.on(cb);
  }
  onHello(cb: (h: { t: number; log: EngineEvent[]; sessionId?: string }) => void) {
    return this.hellos.on(cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timer);
    this.ws?.close();
    this.ws = undefined;
  }

  send(ev: EngineEvent): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ event: 'command', data: ev }));
    return true;
  }

  private connect(): void {
    if (!this.running) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url());
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 1000;
    };
    ws.onmessage = (m) => {
      let d: { type?: string; t?: number; frames?: unknown[]; alerts?: Batch['alerts']; log?: EngineEvent[]; sessionId?: string };
      try {
        d = JSON.parse(String(m.data));
      } catch {
        return; // garbage on the wire: ignore
      }
      if (d.type === 'frames') this.batches.emit({ t: d.t ?? 0, frames: d.frames ?? [], alerts: d.alerts ?? [] });
      else if (d.type === 'hello') this.hellos.emit({ t: d.t ?? 0, log: d.log ?? [], sessionId: typeof d.sessionId === 'string' ? d.sessionId : undefined });
      else if (d.type === 'heartbeat') this.batches.emit({ t: d.t ?? 0, frames: [], alerts: [] });
    };
    ws.onclose = () => this.scheduleRetry();
    ws.onerror = () => ws.close();
  }

  private scheduleRetry(): void {
    if (!this.running) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), this.retry);
    this.retry = Math.min(this.retry * 2, 8000);
  }
}
