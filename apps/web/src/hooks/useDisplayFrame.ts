'use client';
import { useMemo } from 'react';
import { frameAt, type EngineConfig, type TelemetryFrame } from '@astro/engine';
import { TIME_TRAVEL_SPAN_SEC } from '@/lib/constants';
import { baseCfg } from '@/lib/engineConfig';
import { useMissionStore } from '@/lib/store/missionStore';

export function historyConfig(events: EngineConfig['log']): EngineConfig {
  return { ...baseCfg, log: events };
}

/** The frame to show for a crew member: live, or reconstructed at the Time Travel moment. */
export function useDisplayFrame(crewId: string): { frame: TelemetryFrame | undefined; replay: boolean } {
  const tt = useMissionStore((s) => s.timeTravelT);
  const live = useMissionStore((s) => s.latest[crewId]);
  const events = useMissionStore((s) => s.events);
  const replay = tt !== null;
  const frame = useMemo(() => {
    if (tt === null) return live;
    const maxT = useMissionStore.getState().t;
    return frameAt(historyConfig(events), crewId, tt, { minT: Math.max(0, maxT - TIME_TRAVEL_SPAN_SEC), maxT });
  }, [tt, tt === null ? live : null, events, crewId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { frame, replay };
}
