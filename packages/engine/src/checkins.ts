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

export interface CheckinStreak {
  /** consecutive mission days with every check-in done (today counts only once all its passed slots are done) */
  days: number;
  /** check-in slots of today that have passed, and how many of them have an entry */
  done: number;
  total: number;
}

/** Slot start times of one mission day, per routine, with the end of each slot (the next slot of the same routine). */
function daySlots(schedule: CheckinSchedule, day: number): { metric: ManualMetric; from: number; to: number }[] {
  const out: { metric: ManualMetric; from: number; to: number }[] = [];
  for (const r of schedule.routines) {
    if (!isManualMetric(r.metric)) continue;
    const hours = r.atHours.filter((h) => Number.isFinite(h) && h >= 0 && h < 24).sort((a, b) => a - b);
    hours.forEach((h, i) => {
      const next = i + 1 < hours.length ? hours[i + 1] * HOUR : DAY + hours[0] * HOUR;
      out.push({ metric: r.metric, from: day * DAY + h * HOUR, to: day * DAY + next });
    });
  }
  return out;
}

/**
 * A light "streak" for the routine: how many mission days in a row had every check-in done, and today's progress.
 * A slot counts when an entry was made inside it (from its time to the next slot of the same routine). Derived from the
 * event log like the rest, so a correction or a removed entry changes it at once. It is a reminder aid, never an alarm.
 */
export function checkinStreak(events: Pick<EngineEvent, 't' | 'type' | 'crewId' | 'params'>[], crewId: string, t: number, schedule: CheckinSchedule): CheckinStreak {
  if (!(t > 0)) return { days: 0, done: 0, total: 0 };
  const entries = manualEntries(events, { crewId, toT: t });
  const ok = (s: { metric: ManualMetric; from: number; to: number }) => entries.some((e) => e.metric === s.metric && e.t >= s.from && e.t < s.to);
  const today = Math.floor(t / DAY);
  const passed = daySlots(schedule, today).filter((s) => s.from <= t);
  const done = passed.filter(ok).length;
  const todayComplete = passed.length > 0 && done === passed.length;
  let days = todayComplete ? 1 : 0;
  for (let d = today - 1; d >= 0 && days < 365; d--) {
    const slots = daySlots(schedule, d);
    if (slots.length === 0 || !slots.every(ok)) break;
    days++;
  }
  return { days, done, total: passed.length };
}
