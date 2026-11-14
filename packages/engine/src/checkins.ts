import { isManualMetric, manualEntries, type ManualMetric } from './manual';
import type { EngineEvent } from './schemas';

/**
 * Routine check-ins: when each self-check value is due. Derived from the event log and the mission clock, never
 * stored, so it follows corrections and works offline like everything else.
 */
export interface CheckinRoutine {
  metric: ManualMetric;
  /** hours of the mission day (0 to 24) at which the value is due */
  atHours: number[];
}
export interface CheckinSchedule {
  routines: CheckinRoutine[];
  /** a due check-in becomes overdue when its slot is older than this */
  overdueAfterHours: number;
}
export interface Checkin {
  metric: ManualMetric;
  /** mission time of the slot that has no entry yet */
  slotT: number;
  state: 'due' | 'overdue';
}

const DAY = 86400;
const HOUR = 3600;

/** The latest slot at or before `t`, looking back one day. Undefined when the routine has no valid hour. */
export function latestSlot(atHours: number[], t: number): number | undefined {
  const day = Math.floor(t / DAY);
  let best: number | undefined;
  for (const d of [day, day - 1]) {
    if (d < 0) continue;
    for (const h of atHours) {
      if (!Number.isFinite(h) || h < 0 || h >= 24) continue;
      const s = d * DAY + h * HOUR;
      if (s <= t && (best === undefined || s > best)) best = s;
    }
  }
  return best;
}

/**
 * The check-ins of one crew member that are due at time `t`: for each routine, the latest passed slot must have an
 * entry made at or after it. Overdue ones come first, then the oldest slot.
 */
export function checkinsDue(events: Pick<EngineEvent, 't' | 'type' | 'crewId' | 'params'>[], crewId: string, t: number, schedule: CheckinSchedule): Checkin[] {
  if (!(t > 0)) return [];
  const entries = manualEntries(events, { crewId, toT: t });
  const out: Checkin[] = [];
  for (const r of schedule.routines) {
    if (!isManualMetric(r.metric)) continue;
    const slotT = latestSlot(r.atHours, t);
    if (slotT === undefined) continue;
    if (entries.some((e) => e.metric === r.metric && e.t >= slotT)) continue;
    out.push({ metric: r.metric, slotT, state: t - slotT > schedule.overdueAfterHours * HOUR ? 'overdue' : 'due' });
  }
  return out.sort((a, b) => (a.state === b.state ? a.slotT - b.slotT : a.state === 'overdue' ? -1 : 1));
}
