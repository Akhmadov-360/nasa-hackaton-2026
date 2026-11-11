import { parseProtonFlux, type SpaceWeather } from '@astro/engine';

export const GOES_PROTONS_URL = 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json';

export type SpaceWeatherResult =
  | { ok: true; stale: boolean; fetchedAt: number; data: SpaceWeather }
  | { ok: false };

export interface SpaceWeatherOptions {
  fetchFn?: (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
  now?: () => number;
  /** how long a good answer is reused, ms */
  ttlMs?: number;
}

/** Fetches real GOES proton flux from NOAA, caches it, and serves the last good copy if NOAA is unreachable. */
export class SpaceWeatherService {
  private last: { at: number; data: SpaceWeather } | null = null;
  private inflight: Promise<void> | null = null;
  private readonly fetchFn: NonNullable<SpaceWeatherOptions['fetchFn']>;
  private readonly now: () => number;
  private readonly ttl: number;

  constructor(opts: SpaceWeatherOptions = {}) {
    this.fetchFn = opts.fetchFn ?? ((url, init) => fetch(url, init));
    this.now = opts.now ?? Date.now;
    this.ttl = opts.ttlMs ?? 60_000;
  }

  private async refresh(): Promise<void> {
    try {
      const res = await this.fetchFn(GOES_PROTONS_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return;
      const data = parseProtonFlux(await res.json());
      if (data) this.last = { at: this.now(), data };
    } catch {
      /* offline or NOAA down: keep the last good copy */
    }
  }

  async get(): Promise<SpaceWeatherResult> {
    const fresh = this.last && this.now() - this.last.at < this.ttl;
    if (!fresh) {
      this.inflight ??= this.refresh().finally(() => { this.inflight = null; });
      await this.inflight;
    }
    if (!this.last) return { ok: false };
    return { ok: true, stale: this.now() - this.last.at >= this.ttl, fetchedAt: this.last.at, data: this.last.data };
  }
}
