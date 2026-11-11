'use client';
import { useMemo } from 'react';
import { buildReport, type MissionReport } from '@astro/engine';
import { baseCfg } from '@/lib/engineConfig';
import { useMissionStore } from '@/lib/store/missionStore';

/**
 * The report for the chosen period: computed from this run, or taken from an imported package.
 * `periodSec` is how far back to look; null means the whole session. The period never reaches before the session start,
 * because mission time before that has no recorded events to report on.
 */
export function useReport(periodSec: number | null, enabled = true): { report: MissionReport | null; imported: boolean } {
  const imported = useMissionStore((s) => s.imported);
  const t = useMissionStore((s) => s.t);
  const startT = useMissionStore((s) => s.startT);
  const events = useMissionStore((s) => s.events);
  const slot = Math.floor(t / 5); // rebuild at most every 5 s while the drawer is open

  const report = useMemo(() => {
    if (!enabled) return null;
    if (imported) return imported.pkg.report;
    if (t <= 0) return null;
    const toT = Math.floor(t);
    const fromT = Math.max(startT || toT - 10, periodSec ? toT - periodSec : 0, 0);
    return buildReport({ ...baseCfg, log: events }, { fromT: Math.min(fromT, toT - 5), toT, generatedAtT: toT, sessionFromT: startT || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, imported, slot, startT, events, periodSec]);

  return { report, imported: !!imported };
}
