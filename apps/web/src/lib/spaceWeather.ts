'use client';
import { useQuery } from '@tanstack/react-query';
import type { SpaceWeather } from '@astro/engine';
import { apiBase } from './constants';

export type SpaceWeatherResponse = { ok: true; stale: boolean; fetchedAt: number; data: SpaceWeather } | { ok: false };

/** Real NOAA GOES proton flux through our API (cached there). `null` until it arrives or when it never does. */
export function useSpaceWeather(): { weather: Extract<SpaceWeatherResponse, { ok: true }> | null; failed: boolean } {
  const { data, isError } = useQuery({
    queryKey: ['spaceweather'],
    queryFn: async () => {
      const r = await fetch(`${apiBase()}/spaceweather`);
      if (!r.ok) throw new Error('spaceweather');
      return (await r.json()) as SpaceWeatherResponse;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
    retryDelay: 5000,
  });
  const weather = data && data.ok ? data : null;
  return { weather, failed: isError || (!!data && !data.ok) };
}
