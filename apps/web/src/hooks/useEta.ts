'use client';
import { useMemo } from 'react';
import type { Eta } from '@astro/engine';
import { crew } from '@/lib/engineConfig';
import { forecastsFor, type Forecast } from '@/lib/forecast';

/**
 * "When will this reading reach the next limit?" for one card, from the last ~50 s of frames.
 * Nothing for a flat, slow or noisy trend, or while replaying history (see `timeToThreshold`).
 */
export function useEta(crewId: string, metric: string, tick: number, enabled: boolean): Eta | null {
  return useMemo(
    () => (enabled ? (forecastsFor(crewId, tick).find((f) => f.metric === metric) ?? null) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crewId, metric, enabled, Math.floor(tick)],
  );
}

/** All forecasts across the whole crew, nearest first: this is what the status island summarises. */
export function useCrewForecasts(tick: number): Forecast[] {
  return useMemo(
    () => crew.flatMap((c) => forecastsFor(c.id, tick)).sort((a, b) => a.etaSec - b.etaSec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(tick)],
  );
}
