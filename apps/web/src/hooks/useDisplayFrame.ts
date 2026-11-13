'use client';
import { useMemo } from 'react';
import { frameAt, type EngineConfig, type TelemetryFrame } from '@astro/engine';
import { TIME_TRAVEL_SPAN_SEC } from '@/lib/constants';
import { baseCfg } from '@/lib/engineConfig';
import { useMissionStore } from '@/lib/store/missionStore';

export function historyConfig(events: EngineConfig['log']): EngineConfig {
  return { ...baseCfg, log: events };
}

/** Several widgets ask for the same replayed frame on every playback tick: compute it once. */
const replayCache = new Map<string, { events: unknown; frame: TelemetryFrame }>();

function replayFrame(events: EngineConfig['log'], crewId: string, tt: number): TelemetryFrame {
  const key = `${crewId}:${tt.toFixed(1)}`;
  const hit = replayCache.get(key);
  if (hit && hit.events === events) return hit.frame;
  const maxT = useMissionStore.getState().t;
  const frame = frameAt(historyConfig(events), crewId, tt, { minT: Math.max(0, maxT - TIME_TRAVEL_SPAN_SEC), maxT });
  if (replayCache.size > 64) replayCache.clear();
  replayCache.set(key, { events, frame });
  return frame;
}

/** The frame to show for a crew member: live, or reconstructed at the replay moment. */
export function useDisplayFrame(crewId: string): { frame: TelemetryFrame | undefined; replay: boolean } {
  const tt = useMissionStore((s) => s.timeTravelT);
  const live = useMissionStore((s) => s.latest[crewId]);
  const events = useMissionStore((s) => s.events);
  const replay = tt !== null;
  const frame = useMemo(() => (tt === null ? live : replayFrame(events, crewId, tt)), [tt, tt === null ? live : null, events, crewId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { frame, replay };
}
