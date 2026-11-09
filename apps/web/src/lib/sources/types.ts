import type { Alert, EngineEvent } from '@astro/engine';

export type SourceMode = 'LIVE' | 'POLL' | 'STALE' | 'SIM';

/** Raw batch from any source. Frames are `unknown` on purpose: the manager validates them. */
export interface Batch {
  t: number;
  frames: unknown[];
  alerts: Alert[];
}

export interface StartOptions {
  fromT?: number;
  log?: EngineEvent[];
}

export interface TelemetrySource {
  start(opts?: StartOptions): void;
  stop(): void;
  onBatch(cb: (b: Batch) => void): () => void;
  /** Optional: authoritative event log sent when a server connection opens. */
  onHello?(cb: (h: { t: number; log: EngineEvent[] }) => void): () => void;
  /** Returns false if the command could not be delivered. */
  send(ev: EngineEvent): boolean;
}

export function emitter<T>() {
  const subs = new Set<(x: T) => void>();
  return {
    on(cb: (x: T) => void) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    emit(x: T) {
      for (const s of subs) {
        try {
          s(x);
        } catch (e) {
          console.error('[source] listener failed', e);
        }
      }
    },
  };
}
