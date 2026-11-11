import { describe, expect, it } from 'vitest';
import { parseProtonFlux, sScaleOf } from './spaceweather';

const row = (time_tag: string, energy: string, flux: number, satellite = 18) => ({ time_tag, satellite, flux, energy });

describe('parseProtonFlux', () => {
  it('takes the newest >=10 MeV sample, skips bad fill values and maps the S-scale', () => {
    const sw = parseProtonFlux([
      row('2026-11-10T17:20:00Z', '>=10 MeV', 0.2),
      row('2026-11-10T17:25:00Z', '>=10 MeV', 150),
      row('2026-11-10T17:30:00Z', '>=10 MeV', -100000),
      row('2026-11-10T17:25:00Z', '>=100 MeV', 0.5),
      row('2026-11-10T17:25:00Z', '>=1 MeV', 9999),
    ]);
    expect(sw?.flux10).toBe(150);
    expect(sw?.flux100).toBe(0.5);
    expect(sw?.scale).toBe(2);
    expect(sw?.satellite).toBe(18);
    expect(sw?.series10.map((p) => p.f)).toEqual([0.2, 150]);
  });

  it('returns null for garbage and never throws', () => {
    expect(parseProtonFlux(null)).toBeNull();
    expect(parseProtonFlux({})).toBeNull();
    expect(parseProtonFlux([1, 'x', null, { flux: 'a' }])).toBeNull();
    expect(parseProtonFlux([row('2026-11-10T17:25:00Z', '>=1 MeV', 5)])).toBeNull();
  });

  it('S-scale steps by decade from 10 pfu', () => {
    expect([9.9, 10, 99, 100, 1000, 1e4, 1e5].map(sScaleOf)).toEqual([0, 1, 1, 2, 3, 4, 5]);
  });
});
