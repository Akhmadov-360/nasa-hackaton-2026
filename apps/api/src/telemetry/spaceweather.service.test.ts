import { describe, expect, it } from 'vitest';
import { SpaceWeatherService } from './spaceweather.service';

const payload = [{ time_tag: '2026-11-10T17:20:00Z', satellite: 18, flux: 12, energy: '>=10 MeV' }];

describe('SpaceWeatherService', () => {
  it('caches for the ttl, then refetches, and keeps the last good copy when NOAA fails', async () => {
    let clock = 0;
    let calls = 0;
    let fail = false;
    const svc = new SpaceWeatherService({
      now: () => clock,
      ttlMs: 1000,
      fetchFn: async () => {
        calls++;
        if (fail) throw new Error('offline');
        return { ok: true, json: async () => payload };
      },
    });
    const a = await svc.get();
    await svc.get();
    expect(calls).toBe(1);
    expect(a.ok && a.data.scale).toBe(1);
    clock = 5000;
    fail = true;
    const b = await svc.get();
    expect(calls).toBe(2);
    expect(b.ok && b.stale).toBe(true);
  });

  it('reports ok:false when nothing was ever fetched', async () => {
    const svc = new SpaceWeatherService({ fetchFn: async () => { throw new Error('offline'); } });
    expect(await svc.get()).toEqual({ ok: false });
  });
});
