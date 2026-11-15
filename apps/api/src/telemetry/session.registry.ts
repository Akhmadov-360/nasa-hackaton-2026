import { TelemetryService } from './telemetry.service';

/** A visitor id from the browser: short, no spaces or markup. Without one, the shared `default` session is used. */
export const SESSION_ID = /^[A-Za-z0-9_-]{8,40}$/;
export const DEFAULT_SESSION = 'default';

/**
 * One simulation per visitor. Every browser tab gets its own event log, its own mission clock and its own alert
 * state, so what one visitor injects (a flare, an O2 fault, a self-check entry) is never seen by another.
 * Idle sessions are dropped after `ttlMs`; at `max` sessions the least recently used one is replaced.
 */
export class SessionRegistry {
  private readonly sessions = new Map<string, { svc: TelemetryService; seen: number }>();

  constructor(
    private readonly make: () => TelemetryService = () => new TelemetryService(),
    private readonly now: () => number = Date.now,
    private readonly ttlMs = 30 * 60_000,
    private readonly max = 200,
  ) {}

  /** The sid when it is valid or absent (-> `default`); undefined when it is malformed. */
  static normalise(sid: unknown): string | undefined {
    if (sid === undefined || sid === null || sid === '') return DEFAULT_SESSION;
    return typeof sid === 'string' && SESSION_ID.test(sid) ? sid : undefined;
  }

  /** The service of a session, created on first use; reading it counts as activity. */
  get(sid: string): TelemetryService {
    const hit = this.sessions.get(sid);
    if (hit) {
      hit.seen = this.now();
      return hit.svc;
    }
    if (this.sessions.size >= this.max) this.evictOldest();
    const svc = this.make();
    this.sessions.set(sid, { svc, seen: this.now() });
    return svc;
  }

  has(sid: string): boolean {
    return this.sessions.has(sid);
  }

  get size(): number {
    return this.sessions.size;
  }

  /** Drops sessions that have been idle longer than the time to live (the default session stays). */
  sweep(): number {
    const limit = this.now() - this.ttlMs;
    let n = 0;
    for (const [sid, s] of this.sessions) {
      if (sid !== DEFAULT_SESSION && s.seen < limit) {
        this.sessions.delete(sid);
        n++;
      }
    }
    return n;
  }

  private evictOldest(): void {
    let oldest: string | undefined;
    let t = Infinity;
    for (const [sid, s] of this.sessions) {
      if (sid !== DEFAULT_SESSION && s.seen < t) {
        t = s.seen;
        oldest = sid;
      }
    }
    if (oldest) this.sessions.delete(oldest);
  }
}
