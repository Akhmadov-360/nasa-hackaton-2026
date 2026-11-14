'use client';
import { useMemo } from 'react';
import { checkinsDue, type Checkin, type CheckinSchedule } from '@astro/engine';
import schedule from '@astro/data/checkins.json';
import { useMissionStore } from '@/lib/store/missionStore';

/**
 * The routine check-ins due for the selected crew member now (live time, not the replay): derived from the event
 * log, recomputed every 30 seconds of mission time and whenever an entry is added, edited or removed.
 */
export function useCheckins(): Checkin[] {
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const events = useMissionStore((s) => s.events);
  const t = useMissionStore((s) => s.t);
  const bucket = Math.floor(t / 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => checkinsDue(events, crewId, bucket * 30 + 29.9, schedule as unknown as CheckinSchedule), [events, crewId, bucket]);
}
