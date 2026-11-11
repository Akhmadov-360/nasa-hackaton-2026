/**
 * Real space weather from NOAA SWPC (GOES integral proton flux, 5-minute data).
 * Pure parsing only: fetching and caching live in the API. This is a measurement at Earth orbit,
 * not the crew's dose (flux -> dose is a model we do not run here).
 */
export interface SpaceWeather {
  source: 'NOAA SWPC GOES';
  satellite: number | null;
  /** ISO time of the newest sample */
  updatedAt: string;
  /** protons >= 10 MeV, particles / (cm2 s sr) = pfu */
  flux10: number;
  /** protons >= 100 MeV, pfu; null when the file has none */
  flux100: number | null;
  /** NOAA solar radiation storm scale from the >= 10 MeV flux: 0 (none) to 5 */
  scale: 0 | 1 | 2 | 3 | 4 | 5;
  /** newest 288 samples (about 24 h) of >= 10 MeV flux, oldest first */
  series10: Array<{ t: number; f: number }>;
}

/** NOAA S-scale: S1 at 10 pfu (>= 10 MeV), then one step per decade. */
export function sScaleOf(flux10: number): SpaceWeather['scale'] {
  if (flux10 >= 1e5) return 5;
  if (flux10 >= 1e4) return 4;
  if (flux10 >= 1e3) return 3;
  if (flux10 >= 1e2) return 2;
  if (flux10 >= 10) return 1;
  return 0;
}

const MAX_POINTS = 288;

/** Returns null when the payload has no usable >= 10 MeV samples. Never throws. */
export function parseProtonFlux(raw: unknown): SpaceWeather | null {
  if (!Array.isArray(raw)) return null;
  const by10: Array<{ t: number; f: number; sat: number | null }> = [];
  const by100: Array<{ t: number; f: number }> = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const t = typeof r.time_tag === 'string' ? Date.parse(r.time_tag) : NaN;
    const f = typeof r.flux === 'number' ? r.flux : NaN;
    // SWPC marks bad samples with negative fill values
    if (!Number.isFinite(t) || !Number.isFinite(f) || f < 0) continue;
    const sat = typeof r.satellite === 'number' ? r.satellite : null;
    if (r.energy === '>=10 MeV') by10.push({ t, f, sat });
    else if (r.energy === '>=100 MeV') by100.push({ t, f });
  }
  if (by10.length === 0) return null;
  by10.sort((a, b) => a.t - b.t);
  by100.sort((a, b) => a.t - b.t);
  const last = by10[by10.length - 1];
  return {
    source: 'NOAA SWPC GOES',
    satellite: last.sat,
    updatedAt: new Date(last.t).toISOString(),
    flux10: last.f,
    flux100: by100.length ? by100[by100.length - 1].f : null,
    scale: sScaleOf(last.f),
    series10: by10.slice(-MAX_POINTS).map(({ t, f }) => ({ t, f })),
  };
}
