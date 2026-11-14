'use client';
import { createContext, useContext } from 'react';
import type { ManualEntry, ManualMetric } from '@astro/engine';

/**
 * What every panel of the self-check window needs, so the panels stay small and know nothing about the event log:
 * who is being entered, how long ago the value was measured, which entry is being corrected, and how to save or remove.
 */
export interface SelfCheckApi {
  crewId: string;
  /** seconds between "now" and the time the value was measured (the "When" choice) */
  agoSec: number;
  /** the entry being corrected, if any; a panel switches to Update and Cancel while it is set */
  editing: ManualEntry | null;
  startEdit: (e: ManualEntry) => void;
  stopEdit: () => void;
  /** returns an error message when the value is not acceptable, otherwise undefined */
  save: (metric: ManualMetric, value: number) => string | undefined;
  remove: (e: ManualEntry) => void;
}

const Ctx = createContext<SelfCheckApi | null>(null);
export const SelfCheckProvider = Ctx.Provider;

export function useSelfCheck(): SelfCheckApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSelfCheck must be used inside the self-check window');
  return v;
}
