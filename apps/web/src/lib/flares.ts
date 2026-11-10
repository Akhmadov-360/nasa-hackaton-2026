'use client';
import { useQuery } from '@tanstack/react-query';
import { apiBase } from './constants';

export interface Flare {
  id: string;
  classType: string;
  peakTime: string;
}

/** Real NASA DONKI flares when the API has them; empty when the data was never downloaded. */
export function useFlares(): Flare[] {
  const { data } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const r = await fetch(`${apiBase()}/scenarios`);
      if (!r.ok) throw new Error('scenarios');
      return (await r.json()) as { flares: Flare[] };
    },
    staleTime: 5 * 60_000,
    retry: 5,
    retryDelay: 4000,
  });
  return data?.flares ?? [];
}
